import type { LotteryDraw } from '@/data/lottery/schema';
import { formatThaiDate } from '@/lib/thai-date';

/**
 * แถบบอกที่มาของข้อมูลงวด — ต้องมีทุกหน้าที่แสดงผลรางวัล (§28.1 ข้อ 6)
 * ข้อมูลดึงจาก API ของสำนักงานสลากฯ โดยตรงและผ่าน validator แล้ว จึงแสดงได้ทันทีโดยไม่รอคนตรวจซ้ำ
 *
 * เป็น React เพื่อใช้ร่วมกันทั้งหน้า static (`DrawMeta.astro` render ตอน build ไม่มี JS)
 * และ island ที่สลับเป็นงวดใหม่จาก KV — markup ชุดเดียว หน้าตาจึงไม่มีทางต่างกัน
 */
interface Props {
  draw: LotteryDraw;
  /** ข้อความนำหน้าวันที่ เช่น "ตรวจกับงวดวันที่" */
  prefix?: string;
  /** true = งวดนี้มาจาก KV ใหม่กว่าที่ build ไว้ แสดงป้าย "งวดใหม่ล่าสุด" */
  fresh?: boolean;
}

export default function DrawMetaLine({ draw, prefix = 'งวดวันที่', fresh = false }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium text-slate-900">
        {prefix} {formatThaiDate(draw.drawDate, { style: 'medium' })}
      </span>
      {fresh && (
        <span className="rounded-lg border border-brand-600/30 bg-brand-50 px-2 py-0.5 text-xs text-brand-800">
          งวดใหม่ล่าสุด
        </span>
      )}
      <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
        ข้อมูลจากสำนักงานสลากฯ
      </span>
      <a
        href={draw.sourceUrl}
        rel="nofollow noopener"
        target="_blank"
        className="text-brand-700 underline underline-offset-2 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        ประกาศของสำนักงานสลากกินแบ่งรัฐบาล
      </a>
    </div>
  );
}
