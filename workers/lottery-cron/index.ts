import { syncLatestDraw, type LotteryEnv } from '../../src/lib/lottery-worker';

/**
 * Worker ที่ดึงผลงวดใหม่จาก GLO ตามเวลา แล้วเขียนลง KV (§28.2)
 *
 * แยกจาก Worker ของเว็บด้วยเหตุผลสองข้อ:
 *   1. Cloudflare cron trigger ต้องการ `scheduled` handler ซึ่ง entrypoint ของ Astro ไม่มี
 *   2. แยกกันแล้ว cron ที่มีปัญหาไม่กระทบเว็บเลย — เว็บอ่าน KV อย่างเดียว ไม่เคยเขียน
 *
 * Worker นี้ไม่รับ HTTP traffic จากผู้ใช้ มีแต่ cron และ endpoint สำหรับสั่งรันเองตอนตรวจสอบ
 */

/**
 * Worker นี้ไม่รู้ว่าเว็บ build งวดไหนไปแล้ว และไม่จำเป็นต้องรู้
 *
 * กฎ L3 (ไฟล์ใน repo ชนะ KV) ถูกบังคับที่ฝั่ง client ผ่าน `shouldPreferRemote` อยู่แล้ว
 * การให้ Worker รู้ด้วยต้อง bundle ข้อมูลทั้ง 27 งวดเข้ามา ซึ่งเปลืองโดยไม่ได้อะไรเพิ่ม
 * (และ `import.meta.glob` ที่ตัวโหลดข้อมูลใช้เป็น feature ของ Vite ที่ bundler ของ Wrangler ไม่รู้จัก)
 */
const NEWEST_STATIC_DATE = undefined;

export default {
  async scheduled(_controller: ScheduledController, env: LotteryEnv, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      syncLatestDraw({ env, newestStaticDate: NEWEST_STATIC_DATE }).then((outcome) => {
        // log ทุกรอบ ไม่ใช่เฉพาะตอนพลาด — เวลาไล่ปัญหาย้อนหลังต้องรู้ว่ารอบที่เงียบทำอะไรไป
        console.log(`[lottery-cron] ${JSON.stringify(outcome)}`);
      }),
    );
  },

  /**
   * สั่งรันเองด้วยมือเพื่อตรวจสอบ — ต้องมี header `x-trigger-secret` ตรงกับ secret ที่ตั้งไว้
   * ถ้ายังไม่ได้ตั้ง secret จะปิดไว้ทั้งหมด ไม่ใช่เปิดให้ใครก็เรียกได้
   */
  async fetch(request: Request, env: LotteryEnv & { TRIGGER_SECRET?: string }): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/run') return new Response('ไม่พบเส้นทางนี้', { status: 404 });

    const secret = env.TRIGGER_SECRET;
    if (!secret || request.headers.get('x-trigger-secret') !== secret) {
      return new Response('ไม่ได้รับอนุญาต', { status: 401 });
    }

    const outcome = await syncLatestDraw({ env, newestStaticDate: NEWEST_STATIC_DATE });
    return new Response(JSON.stringify(outcome, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  },
};
