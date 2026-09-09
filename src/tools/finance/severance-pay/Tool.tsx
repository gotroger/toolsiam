import { DatePicker } from '@/components/ui/date-picker';
import { useState } from 'react';
import { useDateInput } from '@/lib/use-today';
import {
  calculateSeverance,
  DAILY_WAGE_DIVISORS,
  NO_SEVERANCE_REASONS,
  SEVERANCE_BANDS,
  type DailyWageDivisor,
} from './logic';
import { DataTable, Disclaimer, ErrorText, Field, NumberInput, ResultBox, Select, Stat } from '@/components/ui';
import { formatBaht, formatNumber } from '@/lib/format';
import { getToolUrl } from '@/lib/routes';

const MIN_DATE = '1900-01-01';
const MAX_DATE = '2200-12-31';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

export default function SeverancePayTool() {
  const [salary, setSalary] = useState('30000');
  const [start, setStart] = useState('2020-01-01');
  const [end, setEnd] = useDateInput();
  const [divisor, setDivisor] = useState<DailyWageDivisor>(30);

  let error = '';
  let result: ReturnType<typeof calculateSeverance> | null = null;
  if (end !== '') {
    try {
      result = calculateSeverance({ monthlySalary: num(salary), startDate: start, endDate: end, divisor });
    } catch (e) {
      error = (e as Error).message;
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberInput
          id="salary"
          label="ค่าจ้างอัตราสุดท้ายต่อเดือน"
          mode="decimal"
          value={salary}
          onValueChange={setSalary}
          suffix="บาท"
        />
        <Field label="วันเริ่มงาน" htmlFor="start">
          <DatePicker id="start" min={MIN_DATE} max={MAX_DATE} value={start} onValueChange={setStart} />
        </Field>
        <Field label="วันสุดท้ายของการทำงาน" htmlFor="end">
          <DatePicker id="end" min={MIN_DATE} max={MAX_DATE} value={end} onValueChange={setEnd} />
        </Field>
        <Field label="ตัวหารค่าจ้างรายวัน" htmlFor="divisor" hint="รายเดือนใช้ 30; 26 สำหรับสิทธิที่นายจ้างให้เพิ่ม">
          <Select
            id="divisor"
            value={String(divisor)}
            onChange={(e) => setDivisor(Number(e.target.value) as DailyWageDivisor)}
            aria-describedby="divisor-hint"
          >
            {DAILY_WAGE_DIVISORS.map((d) => (
              <option key={d} value={String(d)}>{`หารด้วย ${d} วัน`}</option>
            ))}
          </Select>
        </Field>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {result && (
        <>
          {result.band ? (
            <ResultBox label="ค่าชดเชยที่มีสิทธิได้รับ">{formatBaht(result.amount)} บาท</ResultBox>
          ) : (
            <Disclaimer>
              อายุงาน {formatNumber(result.tenureDays)} วัน ยังไม่ครบ 120 วัน ตามมาตรา 118
              จึงยังไม่เข้าเกณฑ์ได้รับค่าชดเชยจากการเลิกจ้าง
            </Disclaimer>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="อายุงาน" value={`${result.tenureYears} ปี (${formatNumber(result.tenureDays)} วัน)`} />
            <Stat label="ค่าจ้างรายวัน" value={`${formatBaht(result.dailyWage)} บาท`} />
            <Stat label="ขั้นตามกฎหมาย" value={result.band?.label ?? 'ยังไม่เข้าเกณฑ์'} />
            <Stat label="ได้รับเท่ากับค่าจ้าง" value={`${result.payDays} วัน`} />
          </div>

          <div>
            <h2 className="mb-2 text-base font-medium text-slate-900">ตารางค่าชดเชยตามมาตรา 118</h2>
            <DataTable
              caption="อัตราค่าชดเชยตามอายุงานตามพระราชบัญญัติคุ้มครองแรงงาน"
              columns={[
                { key: 'label', header: 'อายุงานติดต่อกัน', render: (t) => t.label },
                { key: 'payDays', header: 'ค่าชดเชย', align: 'right', render: (t) => `${t.payDays} วัน` },
              ]}
              rows={SEVERANCE_BANDS}
              rowKey={(t) => t.label}
            />
          </div>

          <div>
            <h2 className="mb-2 text-base font-medium text-slate-900">กรณีที่นายจ้างไม่ต้องจ่ายค่าชดเชย (มาตรา 119)</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {NO_SEVERANCE_REASONS.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-slate-600">
            ต้องการดูแค่อายุงานอย่างเดียว ใช้{' '}
            <a
              href={getToolUrl('work-tenure')}
              className="text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              เครื่องมือคำนวณอายุงาน
            </a>
          </p>
        </>
      )}
    </div>
  );
}
