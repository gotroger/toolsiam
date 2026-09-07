import { useState } from 'react';
import { compoundGrowth, monthlyForGoal } from './logic';
import { formatBaht } from '@/lib/format';
import { Field, Input, Select, Stat } from '@/components/ui';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
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
        <Field label="ระยะเวลา (ปี)" htmlFor="years">
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      {growth && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {mode === 'goal' && <Stat label="ต้องออมเดือนละ" value={`${formatBaht(required)} บาท`} />}
            <Stat label="ยอดเงินสุดท้าย" value={`${formatBaht(growth.futureValue)} บาท`} />
            <Stat label="เงินฝากรวม" value={`${formatBaht(growth.totalDeposits)} บาท`} />
            <Stat label="ดอกเบี้ยรวม" value={`${formatBaht(growth.totalInterest)} บาท`} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">ปีที่</th>
                  <th className="px-3 py-2 text-right">เงินฝากสะสม</th>
                  <th className="px-3 py-2 text-right">ดอกเบี้ยสะสม</th>
                  <th className="px-3 py-2 text-right">ยอดคงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {growth.rows.map((row) => (
                  <tr key={row.year} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.year}</td>
                    <td className="px-3 py-2 text-right">{formatBaht(row.deposits)}</td>
                    <td className="px-3 py-2 text-right">{formatBaht(row.interest)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatBaht(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
