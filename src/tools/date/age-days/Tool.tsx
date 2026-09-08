import { useEffect, useState } from 'react';
import { calculateAge, daysBetween } from './logic';
import { ErrorText, Field, Input, Select, Stat } from '@/components/ui';
import { todayInBangkok } from '@/lib/today';

const MIN_DATE = '1900-01-01';
const MAX_DATE = '2200-12-31';

export default function AgeDaysTool() {
  const [mode, setMode] = useState<'age' | 'between'>('age');
  const [birth, setBirth] = useState('1990-05-15');
  const [ref, setRef] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  // "วันนี้" ต้องเป็นวันที่ตามเวลาไทยเสมอ ไม่ใช่ timezone ของเครื่องผู้ใช้ (§27 D2)
  useEffect(() => {
    const today = todayInBangkok();
    setRef(today);
    setStart(today);
    setEnd(today);
  }, []);

  const ready = mode === 'age' ? ref !== '' : start !== '' && end !== '';

  let error = '';
  let age: ReturnType<typeof calculateAge> | null = null;
  let span: ReturnType<typeof daysBetween> | null = null;
  if (ready) {
    try {
      if (mode === 'age') age = calculateAge(birth, ref);
      else span = daysBetween(start, end);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  const beYear = (iso: string) => (/^\d{4}-/.test(iso) ? Number(iso.slice(0, 4)) + 543 : '—');

  return (
    <div className="space-y-6">
      <Field label="โหมด" htmlFor="mode">
        <Select id="mode" value={mode} onChange={(e) => setMode(e.target.value as 'age' | 'between')}>
          <option value="age">คำนวณอายุ</option>
          <option value="between">นับวันระหว่างสองวันที่</option>
        </Select>
      </Field>

      {mode === 'age' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="วันเกิด" htmlFor="birth" hint={`ตรงกับ พ.ศ. ${beYear(birth)}`}>
            <Input id="birth" type="date" min={MIN_DATE} max={MAX_DATE} value={birth} onChange={(e) => setBirth(e.target.value)} />
          </Field>
          <Field label="คำนวณ ณ วันที่" htmlFor="ref" hint={`ตรงกับ พ.ศ. ${beYear(ref)}`}>
            <Input id="ref" type="date" min={MIN_DATE} max={MAX_DATE} value={ref} onChange={(e) => setRef(e.target.value)} />
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="วันเริ่มต้น" htmlFor="start" hint={`ตรงกับ พ.ศ. ${beYear(start)}`}>
            <Input id="start" type="date" min={MIN_DATE} max={MAX_DATE} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="วันสิ้นสุด" htmlFor="end" hint={`ตรงกับ พ.ศ. ${beYear(end)}`}>
            <Input id="end" type="date" min={MIN_DATE} max={MAX_DATE} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
      )}

      {error && <ErrorText>{error}</ErrorText>}

      {age && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="อายุ" value={`${age.years} ปี ${age.months} เดือน ${age.days} วัน`} />
            <Stat label="รวมทั้งหมด" value={`${age.totalDays.toLocaleString('en-US')} วัน`} />
            <Stat label="คิดเป็นสัปดาห์" value={`${age.totalWeeks.toLocaleString('en-US')} สัปดาห์`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="วันเกิดครั้งถัดไป" value={age.nextBirthday} />
            <Stat
              label="อีกกี่วันถึงวันเกิด"
              value={age.daysToNextBirthday === 0 ? 'วันนี้คือวันเกิด 🎂' : `${age.daysToNextBirthday} วัน`}
            />
          </div>
        </>
      )}

      {span && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="ห่างกัน" value={`${span.days.toLocaleString('en-US')} วัน`} />
          <Stat label="นับรวมวันเริ่ม-วันสิ้นสุด" value={`${span.inclusiveDays.toLocaleString('en-US')} วัน`} />
          <Stat label="แบบปฏิทิน" value={`${span.parts.years} ปี ${span.parts.months} เดือน ${span.parts.days} วัน`} />
          <Stat label="สัปดาห์" value={`${span.weeks} สัปดาห์ ${span.remainderDays} วัน`} />
          <Stat label="วันจันทร์–ศุกร์" value={`${span.weekdayCount.toLocaleString('en-US')} วัน`} />
          <Stat label="เสาร์–อาทิตย์" value={`${span.weekendCount.toLocaleString('en-US')} วัน`} />
        </div>
      )}
    </div>
  );
}
