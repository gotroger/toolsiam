import { DatePicker } from '@/components/ui/date-picker';
import { useState } from 'react';
import { addBusinessDays, businessDaysBetween, listHolidays, type HolidayRegion, type HolidayCalendar } from './logic';
import { describeDate } from '@/lib/thai-date';
import { CopyButton, DataTable, ErrorText, Field, Input, Select, Stat } from '@/components/ui';
import { toCsv } from '@/lib/clipboard';

export default function ThaiHolidaysTool() {
  const [region, setRegion] = useState<HolidayRegion>('national');
  const [cal, setCal] = useState<HolidayCalendar>('bank');
  const [start, setStart] = useState('2026-01-01');
  const [end, setEnd] = useState('2026-03-31');
  const [addFrom, setAddFrom] = useState('2026-01-05');
  const [addCount, setAddCount] = useState('30');

  const holidays = listHolidays(cal, region);

  let spanError = '';
  let span: ReturnType<typeof businessDaysBetween> | null = null;
  try {
    span = businessDaysBetween(start, end, cal, region);
  } catch (e) {
    spanError = (e as Error).message;
  }

  let addError = '';
  let dueDate = '';
  try {
    dueDate = addBusinessDays(addFrom, Number(addCount), cal, region);
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
            <DatePicker id="start" min="2026-01-01" max="2026-12-31" value={start} onValueChange={setStart} />
          </Field>
          <Field label="วันสิ้นสุด" htmlFor="end">
            <DatePicker id="end" min="2026-01-01" max="2026-12-31" value={end} onValueChange={setEnd} />
          </Field>
        </div>
        {spanError && <ErrorText>{spanError}</ErrorText>}
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
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="นับจากวันที่" htmlFor="addFrom">
            <DatePicker id="addFrom" min="2026-01-01" max="2026-12-31" value={addFrom} onValueChange={setAddFrom} />
          </Field>
          <Field label="จำนวนวันทำการ" htmlFor="addCount" hint="ใส่เลขติดลบเพื่อนับย้อนหลัง">
            <Input id="addCount" inputMode="numeric" value={addCount} onChange={(e) => setAddCount(e.target.value)} />
          </Field>
          <div className="self-end">
            {addError ? (
              <ErrorText>{addError}</ErrorText>
            ) : (
              <Stat label="ครบกำหนด" value={describeDate(dueDate).fullThai} />
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">
            {cal === 'bank' ? 'วันหยุดธนาคาร' : 'วันหยุดราชการ'} ปี 2569 ({holidays.length} รายการ)
          </h2>
          <CopyButton
            label="คัดลอกเป็น CSV"
            text={toCsv(
              ['วันที่', 'ชื่อวันหยุด', 'ประเภท'],
              holidays.map((h) => [describeDate(h.date).shortThai, h.name, h.type]),
            )}
          />
        </div>
        <DataTable
          caption="รายการวันหยุดราชการ"
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
