import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { d1Store } from './store';
import { memoryStore } from './memory-store';
import { DAY } from './plan';

/**
 * D1 จำลองแบบบันทึก SQL + bind — ไม่รัน SQL จริง แต่ให้ตั้งคำตอบของ `first` ได้
 * เพียงพอสำหรับตรวจว่าเงื่อนไข WHERE/ON CONFLICT ที่สำคัญอยู่ครบ
 */
function fakeD1(firstResults: unknown[] = [], changes = 1) {
  const calls: { sql: string; args: unknown[] }[] = [];
  let i = 0;
  const stmt = (sql: string) => {
    const s = {
      sql,
      args: [] as unknown[],
      bind(...args: unknown[]) {
        s.args = args;
        return s;
      },
      async first() {
        calls.push({ sql, args: s.args });
        return firstResults[i++] ?? null;
      },
      async all() {
        calls.push({ sql, args: s.args });
        return { results: (firstResults[i++] as unknown[]) ?? [] };
      },
      async run() {
        calls.push({ sql, args: s.args });
        return { meta: { changes } };
      },
    };
    return s;
  };
  const db = {
    calls,
    prepare: stmt,
    batch: vi.fn(async (stmts: ReturnType<typeof stmt>[]) => {
      for (const s of stmts) calls.push({ sql: s.sql, args: s.args });
      return stmts.map(() => ({ meta: { changes } }));
    }),
  };
  return db as unknown as D1Database & typeof db;
}

const userRow = { id: 'u1', google_sub: 'g1', email: 'a@b.c', display_name: 'A', avatar_url: null };

describe('d1Store', () => {
  it('upsert ผูกกับ google_sub และอ่านกลับเป็น User', async () => {
    const db = fakeD1([userRow]);
    const user = await d1Store(db).upsertUserFromGoogle(
      { googleSub: 'g1', email: 'a@b.c', displayName: 'A', avatarUrl: null },
      100,
      () => 'new-id',
    );
    expect(user).toEqual({ id: 'u1', googleSub: 'g1', email: 'a@b.c', displayName: 'A', avatarUrl: null });
    expect(db.calls[0].sql).toContain('ON CONFLICT (google_sub)');
    expect(db.calls[0].args).toEqual(['new-id', 'g1', 'a@b.c', 'A', null, 100]);
  });

  it('latestPendingPayment กรอง status และ QR ที่ยังไม่หมดอายุ', async () => {
    const db = fakeD1([null]);
    expect(await d1Store(db).latestPendingPayment('u1', 500)).toBeNull();
    expect(db.calls[0].sql).toMatch(/status = 'pending' AND qr_expires_at > \?2/);
    expect(db.calls[0].args).toEqual(['u1', 500]);
  });

  it('listPayments เรียงใหม่ไปเก่าและจำกัดจำนวน ใช้ index user+created', async () => {
    const db = fakeD1([]);
    await d1Store(db).listPayments('u1', 10);
    expect(db.calls[0].sql).toContain('WHERE user_id = ?1 ORDER BY created_at DESC LIMIT ?2');
    expect(db.calls[0].args).toEqual(['u1', 10]);
  });

  it('settlePayment ใช้ batch เดียว: บวกวันและ mark paid ด้วยเงื่อนไข SETTLEABLE ชุดเดียวกัน', async () => {
    const paymentRow = {
      id: 'p1',
      user_id: 'u1',
      amount_satang: 1900,
      days: 30,
      status: 'pending',
      beam_charge_id: null,
      qr_expires_at: 0,
      qr_image: null,
      qr_raw: null,
      created_at: 0,
      paid_at: null,
    };
    // first() ตัวที่สองคือการอ่านวันหมดอายุกลับหลัง batch — ค่าที่ SQL คำนวณให้
    const db = fakeD1([paymentRow, { expires_at: 1000 + 35 * DAY }]);
    const result = await d1Store(db).settlePayment('p1', {
      beamChargeId: 'ch',
      rawWebhookJson: '{}',
      now: 1000,
    });
    expect(result).toEqual({ applied: true, expiresAt: 1000 + 35 * DAY });
    expect(db.batch).toHaveBeenCalledTimes(1);
    // ห้ามอ่านวันหมดอายุเดิมมาคำนวณนอก batch (lost update เมื่อสองรายการ settle พร้อมกัน)
    const batchAt = db.calls.findIndex((c) => c.sql.includes('INSERT INTO subscriptions'));
    expect(db.calls.slice(0, batchAt).some((c) => c.sql.includes('FROM subscriptions'))).toBe(false);
    const [sub, pay] = db.calls.slice(batchAt, batchAt + 2);
    expect(sub.sql).toContain(
      "WHERE EXISTS (SELECT 1 FROM payments WHERE id = ?4 AND status IN ('pending', 'expired'))",
    );
    expect(sub.sql).toContain('ON CONFLICT (user_id)');
    expect(sub.sql).toContain('MAX(subscriptions.expires_at, ?2) + ?3');
    expect(sub.args).toEqual(['u1', 1000, 30 * DAY, 'p1']);
    expect(pay.sql).toContain("WHERE id = ?1 AND status IN ('pending', 'expired')");
    expect(pay.args).toEqual(['p1', 'ch', 1000, '{}']);
  });

  it('settlePayment ที่ UPDATE ไม่เปลี่ยนแถว = จ่ายไปแล้ว → applied false และวันหมดอายุเดิม', async () => {
    const paid = {
      id: 'p1',
      user_id: 'u1',
      status: 'paid',
      amount_satang: 1900,
      days: 30,
      qr_expires_at: 0,
      created_at: 0,
    };
    const db = fakeD1([paid, { expires_at: 999 }], 0);
    expect(await d1Store(db).settlePayment('p1', { beamChargeId: 'ch', rawWebhookJson: '{}', now: 1000 })).toEqual({
      applied: false,
      expiresAt: 999,
    });
  });
});

