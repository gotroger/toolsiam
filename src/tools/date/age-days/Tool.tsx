import { useState } from 'react';
import { formatNumber } from '@/lib/format';
import { useDateInput } from '@/lib/use-today';
import { calculateAge } from './logic';
import { ErrorText, Field, Input, Stat } from '@/components/ui';
import { getToolUrl } from '@/lib/routes';

const MIN_DATE = '1900-01-01';
const MAX_DATE = '2200-12-31';

export default function AgeDaysTool() {
  const [birth, setBirth] = useState('1990-05-15');
  // วันอ้างอิงเริ่มต้นคือวันนี้ตามเวลาไทย ไม่ใช่ timezone ของเครื่องผู้ใช้ (§27 D2)
  const [ref, setRef] = useDateInput();

  let error = '';
  let age: ReturnType<typeof calculateAge> | null = null;
  if (ref !== '') {
    try {
      age = calculateAge(birth, ref);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  const beYear = (iso: string) => (/^\d{4}-/.test(iso) ? Number(iso.slice(0, 4)) + 543 : '—');

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="วันเกิด" htmlFor="birth" hint={`ตรงกับ พ.ศ. ${beYear(birth)}`}>
          <Input id="birth" type="date" min={MIN_DATE} max={MAX_DATE} value={birth} onChange={(e) => setBirth(e.target.value)} aria-describedby="birth-hint" />
        </Field>
        <Field label="คำนวณ ณ วันที่" htmlFor="ref" hint={`ตรงกับ พ.ศ. ${beYear(ref)}`}>
          <Input id="ref" type="date" min={MIN_DATE} max={MAX_DATE} value={ref} onChange={(e) => setRef(e.target.value)} aria-describedby="ref-hint" />
        </Field>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {age && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="อายุ" value={`${age.years} ปี ${age.months} เดือน ${age.days} วัน`} />
            <Stat label="รวมทั้งหมด" value={`${formatNumber(age.totalDays)} วัน`} />
            <Stat label="คิดเป็นสัปดาห์" value={`${formatNumber(age.totalWeeks)} สัปดาห์`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="วันเกิดครั้งถัดไป" value={age.nextBirthday} />
            <Stat
              label="อีกกี่วันถึงวันเกิด"
              value={age.daysToNextBirthday === 0 ? 'วันนี้คือวันเกิด' : `${age.daysToNextBirthday} วัน`}
            />
          </div>
        </>
      )}

      <p className="text-sm text-slate-600">
        ต้องการนับจำนวนวันระหว่างสองวันที่ หรือหาว่าอีก 90 วันตรงกับวันไหน ใช้{' '}
        <a href={getToolUrl('date-add')} className="text-brand-700 underline underline-offset-2 hover:text-brand-800">
          เครื่องมือนับวันและบวกลบวันที่
        </a>
      </p>
    </div>
  );
}
