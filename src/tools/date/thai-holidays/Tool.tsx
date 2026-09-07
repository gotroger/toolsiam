import { useState } from 'react';
import { addBusinessDays, businessDaysBetween, listHolidays, type HolidayCalendar } from './logic';
import { describeDate } from '@/lib/thai-date';
import { Button, Field, Input, Select, Stat } from '@/components/ui';

export default function ThaiHolidaysTool() {
  const [cal, setCal] = useState<HolidayCalendar>('bank');
  const [start, setStart] = useState('2026-01-01');
  const [end, setEnd] = useState('2026-03-31');
  const [addFrom, setAddFrom] = useState('2026-01-05');
  const [addCount, setAddCount] = useState('30');

  const holidays = listHolidays(cal);

  let spanError = '';
  let span: ReturnType<typeof businessDaysBetween> | null = null;
  try {
    span = businessDaysBetween(start, end, cal);
  } catch (e) {
    spanError = (e as Error).message;
  }

  let addError = '';
  let dueDate = '';
  try {
    dueDate = addBusinessDays(addFrom, Math.trunc(Number(addCount) || 0), cal);
  } catch (e) {
    addError = (e as Error).message;
  }

  return (
    <div className="space-y-8">
      <Field label="ปฏิทินที่ใช้" htmlFor="cal">
        <Select id="cal" value={cal} onChange={(e) => setCal(e.target.value as HolidayCalendar)}>
          <option value="bank">วันหยุดธนาคาร (ประกาศ ธปท.)</option>
          <option value="government">วันหยุดราชการ</option>
        </Select>
      </Field>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">นับวันทำการระหว่างสองวันที่</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="วันเริ่มต้น" htmlFor="start">
            <Input id="start" type="date" min="2026-01-01" max="2026-12-31" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="วันสิ้นสุด" htmlFor="end">
            <Input id="end" type="date" min="2026-01-01" max="2026-12-31" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        {spanError && <p className="text-sm text-red-600">{spanError}</p>}
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
        <h2 className="text-lg font-semibold">อีกกี่วันทำการจะครบกำหนด</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="นับจากวันที่" htmlFor="addFrom">
            <Input id="addFrom" type="date" min="2026-01-01" max="2026-12-31" value={addFrom} onChange={(e) => setAddFrom(e.target.value)} />
          </Field>
          <Field label="จำนวนวันทำการ" htmlFor="addCount" hint="ใส่เลขติดลบเพื่อนับย้อนหลัง">
            <Input id="addCount" inputMode="numeric" value={addCount} onChange={(e) => setAddCount(e.target.value)} />
          </Field>
          <div className="self-end">
            {addError ? (
              <p className="text-sm text-red-600">{addError}</p>
            ) : (
              <Stat label="ครบกำหนด" value={describeDate(dueDate).fullThai} />
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {cal === 'bank' ? 'วันหยุดธนาคาร' : 'วันหยุดราชการ'} ปี 2569 ({holidays.length} รายการ)
          </h2>
          <Button
            variant="secondary"
            onClick={() => {
              const rows = holidays.map((h) => `${describeDate(h.date).shortThai},${h.name},${h.type}`);
              navigator.clipboard.writeText(['วันที่,ชื่อวันหยุด,ประเภท', ...rows].join('\n'));
            }}
          >
            คัดลอกเป็น CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">วันที่</th>
                <th className="px-3 py-2">วัน</th>
                <th className="px-3 py-2">ชื่อวันหยุด</th>
                <th className="px-3 py-2">ประเภท</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => {
                const info = describeDate(h.date);
                const weekend = info.weekdayIndex === 0 || info.weekdayIndex === 6;
                return (
                  <tr key={h.date} className="border-t border-slate-100">
                    <td className="px-3 py-2 whitespace-nowrap">{info.shortThai}</td>
                    <td className={`px-3 py-2 whitespace-nowrap ${weekend ? 'text-slate-400' : ''}`}>{info.weekdayName}</td>
                    <td className="px-3 py-2">{h.name}</td>
                    <td className="px-3 py-2 text-slate-500">{h.type}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          วันที่แสดงเป็นสีจางคือวันหยุดที่ตรงกับเสาร์-อาทิตย์อยู่แล้ว ข้อมูลอ้างอิงประกาศธนาคารแห่งประเทศไทยและมติคณะรัฐมนตรี
          หากมีประกาศวันหยุดพิเศษเพิ่มเติมระหว่างปี ตัวเลขอาจเปลี่ยนแปลงได้ ตารางนี้นับเฉพาะวันหยุดทั่วประเทศ
          จึงไม่รวมวันศุกร์ที่ 16 ตุลาคม 2569 ซึ่งเป็นวันหยุดพิเศษของสถาบันการเงินเฉพาะพื้นที่กรุงเทพมหานคร
          ตามประกาศ ธปท. ที่ 26/2569
        </p>
      </section>
    </div>
  );
}