/** เงินที่โอนแล้วต้องได้สิทธิ์เสมอ แม้ webhook จะมาถึงหลังเราปิดรายการเพราะ QR หมดอายุ */
describe('จ่ายหลัง QR หมดอายุ', () => {
  it('memoryStore: settle รายการที่ expired แล้วยังบวกวันให้ และซ้ำอีกครั้งไม่บวกเพิ่ม', async () => {
    const store = memoryStore();
    await store.upsertUserFromGoogle({ googleSub: 'g', email: 'e', displayName: 'n', avatarUrl: null }, 0, () => 'u1');
    await store.createPayment({
      id: 'p1',
      userId: 'u1',
      amountSatang: 1900,
      days: 30,
      beamChargeId: null,
      qrExpiresAt: 500,
      qrImage: null,
      qrRaw: null,
      createdAt: 0,
    });
    await store.expirePayment('p1');
    expect(await store.getPayment('p1')).toMatchObject({ status: 'expired' });
    const settled = await store.settlePayment('p1', { beamChargeId: 'ch', rawWebhookJson: '', now: 1000 });
    expect(settled).toEqual({ applied: true, expiresAt: 1000 + 30 * DAY });
    const again = await store.settlePayment('p1', { beamChargeId: 'ch', rawWebhookJson: '', now: 2000 });
    expect(again.applied).toBe(false);
    expect(await store.getExpiresAt('u1')).toBe(1000 + 30 * DAY);
  });
});

