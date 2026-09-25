import type { LotteryDraw } from '@/data/lottery/schema';
import { useLiveDraw } from '@/lib/lottery-remote';
import { getLotteryLatestUrl } from '@/lib/routes';
import DrawMetaLine from './DrawMetaLine';

/**
 * การ์ด "ผลงวดล่าสุด" ในหน้า `/lottery` — สลับเป็นงวดใหม่จาก KV เองเมื่อมี
 * ไม่ปล่อยให้งวดเก่าที่ build ไว้แสดงอยู่ใต้หัวข้อ "ผลงวดล่าสุด" ในวันที่มีงวดใหม่แล้ว
 */
export default function LatestSummary({ draw }: { draw: LotteryDraw }) {
  const { remote } = useLiveDraw(draw.drawDate);
  const active = remote?.draw ?? draw;
  return (
    <>
      <div className="mt-2">
        <DrawMetaLine draw={active} fresh={remote !== null} />
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 bg-surface p-4">
        <p className="text-sm text-slate-500">รางวัลที่ 1</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{active.prizes.first[0]}</p>
        <p className="mt-3 text-sm text-slate-600">
          เลขท้าย 2 ตัว <span className="font-semibold text-slate-900">{active.prizes.twoDigitBack[0]}</span>
          {' · '}เลขท้าย 3 ตัว{' '}
          <span className="font-semibold text-slate-900">{active.prizes.threeDigitBack.join(' ')}</span>
        </p>
        <a
          href={getLotteryLatestUrl()}
          className="mt-3 inline-block text-sm text-brand-700 underline underline-offset-2 hover:text-brand-800"
        >
          ดูผลครบทุกรางวัล
        </a>
      </div>
    </>
  );
}
