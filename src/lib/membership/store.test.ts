import { describe, it, expect, vi } from 'vitest';
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
      status: 'pending',
      beam_charge_id: null,
      qr_expires_at: 0,
      qr_image: null,
      qr_raw: null,
      created_at: 0,
      paid_at: null,
    };
    const db = fakeD1([paymentRow, { expires_at: 1000 + 5 * DAY }]);
    const result = await d1Store(db).settlePayment('p1', {
      beamChargeId: 'ch',
      rawWebhookJson: '{}',
      now: 1000,
      days: 30,
    });
    expect(result).toEqual({ applied: true, expiresAt: 1000 + 35 * DAY });
    expect(db.batch).toHaveBeenCalledTimes(1);
    const [sub, pay] = db.calls.slice(-2);
    expect(sub.sql).toContain(
      "WHERE EXISTS (SELECT 1 FROM payments WHERE id = ?4 AND status IN ('pending', 'expired'))",
    );
    expect(sub.sql).toContain('ON CONFLICT (user_id)');
    expect(sub.args).toEqual(['u1', 1000 + 35 * DAY, 1000, 'p1']);
    expect(pay.sql).toContain("WHERE id = ?1 AND status IN ('pending', 'expired')");
    expect(pay.args).toEqual(['p1', 'ch', 1000, '{}']);
  });

  it('settlePayment ที่ UPDATE ไม่เปลี่ยนแถว = จ่ายไปแล้ว → applied false และวันหมดอายุเดิม', async () => {
    const paid = { id: 'p1', user_id: 'u1', status: 'paid', amount_satang: 1900, qr_expires_at: 0, created_at: 0 };
    const db = fakeD1([paid, { expires_at: 999 }], 0);
    expect(
      await d1Store(db).settlePayment('p1', { beamChargeId: 'ch', rawWebhookJson: '{}', now: 1000, days: 30 }),
    ).toEqual({
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
      beamChargeId: null,
      qrExpiresAt: 500,
      qrImage: null,
      qrRaw: null,
      createdAt: 0,
    });
    await store.expirePayment('p1');
    expect(await store.getPayment('p1')).toMatchObject({ status: 'expired' });
    const settled = await store.settlePayment('p1', { beamChargeId: 'ch', rawWebhookJson: '', now: 1000, days: 30 });
    expect(settled).toEqual({ applied: true, expiresAt: 1000 + 30 * DAY });
    const again = await store.settlePayment('p1', { beamChargeId: 'ch', rawWebhookJson: '', now: 2000, days: 30 });
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
      beamChargeId: null,
      qrExpiresAt: 900,
      qrImage: null,
      qrRaw: null,
      createdAt: 0,
    });
    expect(await store.latestPendingPayment('u1', 899)).toMatchObject({ id: 'p1' });
    expect(await store.latestPendingPayment('u1', 900)).toBeNull();
    const first = await store.settlePayment('p1', { beamChargeId: 'ch', rawWebhookJson: '', now: 1000, days: 30 });
    const again = await store.settlePayment('p1', { beamChargeId: 'ch', rawWebhookJson: '', now: 2000, days: 30 });
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