describe('memoryStore — semantics เดียวกับ D1', () => {
  it('settle ซ้ำบวกวันครั้งเดียว · pending ที่หมดอายุไม่ถูกหยิบมาใช้ซ้ำ', async () => {
    const store = memoryStore();
    const user = await store.upsertUserFromGoogle(
      { googleSub: 'g', email: 'e', displayName: 'n', avatarUrl: null },
      0,
      () => 'u1',
    );
    await store.createPayment({
      id: 'p1',
      userId: user.id,
      amountSatang: 1900,
      days: 30,
      beamChargeId: null,
      qrExpiresAt: 900,
      qrImage: null,
      qrRaw: null,
      createdAt: 0,
    });
    expect(await store.latestPendingPayment('u1', 899)).toMatchObject({ id: 'p1' });
    expect(await store.latestPendingPayment('u1', 900)).toBeNull();
    const first = await store.settlePayment('p1', { beamChargeId: 'ch', rawWebhookJson: '', now: 1000 });
    const again = await store.settlePayment('p1', { beamChargeId: 'ch', rawWebhookJson: '', now: 2000 });
    expect(first).toEqual({ applied: true, expiresAt: 1000 + 30 * DAY });
    expect(again).toEqual({ applied: false, expiresAt: 1000 + 30 * DAY });
    expect(await store.findPaymentByChargeId('ch')).toMatchObject({ status: 'paid' });
    // ล็อกอินซ้ำด้วย google_sub เดิม = user เดิม แม้ newId จะให้ค่าใหม่
    const same = await store.upsertUserFromGoogle(
      { googleSub: 'g', email: 'e2', displayName: 'n', avatarUrl: null },
      0,
      () => 'u2',
    );
    expect(same.id).toBe('u1');
    expect(same.email).toBe('e2');
  });
});

describe('จำนวนวันผูกกับรายการ ไม่ใช่ค่าคงที่ตอน settle', () => {
  it('แพ็กยาวที่ซื้อไว้ก่อนได้วันตามแพ็กนั้น แม้ราคา/แพ็กเริ่มต้นจะเปลี่ยนไปแล้ว', async () => {
    const store = memoryStore();
    await store.upsertUserFromGoogle(
      { googleSub: 'g1', email: 'a@b.c', displayName: 'A', avatarUrl: null },
      0,
      () => 'u1',
    );
    await store.createPayment({
      id: 'p-year',
      userId: 'u1',
      amountSatang: 26_900,
      days: 365,
      beamChargeId: null,
      qrExpiresAt: 1000,
      qrImage: 'q',
      qrRaw: '',
      createdAt: 0,
    });
    const res = await store.settlePayment('p-year', { beamChargeId: 'ch', rawWebhookJson: '{}', now: 100 });
    expect(res.applied).toBe(true);
    expect(res.expiresAt).toBe(100 + 365 * 86_400);
    expect((await store.getPayment('p-year'))?.days).toBe(365);
  });
});

/**
 * D1 บน SQLite จริง (node:sqlite) — รัน SQL ของ d1Store จริงกับ schema จาก migrations/
 * ทุกเมธอดเป็น async และ yield ก่อนทำงาน เพื่อให้ Promise.all สลับลำดับได้เหมือน request พร้อมกันบน Worker
 * batch รันใน transaction เดียวแบบไม่มีช่องว่างระหว่าง statement — ตรงกับที่ D1 รับประกัน
 */
