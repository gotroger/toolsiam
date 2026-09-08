import { useMemo, useState } from 'react';
import { calculateLoan } from './logic';
import { Button, DataTable, ErrorText, Field, Input, Stat } from '@/components/ui';
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

      {!result.ok && <ErrorText>{result.error}</ErrorText>}

      {result.ok && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="ค่างวดต่อเดือน" value={`${formatBaht(result.value.monthlyPayment)} บาท`} />
            <Stat label="ดอกเบี้ยรวมตลอดสัญญา" value={`${formatBaht(result.value.totalInterest)} บาท`} />
            <Stat label="ยอดจ่ายรวม" value={`${formatBaht(result.value.totalPayment)} บาท`} />
          </div>

          <DataTable
            caption="ตารางผ่อนชำระรายงวด"
            rows={rows}
            rowKey={(r) => String(r.period)}
            columns={[
              { key: 'period', header: 'งวด', render: (r) => r.period },
              { key: 'payment', header: 'ค่างวด', align: 'right', render: (r) => formatBaht(r.payment) },
              { key: 'interest', header: 'ดอกเบี้ย', align: 'right', render: (r) => formatBaht(r.interest) },
              { key: 'principal', header: 'เงินต้น', align: 'right', render: (r) => formatBaht(r.principal) },
              { key: 'balance', header: 'คงเหลือ', align: 'right', render: (r) => formatBaht(r.balance) },
            ]}
          />
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
