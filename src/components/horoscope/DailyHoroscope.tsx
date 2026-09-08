import { useState } from 'react';
import { useTodayInBangkok } from '@/lib/use-today';
import { ZODIAC_SIGNS } from '@/lib/thai-astro';
import { DAILY_CATEGORIES, DAILY_POOL, type DailyCategory } from '@/content/horoscope/daily-pool';
import { pickForGroup } from '@/lib/seeded';
import { formatThaiDate } from '@/lib/thai-date';
import { Field, Select, Stat } from '@/components/ui';

/**
 * ดวงรายวัน 12 ราศี (§9.5)
 *
 * รันฝั่ง client **หลัง mount** โดยตั้งใจ ไม่ใช่ตอน build — หน้า static ที่ build วันนี้
 * จะค้างอยู่ที่เนื้อหาของวันที่ build ถ้าคำนวณตอน build · pattern เดียวกับที่ repo ใช้อยู่แล้ว
 * ในการ seed ค่าวันที่หลัง mount เพื่อกัน hydration mismatch
 *
 * ผลลัพธ์ deterministic 100%: seed = หมวด + วันที่ไทย และ index เลื่อนตามลำดับราศี
 * จึงไม่มีการสุ่ม ไม่เรียก AI และไม่มีค่าใช้จ่ายฝั่งเซิร์ฟเวอร์
 */
export default function DailyHoroscope({ initialSign }: { initialSign?: string }) {
  const [signId, setSignId] = useState(initialSign ?? ZODIAC_SIGNS[0].id);

  // "วันนี้" ต้องเป็นวันไทยเสมอ ผู้ใช้ทุกประเทศจึงเห็นดวงของวันเดียวกัน (§27 D2)
  const today = useTodayInBangkok();

  const signIndex = Math.max(0, ZODIAC_SIGNS.findIndex((s) => s.id === signId));
  const sign = ZODIAC_SIGNS[signIndex];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="เลือกราศี" htmlFor="daily-sign">
          <Select id="daily-sign" value={signId} onChange={(e) => setSignId(e.target.value)}>
            {ZODIAC_SIGNS.map((s) => (
              <option key={s.id} value={s.id}>{`${s.symbol} ${s.name} (${s.from[1]} ${monthName(s.from[0])} – ${s.to[1]} ${monthName(s.to[0])})`}</option>
            ))}
          </Select>
        </Field>
        <div className="self-end">
          <Stat label="ดวงประจำวัน" value={today === '' ? 'กำลังโหลด…' : formatThaiDate(today, { style: 'medium' })} />
        </div>
      </div>

      {today === '' ? (
        <p className="text-sm text-slate-500">กำลังอ่านวันที่ตามเวลาประเทศไทย…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
          {DAILY_CATEGORIES.map((c) => (
            <article key={c.id} className="rounded-[10px] border border-slate-200 bg-surface p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900">
                {c.label}
              </h3>
              <p className="mt-1.5 text-sm text-slate-700">
                {pickForGroup(DAILY_POOL[c.id as DailyCategory], `${c.id}-${today}`, signIndex, ZODIAC_SIGNS.length)}
              </p>
            </article>
          ))}
        </div>
      )}

      <p className="text-sm text-slate-600">
        ดวงของ{sign.name}เปลี่ยนทุกเที่ยงคืนตามเวลาประเทศไทย ข้อความมาจากคลังที่เขียนไว้ล่วงหน้า
        และเลือกด้วยสูตรที่คงที่ ไม่ใช่การสุ่ม — เปิดกี่ครั้งในวันเดียวกันก็ได้ข้อความเดิม
      </p>
    </div>
  );
}

const THAI_MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
function monthName(m: number): string {
  return THAI_MONTH_SHORT[m - 1];
}
