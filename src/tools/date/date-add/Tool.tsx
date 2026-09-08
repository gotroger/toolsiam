import { DatePicker } from '@/components/ui/date-picker';
import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/format';
import { daysBetween, shiftAndDescribe, type ShiftUnit } from './logic';
import { ErrorText, Field, NumberInput, Select, Stat, Tabs, TabPanel } from '@/components/ui';
import { todayInBangkok } from '@/lib/today';

const MIN_DATE = '1900-01-01';
const MAX_DATE = '2200-12-31';
const ID = 'date-add';

const UNIT_LABEL: Record<ShiftUnit, string> = { day: 'วัน', week: 'สัปดาห์', month: 'เดือน', year: 'ปี' };

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

export default function DateAddTool() {
  const [tab, setTab] = useState('between');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [base, setBase] = useState('');
  const [amount, setAmount] = useState('90');
  const [unit, setUnit] = useState<ShiftUnit>('day');
  const [direction, setDirection] = useState<'1' | '-1'>('1');

  // "วันนี้" ตามเวลาไทยเสมอ ไม่ใช่ timezone ของเครื่องผู้ใช้ (§27 D2)
  useEffect(() => {
    const today = todayInBangkok();
    setStart(today);
    setEnd(today);
    setBase(today);
  }, []);

  let spanError = '';
  let span: ReturnType<typeof daysBetween> | null = null;
  if (start !== '' && end !== '') {
    try {
      span = daysBetween(start, end);
    } catch (e) {
      spanError = (e as Error).message;
    }
  }

  let shiftError = '';
  let shifted: ReturnType<typeof shiftAndDescribe> | null = null;
  if (base !== '') {
    try {
      shifted = shiftAndDescribe(base, num(amount), unit, direction === '1' ? 1 : -1);
    } catch (e) {
      shiftError = (e as Error).message;
    }
  }

  const beYear = (iso: string) => (/^\d{4}-/.test(iso) ? Number(iso.slice(0, 4)) + 543 : '—');

  return (
    <div className="space-y-6">
      <Tabs
        idPrefix={ID}
        label="โหมดการคำนวณวันที่"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'between', label: 'นับวันระหว่างวันที่' },
          { id: 'shift', label: 'บวก / ลบวันที่' },
        ]}
      />

      <TabPanel id="between" idPrefix={ID} active={tab === 'between'}>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="วันเริ่มต้น" htmlFor="start" hint={`ตรงกับ พ.ศ. ${beYear(start)}`}>
              <DatePicker
                id="start"
                min={MIN_DATE}
                max={MAX_DATE}
                value={start}
                onValueChange={setStart}
                aria-describedby="start-hint"
              />
            </Field>
            <Field label="วันสิ้นสุด" htmlFor="end" hint={`ตรงกับ พ.ศ. ${beYear(end)}`}>
              <DatePicker
                id="end"
                min={MIN_DATE}
                max={MAX_DATE}
                value={end}
                onValueChange={setEnd}
                aria-describedby="end-hint"
              />
            </Field>
          </div>

          {spanError && <ErrorText>{spanError}</ErrorText>}

          {span && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Stat label="ห่างกัน" value={`${formatNumber(span.days)} วัน`} />
              <Stat label="นับรวมวันเริ่ม-วันสิ้นสุด" value={`${formatNumber(span.inclusiveDays)} วัน`} />
              <Stat
                label="แบบปฏิทิน"
                value={`${span.parts.years} ปี ${span.parts.months} เดือน ${span.parts.days} วัน`}
              />
              <Stat label="สัปดาห์" value={`${span.weeks} สัปดาห์ ${span.remainderDays} วัน`} />
              <Stat label="วันจันทร์–ศุกร์" value={`${formatNumber(span.weekdayCount)} วัน`} />
              <Stat label="เสาร์–อาทิตย์" value={`${formatNumber(span.weekendCount)} วัน`} />
            </div>
          )}
        </div>
      </TabPanel>

      <TabPanel id="shift" idPrefix={ID} active={tab === 'shift'}>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="นับจากวันที่" htmlFor="base" hint={`ตรงกับ พ.ศ. ${beYear(base)}`}>
              <DatePicker
                id="base"
                min={MIN_DATE}
                max={MAX_DATE}
                value={base}
                onValueChange={setBase}
                aria-describedby="base-hint"
              />
            </Field>
            <Field label="ทิศทาง" htmlFor="direction">
              <Select id="direction" value={direction} onChange={(e) => setDirection(e.target.value as '1' | '-1')}>
                <option value="1">นับไปข้างหน้า (อีก…)</option>
                <option value="-1">นับย้อนหลัง (…ที่แล้ว)</option>
              </Select>
            </Field>
            <NumberInput
              id="amount"
              label="จำนวน"
              mode="numeric"
              value={amount}
              onValueChange={setAmount}
              suffix={UNIT_LABEL[unit]}
              error={shiftError || undefined}
            />
            <Field label="หน่วย" htmlFor="unit">
              <Select id="unit" value={unit} onChange={(e) => setUnit(e.target.value as ShiftUnit)}>
                <option value="day">วัน</option>
                <option value="week">สัปดาห์</option>
                <option value="month">เดือน</option>
                <option value="year">ปี</option>
              </Select>
            </Field>
          </div>

          {shifted && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="ตรงกับวันที่" value={shifted.fullThai} />
              <Stat label="รูปแบบสากล" value={shifted.date} />
              <Stat label="เป็นวันหยุดสุดสัปดาห์" value={shifted.isWeekend ? 'ใช่ (เสาร์–อาทิตย์)' : 'ไม่ใช่'} />
            </div>
          )}
        </div>
      </TabPanel>
    </div>
  );
}
