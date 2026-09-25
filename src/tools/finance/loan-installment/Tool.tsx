import { useMemo, useState } from 'react';
import { calculateLoan } from './logic';
import { Button, DataTable, ErrorText, NumberInput, Stat } from '@/components/ui';
import { formatBaht, parseNumberInput } from '@/lib/format';

export default function LoanInstallmentTool() {
  const [principal, setPrincipal] = useState('2000000');
  const [rate, setRate] = useState('5.5');
  const [years, setYears] = useState('30');
  const [showAll, setShowAll] = useState(false);

  // ตัดคอมมาเหมือนเครื่องมืออื่น ("2,000,000") และช่องว่างไม่ถูกตีความเป็น 0% เงียบ ๆ
  const rateMissing = rate.trim() === '';
  const result = useMemo(() => {
    if (rateMissing) return { ok: false as const, error: '' };
    try {
      return {
        ok: true as const,
        value: calculateLoan({
          principal: parseNumberInput(principal),
          annualRatePercent: parseNumberInput(rate),
          months: Math.round(parseNumberInput(years) * 12),
        }),
      };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [principal, rate, years, rateMissing]);

  const rows = result.ok ? (showAll ? result.value.schedule : result.value.schedule.slice(0, 12)) : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberInput
          id="principal"
          label="วงเงินกู้"
          mode="decimal"
          value={principal}
          onValueChange={setPrincipal}
          suffix="บาท"
        />
        <NumberInput
          id="rate"
          label="ดอกเบี้ยต่อปี"
          mode="decimal"
          value={rate}
          onValueChange={setRate}
          suffix="%"
          hint="ใส่ 0 ถ้าเป็นเงินกู้ไม่มีดอกเบี้ย"
          error={rateMissing ? 'กรอกอัตราดอกเบี้ย (ใส่ 0 ได้ถ้าไม่มีดอกเบี้ย)' : undefined}
        />
        <NumberInput
          id="years"
          label="ระยะเวลาผ่อน"
          mode="decimal"
          value={years}
          onValueChange={setYears}
          suffix="ปี"
        />
      </div>

      {!result.ok && result.error && <ErrorText>{result.error}</ErrorText>}

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
