import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

/**
 * D1 บน SQLite จริง (node:sqlite) — รัน SQL ของ d1Store จริงกับ schema จาก migrations/
 * ทุกเมธอดเป็น async และ yield ก่อนทำงาน เพื่อให้ Promise.all สลับลำดับได้เหมือน request พร้อมกันบน Worker
 * batch รันใน transaction เดียวแบบไม่มีช่องว่างระหว่าง statement — ตรงกับที่ D1 รับประกัน
 */
export function sqliteD1() {
  const sqlite = new DatabaseSync(':memory:');
  const dir = new URL('../../migrations/', import.meta.url);
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
