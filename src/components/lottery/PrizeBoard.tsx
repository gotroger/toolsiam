import { HEADLINE_PRIZES, MAJOR_PRIZES, N3_PRIZE_STRUCTURE, type LotteryDraw } from '@/data/lottery/schema';
import { formatBaht } from '@/lib/format';

/**
 * ผลรางวัลของหนึ่งงวด เรียงตามที่ประกาศของสำนักงานสลากฯ จัดวาง
 *
 *   แถวบน   รางวัลที่ 1 · เลขหน้า 3 ตัว · เลขท้าย 3 ตัว · เลขท้าย 2 ตัว   ← สี่ช่องที่คนดูก่อนเสมอ
 *   แถวถัดมา สลากตัวเลขสามหลัก (N3) ถ้างวดนั้นมี
 *   แถวล่าง  รางวัลข้างเคียง · รางวัลที่ 2–5 เรียงตามลำดับรางวัล
 *
 * เป็น React เพื่อใช้ร่วมกันทั้งหน้า static (`PrizeTable.astro` render ตอน build ไม่มี JS)
 * และ `LiveResults` ที่สลับเป็นงวดใหม่จาก KV — markup ชุดเดียว
 * key ใช้ index เพราะเลขในรางวัลเดียวกันซ้ำกันได้ (เลขหน้า/ท้าย 3 ตัวออกแยกกันคนละครั้ง)
 */
export default function PrizeBoard({ draw }: { draw: LotteryDraw }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="sr-only">รางวัลหลัก</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HEADLINE_PRIZES.map((spec) => (
            <div key={spec.id} className="rounded-xl border border-slate-200 bg-surface p-4">
              <p className="font-semibold text-slate-900">{spec.name}</p>
              <p className="text-xs text-slate-500">รางวัลละ {formatBaht(spec.amount)} บาท</p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-2xl font-bold tabular-nums text-slate-900">
                {draw.prizes[spec.id].map((n, i) => (
                  <span key={i}>{n}</span>
                ))}
              </p>
            </div>
          ))}
        </div>
      </section>

      {draw.n3 && (
        <section>
          <h3 className="text-base font-medium text-slate-900">สลากตัวเลขสามหลัก (N3)</h3>
          <p className="mt-0.5 text-sm text-slate-600">
            เป็นสลากคนละใบกับสลากกินแบ่งรัฐบาล 6 หลัก และเงินรางวัลไม่คงที่ เพราะแบ่งจากยอดขายของงวดนั้น
            จึงเปลี่ยนไปทุกงวด
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {N3_PRIZE_STRUCTURE.map((spec) => {
              const result = draw.n3![spec.id];
              return (
                <div key={spec.id} className="rounded-xl border border-slate-200 bg-surface p-4">
                  <p className="font-semibold text-slate-900">{spec.name}</p>
                  <p className="text-xs text-slate-500">รางวัลละ {formatBaht(result.price)} บาท</p>
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xl font-bold tabular-nums text-slate-900">
                    {result.numbers.map((n, i) => (
                      <span key={i}>{n}</span>
                    ))}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">{spec.note}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="sr-only">รางวัลอื่นของสลากกินแบ่งรัฐบาล</h3>
        {MAJOR_PRIZES.map((spec) => (
          <div key={spec.id} className="rounded-xl border border-slate-200 bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-medium text-slate-900">{spec.name}</h4>
              <p className="text-sm text-slate-500">
                รางวัลละ {formatBaht(spec.amount)} บาท · {spec.count} รางวัล
              </p>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {draw.prizes[spec.id].map((n, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm tabular-nums text-slate-900"
                >
                  {n}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
