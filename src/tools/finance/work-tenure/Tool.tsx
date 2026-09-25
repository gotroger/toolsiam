import { DatePicker } from '@/components/ui/date-picker';
import { useState } from 'react';
import { formatNumber } from '@/lib/format';
import { useDateInput } from '@/lib/use-today';
import { calculateTenure, formatTenure } from './logic';
import { Checkbox, ErrorText, Field, Stat } from '@/components/ui';
import { formatThaiDate } from '@/lib/thai-date';

const MIN_DATE = '1900-01-01';
const MAX_DATE = '2200-12-31';

export default function WorkTenureTool() {
  const [start, setStart] = useState('2020-06-01');
  // วันอ้างอิงเริ่มต้นคือวันนี้ตามเวลาไทย ไม่ใช่ timezone ของเครื่องผู้ใช้ (§27 D2)
  const [ref, setRef] = useDateInput();
  // ลาออกแล้ว = วันที่อ้างอิงคือวันสุดท้ายที่ทำงาน จึงนับวันนั้นด้วย ให้ตรงกับเครื่องมือค่าชดเชย
  const [resigned, setResigned] = useState(false);

  let error = '';
  let tenure: ReturnType<typeof calculateTenure> | null = null;
  if (ref !== '') {
    try {
      tenure = calculateTenure(start, ref, { includeEndDay: resigned });
    } catch (e) {
      error = (e as Error).message;
    }
  }

  const beYear = (iso: string) => (/^\d{4}-/.test(iso) ? Number(iso.slice(0, 4)) + 543 : '—');

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="วันเริ่มงาน" htmlFor="start" hint={`ตรงกับ พ.ศ. ${beYear(start)}`}>
          <DatePicker
            id="start"
            min={MIN_DATE}
            max={MAX_DATE}
            value={start}
            onValueChange={setStart}
            aria-describedby="start-hint"
          />
        </Field>
        <Field
          label={resigned ? 'วันสุดท้ายที่ทำงาน' : 'คำนวณ ณ วันที่'}
          htmlFor="ref"
          hint={
            resigned
              ? `ตรงกับ พ.ศ. ${beYear(ref)} — นับวันนั้นเป็นวันทำงานด้วย`
              : `ตรงกับ พ.ศ. ${beYear(ref)} — นับแบบครบรอบถึงวันที่เลือก ถ้าลาออกแล้วให้ติ๊กช่องด้านล่าง`
          }
        >
          <DatePicker
            id="ref"
            min={MIN_DATE}
            max={MAX_DATE}
            value={ref}
            onValueChange={setRef}
            aria-describedby="ref-hint"
          />
        </Field>
        <div className="sm:col-span-2">
          <Checkbox
            label="ลาออกหรือออกจากงานแล้ว — วันที่กรอกคือวันสุดท้ายที่ทำงาน (นับวันนั้นด้วย)"
            checked={resigned}
            onChange={(e) => setResigned(e.target.checked)}
          />
        </div>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {tenure && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="อายุงาน" value={formatTenure(tenure)} />
            <Stat label="คิดเป็นเดือน" value={`${formatNumber(tenure.totalMonths)} เดือน`} />
            <Stat label="รวมทั้งหมด" value={`${formatNumber(tenure.totalDays)} วัน`} />
          </div>
          {!resigned && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label="ครบรอบปีถัดไป" value={formatThaiDate(tenure.nextAnniversary, { style: 'medium' })} />
              <Stat
                label="อีกกี่วันถึงครบรอบ"
                value={
                  tenure.daysToNextAnniversary === 0
                    ? 'วันนี้ครบรอบพอดี'
                    : `${formatNumber(tenure.daysToNextAnniversary)} วัน`
                }
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
