import { useState } from 'react';
import { carLoan, COMMON_TERMS } from './logic';
import { Disclaimer, ErrorText, Field, NumberInput, ResultBox, Select, Stat } from '@/components/ui';
import { formatBaht, formatNumber } from '@/lib/format';
import { getToolUrl } from '@/lib/routes';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

export default function CarLoanTool() {
  const [price, setPrice] = useState('800000');
  const [downPercent, setDownPercent] = useState('20');
  const [rate, setRate] = useState('2.99');
  const [months, setMonths] = useState('60');

  const downPayment = (num(price) * num(downPercent)) / 100;

  let error = '';
  let result: ReturnType<typeof carLoan> | null = null;
  try {
    result = carLoan({ price: num(price), downPayment, flatRate: num(rate) / 100, months: num(months) });
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberInput id="price" label="ราคารถ" mode="decimal" value={price} onValueChange={setPrice} suffix="บาท" />
        <NumberInput
          id="down"
          label="เงินดาวน์"
          mode="decimal"
          value={downPercent}
          onValueChange={setDownPercent}
          suffix="%"
          hint={Number.isFinite(downPayment) ? `= ${formatBaht(downPayment)} บาท` : undefined}
        />
        <NumberInput
          id="rate"
          label="ดอกเบี้ยคงที่"
          mode="decimal"
          value={rate}
          onValueChange={setRate}
          suffix="% ต่อปี"
          hint="อัตราที่ไฟแนนซ์เสนอ (Flat Rate)"
          error={error || undefined}
        />
        <Field label="จำนวนงวด" htmlFor="months">
          <Select id="months" value={months} onChange={(e) => setMonths(e.target.value)}>
            {COMMON_TERMS.map((t) => <option key={t} value={String(t)}>{`${t} งวด (${t / 12} ปี)`}</option>)}
          </Select>
        </Field>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {result && (
        <>
          <ResultBox label="ค่างวดต่อเดือน">{formatBaht(result.monthlyPayment)} บาท</ResultBox>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="ยอดจัดไฟแนนซ์" value={`${formatBaht(result.financed)} บาท`} />
            <Stat label="ดอกเบี้ยรวมตลอดสัญญา" value={`${formatBaht(result.totalInterest)} บาท`} />
            <Stat label="จ่ายรวมทั้งหมด" value={`${formatBaht(result.totalPaid)} บาท`} />
            <Stat label="เทียบเป็นลดต้นลดดอก" value={`${formatNumber(result.effectiveAnnualRate * 100, 2)}% ต่อปี`} />
          </div>

          <Disclaimer>
            ดอกเบี้ยคงที่ {formatNumber(num(rate), 2)}% ของสินเชื่อรถ คิดจากยอดจัดเต็มจำนวนตลอดสัญญา
            ไม่ลดตามเงินต้นที่ผ่อนไปแล้ว ภาระจริงจึงเทียบเท่าดอกเบี้ยแบบลดต้นลดดอกที่{' '}
            {formatNumber(result.effectiveAnnualRate * 100, 2)}% ต่อปี — สูงกว่าตัวเลขบนป้ายราว {result.effectiveAnnualRate && num(rate) ? formatNumber(result.effectiveAnnualRate / (num(rate) / 100), 2) : '—'} เท่า
            ใช้ตัวเลขนี้เวลาเทียบกับสินเชื่อบ้านหรือสินเชื่อส่วนบุคคลที่คิดแบบลดต้นลดดอก
          </Disclaimer>

          <p className="text-sm text-slate-600">
            ต้องการแปลงอัตราสองแบบนี้ไปมาโดยตรง ใช้{' '}
            <a href={getToolUrl('flat-effective-rate')} className="text-brand-700 underline underline-offset-2 hover:text-brand-800">
              เครื่องมือแปลงดอกเบี้ยคงที่เป็นลดต้นลดดอก
            </a>
          </p>
        </>
      )}
    </div>
  );
}
