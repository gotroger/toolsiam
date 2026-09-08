import { useState } from 'react';
import { formatNumber } from '@/lib/format';
import { useDateInput } from '@/lib/use-today';
import { calculateTenure, formatTenure } from './logic';
import { ErrorText, Field, Input, Stat } from '@/components/ui';
import { formatThaiDate } from '@/lib/thai-date';

const MIN_DATE = '1900-01-01';
const MAX_DATE = '2200-12-31';

export default function WorkTenureTool() {
  const [start, setStart] = useState('2020-06-01');
  // วันอ้างอิงเริ่มต้นคือวันนี้ตามเวลาไทย ไม่ใช่ timezone ของเครื่องผู้ใช้ (§27 D2)
  const [ref, setRef] = useDateInput();

  let error = '';
  let tenure: ReturnType<typeof calculateTenure> | null = null;
  if (ref !== '') {
    try { tenure = calculateTenure(start, ref); } catch (e) { error = (e as Error).message; }
  }

  const beYear = (iso: string) => (/^\d{4}-/.test(iso) ? Number(iso.slice(0, 4)) + 543 : '—');

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="วันเริ่มงาน" htmlFor="start" hint={`ตรงกับ พ.ศ. ${beYear(start)}`}>
          <Input id="start" type="date" min={MIN_DATE} max={MAX_DATE} value={start} onChange={(e) => setStart(e.target.value)} aria-describedby="start-hint" />
        </Field>
        <Field
          label="คำนวณ ณ วันที่"
          htmlFor="ref"
          hint={`ตรงกับ พ.ศ. ${beYear(ref)} — ถ้าลาออกแล้วให้กรอกวันสุดท้ายของการทำงาน`}
        >
          <Input id="ref" type="date" min={MIN_DATE} max={MAX_DATE} value={ref} onChange={(e) => setRef(e.target.value)} aria-describedby="ref-hint" />
        </Field>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {tenure && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="อายุงาน" value={formatTenure(tenure)} />
            <Stat label="คิดเป็นเดือน" value={`${formatNumber(tenure.totalMonths)} เดือน`} />
            <Stat label="รวมทั้งหมด" value={`${formatNumber(tenure.totalDays)} วัน`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="ครบรอบปีถัดไป" value={formatThaiDate(tenure.nextAnniversary, { style: 'medium' })} />
            <Stat
              label="อีกกี่วันถึงครบรอบ"
              value={tenure.daysToNextAnniversary === 0 ? 'วันนี้ครบรอบพอดี' : `${formatNumber(tenure.daysToNextAnniversary)} วัน`}
            />
          </div>
        </>
      )}
    </div>
  );
}
