import { useState } from 'react';
import { compoundGrowth, monthlyForGoal } from './logic';
import { formatBaht } from '@/lib/format';
import { DataTable, ErrorText, Field, Input, Select, Stat } from '@/components/ui';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return n;
};

export default function CompoundInterestTool() {
  const [mode, setMode] = useState<'future' | 'goal'>('future');
  const [principal, setPrincipal] = useState('100000');
  const [deposit, setDeposit] = useState('5000');
  const [goal, setGoal] = useState('1000000');
  const [ratePercent, setRatePercent] = useState('5');
  const [years, setYears] = useState('10');
  const [compounds, setCompounds] = useState('12');

  const args = {
    principal: num(principal),
    annualRate: num(ratePercent) / 100,
    years: num(years),
    compoundsPerYear: num(compounds),
  };

  let error = '';
  let growth: ReturnType<typeof compoundGrowth> | null = null;
  let required = 0;
  try {
    if (mode === 'goal') {
      required = monthlyForGoal({ ...args, goal: num(goal) });
      growth = compoundGrowth({ ...args, monthlyDeposit: required });
    } else {
      growth = compoundGrowth({ ...args, monthlyDeposit: num(deposit) });
    }
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="โหมด" htmlFor="mode">
          <Select id="mode" value={mode} onChange={(e) => setMode(e.target.value as 'future' | 'goal')}>
            <option value="future">คำนวณเงินในอนาคต</option>
            <option value="goal">คำนวณเงินที่ต้องออม</option>
          </Select>
        </Field>
        <Field label="เงินต้น (บาท)" htmlFor="principal">
          <Input id="principal" inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
        </Field>
        {mode === 'future' ? (
          <Field label="ฝากเพิ่มต่อเดือน (บาท)" htmlFor="deposit">
            <Input id="deposit" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </Field>
        ) : (
          <Field label="เป้าหมาย (บาท)" htmlFor="goal">
            <Input id="goal" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} />
          </Field>
        )}
        <Field label="ดอกเบี้ยต่อปี (%)" htmlFor="rate">
          <Input id="rate" inputMode="decimal" value={ratePercent} onChange={(e) => setRatePercent(e.target.value)} />
        </Field>
        <Field label="ระยะเวลา (ปี)" htmlFor="years" hint="คำนวณเป็นเดือนเต็มโดยปัดจำนวนปี × 12; อย่างน้อย 1 เดือน">
          <Input id="years" inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} />
        </Field>
        <Field label="ทบต้นต่อปี" htmlFor="compounds">
          <Select id="compounds" value={compounds} onChange={(e) => setCompounds(e.target.value)}>
            <option value="12">รายเดือน (12)</option>
            <option value="4">รายไตรมาส (4)</option>
            <option value="2">ทุก 6 เดือน (2)</option>
            <option value="1">รายปี (1)</option>
          </Select>
        </Field>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {growth && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {mode === 'goal' && <Stat label="ต้องออมเดือนละ" value={`${formatBaht(required)} บาท`} />}
            <Stat label="ยอดเงินสุดท้าย" value={`${formatBaht(growth.futureValue)} บาท`} />
            <Stat label="เงินฝากรวม" value={`${formatBaht(growth.totalDeposits)} บาท`} />
            <Stat label="ดอกเบี้ยรวม" value={`${formatBaht(growth.totalInterest)} บาท`} />
          </div>

          <DataTable
            caption="ยอดเงินสะสมรายปี"
            rows={growth.rows}
            rowKey={(row) => String(row.year)}
            columns={[
              { key: 'year', header: 'ปีที่', render: (row) => row.year },
              { key: 'deposits', header: 'เงินฝากสะสม', align: 'right', render: (row) => formatBaht(row.deposits) },
              { key: 'interest', header: 'ดอกเบี้ยสะสม', align: 'right', render: (row) => formatBaht(row.interest) },
              {
                key: 'balance',
                header: 'ยอดคงเหลือ',
                align: 'right',
                render: (row) => <span className="font-medium">{formatBaht(row.balance)}</span>,
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
