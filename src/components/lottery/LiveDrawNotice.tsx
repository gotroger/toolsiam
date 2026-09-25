import { useEffect } from 'react';
import type { LotteryDraw } from '@/data/lottery/schema';
import { useTodayInBangkok } from '@/lib/use-today';
import { drawFreshness } from '@/lib/lottery-freshness';
import { useLiveDraw } from '@/lib/lottery-remote';
import { formatThaiDate } from '@/lib/thai-date';
import { GLO_SOURCE_PAGE } from '@/lib/glo-api.mjs';

/**
 * สถานะข้อมูลงวดล่าสุด (§28.2 ข้อ 2–6)
 *
 * หน้าถูก render ด้วยข้อมูล static ที่ build มาแล้ว จึงใช้งานได้ทันทีโดยไม่ต้องรอ network
 * component นี้เป็นชั้นเสริมล้วน ๆ:
 *   - ได้งวดใหม่กว่าจาก KV → เนื้อหาของหน้าสลับเป็นงวดใหม่เอง (ตัวตรวจหวย ตารางผล การ์ดผลล่าสุด
 *     ใช้ store เดียวกันใน `lottery-remote`) · หน้าแรก (`replaceBoard`) สลับเลขในการ์ดที่ Astro render ไว้
 *   - 204 / timeout / Worker ล่ม → เงียบ ใช้ข้อมูล static ต่อ ไม่มี single point of failure
 *   - ข้อมูลที่ใหม่สุดที่มี (static หรือ KV) ไม่ใช่งวดล่าสุดแล้ว → เตือนผู้ใช้ (L5)
 *     ไม่แสดงงวดเก่าเงียบ ๆ ราวกับเป็นงวดล่าสุด · เตือนหลังถาม KV เสร็จเท่านั้น จะได้ไม่โผล่วาบแล้วหาย
 */

/** ประเภทรางวัลที่การ์ดหน้าแรกแสดง — ต้องตรงกับ `data-lottery-numbers` ใน LotteryBanner.astro */
const BOARD_PRIZES = ['first', 'twoDigitBack', 'threeDigitFront', 'threeDigitBack'] as const;

/** สลับเลขในการ์ดที่ Astro render ไว้แล้วให้เป็นงวดใหม่ โดยไม่ต้องรอ deploy */
function replaceBoard(draw: LotteryDraw) {
  const time = document.querySelector<HTMLTimeElement>('[data-lottery-date]');
  if (time) {
    time.dateTime = draw.drawDate;
    time.textContent = formatThaiDate(draw.drawDate, { style: 'medium' });
  }
  for (const kind of BOARD_PRIZES) {
    const dd = document.querySelector(`[data-lottery-numbers="${kind}"]`);
    if (!dd) continue;
    dd.replaceChildren(
      ...draw.prizes[kind].map((number) => {
        const span = document.createElement('span');
        span.textContent = number;
        return span;
      }),
    );
  }
}

interface Props {
  staticDrawDate?: string;
  /** true = สลับเลขในการ์ดหน้าแรกเป็นงวดใหม่จาก KV */
  replaceBoard?: boolean;
}

function GloLink() {
  return (
    <a href={GLO_SOURCE_PAGE} rel="nofollow noopener" target="_blank" className="underline underline-offset-2">
      เว็บไซต์สำนักงานสลากกินแบ่งรัฐบาล
    </a>
  );
}

export default function LiveDrawNotice({ staticDrawDate, replaceBoard: inPlace = false }: Props) {
  const { checked, remote } = useLiveDraw(staticDrawDate);
  const today = useTodayInBangkok();

  useEffect(() => {
    if (remote && inPlace) replaceBoard(remote.draw);
  }, [remote, inPlace]);

  const newest = remote?.draw.drawDate ?? staticDrawDate;
  if (!checked || today === '' || newest === undefined) return null;

  const freshness = drawFreshness(newest, today);
  const shown = formatThaiDate(newest, { style: 'medium' });

  if (freshness.kind === 'stale') {
    return (
      <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">ผลงวดวันที่ {shown} ยังไม่ถูกอัปเดต</p>
        <p className="mt-1">
          ตามปกติสลากออกรางวัลทุกวันที่ 1 และ 16 ของเดือน ข้อมูลที่แสดงอยู่นี้จึงน่าจะไม่ใช่งวดล่าสุดแล้ว
          กรุณาตรวจผลงวดล่าสุดที่ <GloLink />
        </p>
      </div>
    );
  }

  if (freshness.kind === 'missed-draw') {
    return (
      <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">
          ยังไม่มีผลงวดวันที่ {formatThaiDate(freshness.expectedDate, { style: 'medium' })} ในหน้านี้
        </p>
        <p className="mt-1">
          ผลที่แสดงอยู่เป็นของงวดวันที่ {shown} ตามกำหนดสลากออกรางวัลทุกวันที่ 1 และ 16 ของเดือน
          ถ้างวดนี้เลื่อนวันออกรางวัล ผลจะขึ้นที่นี่เมื่อประกาศแล้ว ระหว่างนี้ตรวจผลล่าสุดได้ที่ <GloLink />
        </p>
      </div>
    );
  }

  return null;
}
