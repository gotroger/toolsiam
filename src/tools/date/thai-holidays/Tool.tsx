import { DatePicker } from '@/components/ui/date-picker';
import { useState } from 'react';
import {
  addBusinessDays,
  businessDaysBetween,
  coveredYears,
  isYearCovered,
  listHolidays,
  uncoveredWarning,
  uncoveredYearsBetween,
  type HolidayRegion,
  type HolidayCalendar,
} from './logic';
import { describeDate } from '@/lib/thai-date';
import { useTodayInBangkok } from '@/lib/use-today';
import { Alert, CopyButton, DataTable, ErrorText, Field, NumberInput, Select, Stat } from '@/components/ui';
import { toCsv } from '@/lib/clipboard';

const YEARS = coveredYears();
const FIRST_YEAR = YEARS[0].ce;
const LAST_YEAR = YEARS[YEARS.length - 1].ce;
const CAL_LABEL: Record<HolidayCalendar, string> = { bank: 'วันหยุดธนาคาร', government: 'วันหยุดราชการ' };

export default function ThaiHolidaysTool() {
  const [region, setRegion] = useState<HolidayRegion>('national');
  const [cal, setCal] = useState<HolidayCalendar>('bank');
  // null = ผู้ใช้ยังไม่เคยแก้ → ใช้ค่าตั้งต้นตามปีปัจจุบันของไทย (ฝั่ง server ยังไม่รู้วันนี้ จึงใช้ปีล่าสุดที่มีข้อมูล)
  const [editedStart, setStart] = useState<string | null>(null);
  const [editedEnd, setEnd] = useState<string | null>(null);
  const [editedAddFrom, setAddFrom] = useState<string | null>(null);
  const [editedTableYear, setTableYear] = useState<number | null>(null);
  const [addCount, setAddCount] = useState('30');
  const [direction, setDirection] = useState<'1' | '-1'>('1');

  const today = useTodayInBangkok();
  const currentYear = today ? Number(today.slice(0, 4)) : LAST_YEAR;
  const start = editedStart ?? `${currentYear}-01-01`;
  const end = editedEnd ?? `${currentYear}-03-31`;
  const addFrom = editedAddFrom ?? (today || `${currentYear}-01-05`);
  const tableYear = editedTableYear ?? (isYearCovered(currentYear) ? currentYear : LAST_YEAR);
  // ปีปัจจุบันเลือกได้เสมอแม้ยังไม่มีประกาศ — ผลจะนับเฉพาะเสาร์–อาทิตย์พร้อมคำเตือน
  const pickerMin = `${Math.min(FIRST_YEAR, currentYear)}-01-01`;
  const pickerMax = `${Math.max(LAST_YEAR, currentYear)}-12-31`;

  const holidays = listHolidays(cal, region, tableYear);

  let spanError = '';
  let span: ReturnType<typeof businessDaysBetween> | null = null;
  try {
    span = businessDaysBetween(start, end, cal, region);
  } catch (e) {
    spanError = (e as Error).message;
  }

  let addError = '';
  let dueDate = '';
  let addWarning = '';
  const count = addCount.trim() === '' ? Number.NaN : Number(addCount.replace(/,/g, ''));
  if (!Number.isInteger(count) || count < 0) {
    addError = 'จำนวนวันทำการต้องเป็นจำนวนเต็มไม่ติดลบ — เลือกทิศทางนับไปข้างหน้าหรือย้อนหลังแทน';
  } else {
    try {
      dueDate = addBusinessDays(addFrom, count * Number(direction), cal, region);
      addWarning = uncoveredWarning(uncoveredYearsBetween(addFrom, dueDate));
    } catch (e) {
      addError = (e as Error).message;
    }
  }

  return (
    <div className="space-y-8">
      <Field label="ปฏิทินที่ใช้" htmlFor="cal">
        <Select id="cal" value={cal} onChange={(e) => setCal(e.target.value as HolidayCalendar)}>
          <option value="bank">วันหยุดธนาคาร (ประกาศ ธปท.)</option>
          <option value="government">วันหยุดราชการ</option>
        </Select>
      </Field>

      <Field
        label="พื้นที่"
        htmlFor="region"
        hint="กรุงเทพฯ หยุดพิเศษ 16 ต.ค. 2569; WFH วันที่ 12, 14, 15 ต.ค. ยังนับเป็นวันทำการ; ไม่รวมวันหยุดเฉพาะจังหวัดอื่น"
      >
        <Select id="region" value={region} onChange={(e) => setRegion(e.target.value as HolidayRegion)}>
          <option value="national">วันหยุดทั่วประเทศ</option>
          <option value="bangkok">กรุงเทพมหานคร</option>
        </Select>
      </Field>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">นับวันทำการระหว่างสองวันที่</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="วันเริ่มต้น" htmlFor="start">
            <DatePicker id="start" min={pickerMin} max={pickerMax} value={start} onValueChange={setStart} />
          </Field>
          <Field label="วันสิ้นสุด" htmlFor="end">
            <DatePicker id="end" min={pickerMin} max={pickerMax} value={end} onValueChange={setEnd} />
          </Field>
        </div>
        {spanError && <ErrorText>{spanError}</ErrorText>}
        {span && span.uncoveredYears.length > 0 && <Alert>{uncoveredWarning(span.uncoveredYears)}</Alert>}
        {span && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="วันทำการ" value={`${span.businessDays} วัน`} />
            <Stat label="รวมทุกวัน" value={`${span.totalDays} วัน`} />
            <Stat label="เสาร์–อาทิตย์" value={`${span.weekendDays} วัน`} />
            <Stat label="วันหยุดนักขัตฤกษ์" value={`${span.holidayDays} วัน`} />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">อีกกี่วันทำการจะครบกำหนด</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="นับจากวันที่" htmlFor="addFrom">
            <DatePicker id="addFrom" min={pickerMin} max={pickerMax} value={addFrom} onValueChange={setAddFrom} />
          </Field>
          {/* ทิศทางแยกเป็นตัวเลือก เพราะแป้นตัวเลขของ iOS ไม่มีเครื่องหมายลบให้พิมพ์ */}
          <Field label="ทิศทาง" htmlFor="addDirection">
            <Select id="addDirection" value={direction} onChange={(e) => setDirection(e.target.value as '1' | '-1')}>
              <option value="1">นับไปข้างหน้า</option>
              <option value="-1">นับย้อนหลัง</option>
            </Select>
          </Field>
          <NumberInput
            id="addCount"
            label="จำนวนวันทำการ"
            mode="numeric"
            value={addCount}
            onValueChange={setAddCount}
            suffix="วัน"
            error={addError || undefined}
          />
          <div className="self-end">
            {dueDate && !addError && <Stat label="ครบกำหนด" value={describeDate(dueDate).fullThai} />}
          </div>
        </div>
        {addWarning && !addError && <Alert>{addWarning}</Alert>}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium">
            {CAL_LABEL[cal]} ปี {tableYear + 543} ({holidays.length} รายการ)
          </h2>
          {YEARS.length > 1 && (
            <Select
              aria-label="ปีของตารางวันหยุด"
              wrapperClassName="w-40"
              value={String(tableYear)}
              onChange={(e) => setTableYear(Number(e.target.value))}
            >
              {YEARS.map((y) => (
                <option key={y.ce} value={y.ce}>
                  พ.ศ. {y.be}
                </option>
              ))}
            </Select>
          )}
          <CopyButton
            label="คัดลอกเป็น CSV"
            text={toCsv(
              ['วันที่', 'ชื่อวันหยุด', 'ประเภท'],
              holidays.map((h) => [describeDate(h.date).shortThai, h.name, h.type]),
            )}
          />
        </div>
        <DataTable
          caption={`รายการ${CAL_LABEL[cal]} ปี ${tableYear + 543}`}
          rows={holidays}
          rowKey={(h) => h.date}
          columns={[
            {
              key: 'date',
              header: 'วันที่',
              render: (h) => <span className="whitespace-nowrap">{describeDate(h.date).shortThai}</span>,
            },
            {
              key: 'weekday',
              header: 'วัน',
              render: (h) => {
                const info = describeDate(h.date);
                const weekend = info.weekdayIndex === 0 || info.weekdayIndex === 6;
                // เสาร์-อาทิตย์จางลงเพราะเป็นวันหยุดอยู่แล้ว ไม่ได้ทำให้ได้หยุดเพิ่ม
                return (
                  <span className={weekend ? 'whitespace-nowrap text-slate-600' : 'whitespace-nowrap'}>
                    {info.weekdayName}
                  </span>
                );
              },
            },
            { key: 'name', header: 'ชื่อวันหยุด', render: (h) => h.name },
            { key: 'type', header: 'ประเภท', render: (h) => <span className="text-slate-500">{h.type}</span> },
          ]}
        />
        <p className="text-xs text-slate-500">
          วันที่แสดงเป็นสีจางคือวันหยุดที่ตรงกับเสาร์-อาทิตย์อยู่แล้ว
          ข้อมูลอ้างอิงประกาศธนาคารแห่งประเทศไทยและมติคณะรัฐมนตรี หากมีประกาศวันหยุดพิเศษเพิ่มเติมระหว่างปี
          ตัวเลขอาจเปลี่ยนแปลงได้ เลือกกรุงเทพมหานครเพื่อรวมวันหยุดพิเศษ 16 ตุลาคม 2569 ตามมติ ครม. 19 พฤษภาคม 2569
          และประกาศ ธปท. ที่ 26/2569
        </p>
      </section>
    </div>
  );
}
