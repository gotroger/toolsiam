import { DatePicker } from '@/components/ui/date-picker';
import { useState } from 'react';
import { useDateInput } from '@/lib/use-today';
import { dayColorsFromDate } from '@/lib/thai-astro';
import { Checkbox, ErrorText, Field, ResultBox, Stat } from '@/components/ui';
import ErrorBoundary from '@/components/ErrorBoundary';

const GROUPS = [
  { key: 'work', label: 'สีเสริมการงาน' },
  { key: 'money', label: 'สีเสริมการเงิน' },
  { key: 'love', label: 'สีเสริมความรัก' },
  { key: 'luck', label: 'สีเสริมโชคลาภ' },
] as const;

/** สีมงคลจากวันเกิด — ผู้ใช้กรอกวันเกิด ไม่ใช่วันนี้ เพราะสีประจำตัวยึดวันที่เกิด */
function LuckyColorFinderInner() {
  const [birth, setBirth] = useDateInput();
  const [night, setNight] = useState(false);

  let error = '';
  let colors: ReturnType<typeof dayColorsFromDate> | null = null;
  if (birth !== '') {
    try {
      colors = dayColorsFromDate(birth, { wednesdayNight: night });
    } catch (e) {
      error = (e as Error).message;
    }
  }

  return (
    <div className="space-y-4">
      <Field label="วันเกิดของคุณ" htmlFor="lc-birth" hint="ระบบจะหาว่าวันนั้นตรงกับวันอะไรในสัปดาห์ให้เอง">
        <DatePicker
          id="lc-birth"
          min="1900-01-01"
          max="2200-12-31"
          value={birth}
          onValueChange={setBirth}
          aria-describedby="lc-birth-hint"
        />
      </Field>

      {/* ตำราไทยนับคนเกิดวันพุธหลัง 18:00 น. เป็น "พุธกลางคืน" (ราหู) ซึ่งสีต่างจากพุธกลางวันทั้งชุด */}
      {colors && colors.weekdayIndex === 3 && (
        <Checkbox
          label="เกิดวันพุธหลัง 18:00 น. (พุธกลางคืน)"
          checked={night}
          onChange={(e) => setNight(e.target.checked)}
        />
      )}

      {error && <ErrorText>{error}</ErrorText>}

      {colors && (
        <>
          <ResultBox label="คุณเกิดวัน">
            {colors.weekdayName} · สีประจำวันเกิดคือสี{colors.birthColor}
          </ResultBox>

          <div className="grid gap-3 sm:grid-cols-2">
            {GROUPS.map((g) => (
              <Stat key={g.key} label={g.label} value={colors![g.key].join(' · ')} />
            ))}
          </div>

          <p className="rounded-[10px] border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            สีที่ความเชื่อว่าควรเลี่ยงสำหรับคนเกิดวัน{colors.weekdayName} คือสี{colors.avoid.join(' และสี')} —
            ชุดนี้คำนวณตามหลักทักษาของโหราศาสตร์ไทย ตำราสำนักอื่นอาจระบุต่างออกไป
          </p>
        </>
      )}
    </div>
  );
}

/** ห่อด้วย ErrorBoundary แบบเดียวกับ island ของเครื่องมือ — พังแล้วยังเหลือข้อความบอกผู้ใช้ ไม่ใช่กล่องว่าง */
export default function LuckyColorFinder() {
  return (
    <ErrorBoundary name="horoscope-lucky-color">
      <LuckyColorFinderInner />
    </ErrorBoundary>
  );
}
