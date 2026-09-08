import { useDateInput } from '@/lib/use-today';
import { dayColorsFromDate } from '@/lib/thai-astro';
import { ErrorText, Field, Input, ResultBox, Stat } from '@/components/ui';

const GROUPS = [
  { key: 'work', label: 'สีเสริมการงาน' },
  { key: 'money', label: 'สีเสริมการเงิน' },
  { key: 'love', label: 'สีเสริมความรัก' },
  { key: 'luck', label: 'สีเสริมโชคลาภ' },
] as const;

/** สีมงคลจากวันเกิด — ผู้ใช้กรอกวันเกิด ไม่ใช่วันนี้ เพราะสีประจำตัวยึดวันที่เกิด */
export default function LuckyColorFinder() {
  const [birth, setBirth] = useDateInput();

  let error = '';
  let colors: ReturnType<typeof dayColorsFromDate> | null = null;
  if (birth !== '') {
    try { colors = dayColorsFromDate(birth); } catch (e) { error = (e as Error).message; }
  }

  return (
    <div className="space-y-4">
      <Field label="วันเกิดของคุณ" htmlFor="lc-birth" hint="ระบบจะหาว่าวันนั้นตรงกับวันอะไรในสัปดาห์ให้เอง">
        <Input id="lc-birth" type="date" min="1900-01-01" max="2200-12-31" value={birth} onChange={(e) => setBirth(e.target.value)} aria-describedby="lc-birth-hint" />
      </Field>

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
            สีที่ความเชื่อว่าควรเลี่ยงสำหรับคนเกิดวัน{colors.weekdayName} คือสี{colors.avoid.join(' และสี')}
            {' '}— ตำราสีมงคลมีหลายสำนักและระบุไม่ตรงกันทั้งหมด ชุดนี้ยึดแนวที่เผยแพร่กันทั่วไป
          </p>
        </>
      )}
    </div>
  );
}
