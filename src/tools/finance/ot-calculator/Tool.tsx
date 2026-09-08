import { useState } from 'react';
import { calculateOt, COMMON_WORK_DAYS, OT_KINDS, OT_LABEL, type OtKind } from './logic';
import { DataTable, ErrorText, Field, NumberInput, ResultBox, Select, Stat } from '@/components/ui';
import { formatBaht } from '@/lib/format';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

export default function OtCalculatorTool() {
  const [salary, setSalary] = useState('18000');
  const [workDays, setWorkDays] = useState('30');
  const [hoursPerDay, setHoursPerDay] = useState('8');
  const [hours, setHours] = useState<Record<OtKind, string>>({ workdayOt: '10', holidayWork: '0', holidayOt: '0' });

  const setHour = (kind: OtKind, value: string) => setHours((prev) => ({ ...prev, [kind]: value }));

  let error = '';
  let result: ReturnType<typeof calculateOt> | null = null;
  try {
    result = calculateOt(
      { monthlySalary: num(salary), workDaysPerMonth: num(workDays), hoursPerDay: num(hoursPerDay) },
      OT_KINDS.map((kind) => ({ kind, hours: num(hours[kind]) })),
    );
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberInput id="salary" label="เงินเดือน" mode="decimal" value={salary} onValueChange={setSalary} suffix="บาท" />
        <Field
          label="ฐานวันทำงานต่อเดือน"
          htmlFor="work-days"
          hint="ที่ทำงานแต่ละแห่งใช้ฐานไม่เท่ากัน ให้ดูจากระเบียบของบริษัท"
        >
          <Select id="work-days" value={workDays} onChange={(e) => setWorkDays(e.target.value)} aria-describedby="work-days-hint">
            {COMMON_WORK_DAYS.map((d) => <option key={d} value={String(d)}>{`${d} วัน`}</option>)}
          </Select>
        </Field>
        <NumberInput id="hours-per-day" label="ชั่วโมงทำงานปกติต่อวัน" mode="decimal" value={hoursPerDay} onValueChange={setHoursPerDay} suffix="ชม." />
      </div>

      <div>
        <h2 className="mb-2 text-base font-semibold text-slate-900">จำนวนชั่วโมงล่วงเวลา</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {OT_KINDS.map((kind) => (
            <NumberInput
              key={kind}
              id={`hours-${kind}`}
              label={OT_LABEL[kind]}
              mode="decimal"
              value={hours[kind]}
              onValueChange={(v) => setHour(kind, v)}
              suffix="ชม."
            />
          ))}
        </div>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {result && (
        <>
          <ResultBox label="ค่าล่วงเวลารวม">{formatBaht(result.totalOt)} บาท</ResultBox>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="ค่าจ้างต่อวัน" value={`${formatBaht(result.daily)} บาท`} />
            <Stat label="ค่าจ้างต่อชั่วโมง" value={`${formatBaht(result.hourly)} บาท`} />
            <Stat label="รวมชั่วโมง OT" value={`${result.totalHours} ชม.`} />
            <Stat label="เงินเดือน + OT" value={`${formatBaht(result.grossWithOt)} บาท`} />
          </div>

          <DataTable
            caption="รายละเอียดค่าล่วงเวลาแยกตามประเภท"
            columns={[
              { key: 'kind', header: 'ประเภท', render: (r) => OT_LABEL[r.kind] },
              { key: 'hours', header: 'ชั่วโมง', align: 'right', render: (r) => String(r.hours) },
              { key: 'rate', header: 'บาท/ชม.', align: 'right', render: (r) => formatBaht(r.ratePerHour) },
              { key: 'amount', header: 'เป็นเงิน', align: 'right', render: (r) => formatBaht(r.amount) },
            ]}
            rows={result.lines}
            rowKey={(r) => r.kind}
          />
        </>
      )}
    </div>
  );
}
