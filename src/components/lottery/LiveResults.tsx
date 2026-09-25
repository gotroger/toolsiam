import type { LotteryDraw } from '@/data/lottery/schema';
import { useLiveDraw } from '@/lib/lottery-remote';
import DrawMetaLine from './DrawMetaLine';
import PrizeBoard from './PrizeBoard';

/**
 * ตารางผลงวดล่าสุดของหน้า `/lottery/results`
 *
 * `draw` คืองวดที่ build ไว้ — เฟรมแรกจึงตรงกับ HTML ที่ build มาเสมอ (hydration ไม่เพี้ยน)
 * ถ้า KV มีงวดที่ใหม่กว่า จะสลับเป็นตารางผลครบทุกรางวัลของงวดนั้นทันที ไม่ใช่แค่รางวัลที่ 1
 * หน้าผลรายงวด (`/lottery/results/<วันที่>`) ใช้ `PrizeTable.astro` แบบ static ตามเดิม
 */
export default function LiveResults({ draw }: { draw: LotteryDraw }) {
  const { remote } = useLiveDraw(draw.drawDate);
  const active = remote?.draw ?? draw;
  return (
    <>
      <DrawMetaLine draw={active} fresh={remote !== null} />
      <div className="mt-4">
        <PrizeBoard draw={active} />
      </div>
    </>
  );
}
