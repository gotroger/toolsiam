import { useMemo, useState } from 'react';
import { calculateLoan } from './logic';
import { Button, Field, Input, Stat } from '@/components/ui';
import { formatBaht } from '@/lib/format';

export default function LoanInstallmentTool() {
  const [principal, setPrincipal] = useState('2000000');
  const [rate, setRate] = useState('5.5');
  const [years, setYears] = useState('30');
  const [showAll, setShowAll] = useState(false);

  const result = useMemo(() => {
    try {
      return { ok: true as const, value: calculateLoan({ principal: Number(principal), annualRatePercent: Number(rate), months: Math.round(Number(years) * 12) }) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [principal, rate, years]);

  const rows = result.ok ? (showAll ? result.value.schedule : result.value.schedule.slice(0, 12)) : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="วงเงินกู้ (บาท)" htmlFor="principal">
          <Input id="principal" inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
        </Field>
        <Field label="ดอกเบี้ยต่อปี (%)" htmlFor="rate">
          <Input id="rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
        </Field>
        <Field label="ระยะเวลาผ่อน (ปี)" htmlFor="years">
          <Input id="years" inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} />
        </Field>
      </div>

      {!result.ok && <p className="text-sm text-red-600">{result.error}</p>}

      {result.ok && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="ค่างวดต่อเดือน" value={`${formatBaht(result.value.monthlyPayment)} บาท`} />
            <Stat label="ดอกเบี้ยรวมตลอดสัญญา" value={`${formatBaht(result.value.totalInterest)} บาท`} />
            <Stat label="ยอดจ่ายรวม" value={`${formatBaht(result.value.totalPayment)} บาท`} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-2 py-1">งวด</th><th className="px-2 py-1">ค่างวด</th><th className="px-2 py-1">ดอกเบี้ย</th><th className="px-2 py-1">เงินต้น</th><th className="px-2 py-1">คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.period} className="border-t border-slate-100">
                    <td className="px-2 py-1">{r.period}</td>
                    <td className="px-2 py-1">{formatBaht(r.payment)}</td>
                    <td className="px-2 py-1">{formatBaht(r.interest)}</td>
                    <td className="px-2 py-1">{formatBaht(r.principal)}</td>
                    <td className="px-2 py-1">{formatBaht(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.value.schedule.length > 12 && (
            <Button variant="secondary" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'แสดงเฉพาะ 12 งวดแรก' : `แสดงทั้งหมด ${result.value.schedule.length} งวด`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
