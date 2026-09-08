import { useEffect, useState } from 'react';
import { isStale, shouldPreferRemote } from '@/lib/lottery-freshness';
import { todayInBangkok } from '@/lib/today';
import { formatThaiDate } from '@/lib/thai-date';
import { GLO_SOURCE_PAGE } from '@/lib/glo-api.mjs';
import { getLotteryLatestUrl } from '@/lib/routes';

/**
 * แถบแจ้งสถานะข้อมูลงวดล่าสุด (§28.2 ข้อ 2–6)
 *
 * หน้าถูก render ด้วยข้อมูล static ที่ build มาแล้ว จึงใช้งานได้ทันทีโดยไม่ต้องรอ network
 * component นี้เป็นชั้นเสริมล้วน ๆ:
 *   - ได้งวดใหม่กว่า → แจ้งพร้อมป้ายบอกสถานะการตรวจสอบ
 *   - 204 / timeout / Worker ล่ม → เงียบ ใช้ข้อมูล static ต่อ ไม่มี single point of failure
 *   - ข้อมูล static เก่าเกินเกณฑ์ → เตือนผู้ใช้ ไม่แสดงงวดเก่าเงียบ ๆ ราวกับเป็นงวดล่าสุด (L5)
 */
const TIMEOUT_MS = 3_000;

interface RemoteDraw {
  draw: { drawDate: string; status: string; prizes: { first: string[] } };
  fetchedAt: string;
}

export default function LiveDrawNotice({ staticDrawDate }: { staticDrawDate?: string }) {
  const [remote, setRemote] = useState<RemoteDraw | null>(null);
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(todayInBangkok());

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    fetch('/api/lottery/latest', { signal: controller.signal })
      .then((res) => (res.status === 200 ? (res.json() as Promise<RemoteDraw>) : null))
      .then((data) => {
        if (data && shouldPreferRemote(staticDrawDate, data.draw.drawDate)) setRemote(data);
      })
      // ทุกความล้มเหลวคือ "ไม่มีข้อมูลใหม่" ซึ่งเป็นสถานะที่หน้าเว็บรองรับอยู่แล้ว
      .catch(() => {})
      .finally(() => clearTimeout(timer));

    return () => { clearTimeout(timer); controller.abort(); };
  }, [staticDrawDate]);

  if (remote) {
    const { drawDate, status } = remote.draw;
    return (
      <div className="rounded-[10px] border border-brand-600/30 bg-brand-50 p-4 text-sm">
        <p className="font-semibold text-slate-900">
          มีผลงวดใหม่แล้ว — งวดวันที่ {formatThaiDate(drawDate, { style: 'medium' })}
        </p>
        <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
          {remote.draw.prizes.first[0]}
        </p>
        <p className="mt-2 text-slate-700">
          {status === 'verified'
            ? 'ตรวจกับประกาศแล้ว'
            : 'ผลนี้ระบบดึงมาอัตโนมัติและยังไม่มีคนตรวจซ้ำกับประกาศ ก่อนขึ้นเงินรางวัลกรุณายึดประกาศอย่างเป็นทางการเสมอ'}
        </p>
        <p className="mt-2">
          <a
            href={GLO_SOURCE_PAGE}
            rel="nofollow noopener"
            target="_blank"
            className="text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            ตรวจกับประกาศของสำนักงานสลากกินแบ่งรัฐบาล
          </a>
          {' · '}
          <a href={getLotteryLatestUrl()} className="text-brand-700 underline underline-offset-2 hover:text-brand-800">
            ดูผลงวดที่แสดงอยู่ในหน้านี้
          </a>
        </p>
      </div>
    );
  }

  if (today !== '' && staticDrawDate !== undefined && isStale(staticDrawDate, today)) {
    return (
      <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">
          ผลงวดวันที่ {formatThaiDate(staticDrawDate, { style: 'medium' })} ยังไม่ถูกอัปเดต
        </p>
        <p className="mt-1">
          ตามปกติสลากออกรางวัลทุกวันที่ 1 และ 16 ของเดือน ข้อมูลที่แสดงอยู่นี้จึงน่าจะไม่ใช่งวดล่าสุดแล้ว
          กรุณาตรวจผลงวดล่าสุดที่{' '}
          <a
            href={GLO_SOURCE_PAGE}
            rel="nofollow noopener"
            target="_blank"
            className="underline underline-offset-2"
          >
            เว็บไซต์สำนักงานสลากกินแบ่งรัฐบาล
          </a>
        </p>
      </div>
    );
  }

  return null;
}