function sqliteD1() {
  const sqlite = new DatabaseSync(':memory:');
  const dir = new URL('../../../migrations/', import.meta.url);
  for (const f of readdirSync(dir)
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    sqlite.exec(readFileSync(new URL(f, dir), 'utf8'));
  }
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const stmt = (d1Sql: string) => {
    // D1 ใช้ ?1 ?2 … (ซ้ำได้) แต่ node:sqlite bind ?NNN ตามตำแหน่งไม่ได้ — แปลงเป็น ? แล้วเรียง args ตามที่ปรากฏ
    const order: number[] = [];
    const sql = d1Sql.replace(/\?(\d+)/g, (_, n: string) => {
      order.push(Number(n) - 1);
      return '?';
    });
    let args: never[] = [];
    const run = () => {
      const r = sqlite.prepare(sql).run(...args);
      return { meta: { changes: Number(r.changes) } };
    };
    const s = {
      bind(...a: unknown[]) {
        args = order.map((i) => a[i]) as never[];
        return s;
      },
      async first() {
        await tick();
        return sqlite.prepare(sql).get(...args) ?? null;
      },
      async all() {
        await tick();
        return { results: sqlite.prepare(sql).all(...args) };
      },
      async run() {
        await tick();
        return run();
      },
      _run: run,
    };
    return s;
  };
  const db = {
    prepare: stmt,
    async batch(stmts: ReturnType<typeof stmt>[]) {
      await tick();
      sqlite.exec('BEGIN');
      try {
        const out = stmts.map((s) => s._run());
        sqlite.exec('COMMIT');
        return out;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return db as unknown as D1Database;
}

describe('d1Store บน SQLite จริง', () => {
  async function seed(db: D1Database, payments: { id: string; days: number }[]) {
    const store = d1Store(db);
    await store.upsertUserFromGoogle({ googleSub: 'g', email: 'e', displayName: 'n', avatarUrl: null }, 0, () => 'u1');
    for (const p of payments) {
      await store.createPayment({
        id: p.id,
        userId: 'u1',
        amountSatang: 2900,
        days: p.days,
        beamChargeId: `ch-${p.id}`,
        qrExpiresAt: 900,
        qrImage: null,
        qrRaw: null,
        createdAt: 0,
      });
    }
    return store;
  }

  it('สองรายการของคนเดียวกัน settle พร้อมกัน → ได้วันครบทั้งสองรายการ ไม่มีรายการไหนทับอีกรายการ', async () => {
    const store = await seed(sqliteD1(), [
      { id: 'p1', days: 30 },
      { id: 'p2', days: 90 },
    ]);
    const [a, b] = await Promise.all([
      store.settlePayment('p1', { beamChargeId: 'ch-p1', rawWebhookJson: '{}', now: 1000 }),
      store.settlePayment('p2', { beamChargeId: 'ch-p2', rawWebhookJson: '{}', now: 1000 }),
    ]);
    expect(a.applied && b.applied).toBe(true);
    expect(await store.getExpiresAt('u1')).toBe(1000 + 120 * DAY);
  });

  it('ต่ออายุจากวันหมดอายุเดิมที่ยังไม่หมด · หมดแล้วนับจาก now · settle ซ้ำ (แม้พร้อมกัน) บวกครั้งเดียว', async () => {
    const store = await seed(sqliteD1(), [
      { id: 'p1', days: 30 },
      { id: 'p2', days: 30 },
    ]);
    const first = await Promise.all([
      store.settlePayment('p1', { beamChargeId: 'ch-p1', rawWebhookJson: '{}', now: 1000 }),
      store.settlePayment('p1', { beamChargeId: 'ch-p1', rawWebhookJson: '{}', now: 1000 }),
    ]);
    expect(first.filter((r) => r.applied)).toHaveLength(1);
    expect(await store.getExpiresAt('u1')).toBe(1000 + 30 * DAY);
    // ยังไม่หมด → บวกต่อจากวันหมดอายุเดิม
    const renew = await store.settlePayment('p2', { beamChargeId: 'ch-p2', rawWebhookJson: '{}', now: 2000 });
    expect(renew).toEqual({ applied: true, expiresAt: 1000 + 60 * DAY });
    const replay = await store.settlePayment('p2', { beamChargeId: 'ch-p2', rawWebhookJson: '{}', now: 3000 });
    expect(replay).toEqual({ applied: false, expiresAt: 1000 + 60 * DAY });
  });

  it('รายการที่หมดอายุไปแล้ว (expired) ยัง settle ได้ และวันหมดอายุที่ผ่านไปแล้วนับใหม่จาก now', async () => {
    const store = await seed(sqliteD1(), [{ id: 'p1', days: 30 }]);
    await store.expirePayment('p1');
    const late = 100 * DAY;
    expect(await store.settlePayment('p1', { beamChargeId: 'ch-p1', rawWebhookJson: '{}', now: late })).toEqual({
      applied: true,
      expiresAt: late + 30 * DAY,
    });
    expect(await store.getPayment('p1')).toMatchObject({ status: 'paid', paidAt: late });
  });
});
