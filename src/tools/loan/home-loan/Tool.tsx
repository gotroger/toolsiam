import { useState } from 'react';
import { homeLoan } from './logic';
import { DataTable, Disclaimer, ErrorText, NumberInput, ResultBox, Stat } from '@/components/ui';
import { formatBaht, formatNumber } from '@/lib/format';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

export default function HomeLoanTool() {
  const [price, setPrice] = useState('3000000');
  const [down, setDown] = useState('300000');
  const [years, setYears] = useState('30');
  const [promoRate, setPromoRate] = useState('2.99');
  const [promoMonths, setPromoMonths] = useState('36');
  const [afterRate, setAfterRate] = useState('6.65');
  const [extra, setExtra] = useState('0');

  let error = '';
  let result: ReturnType<typeof homeLoan> | null = null;
  try {
    result = homeLoan({
      price: num(price),
      downPayment: num(down),
      years: num(years),
      promoRate: num(promoRate) / 100,
      promoMonths: num(promoMonths),
      afterRate: num(afterRate) / 100,
      extraPayment: num(extra),
    });
  } catch (e) {
    error = (e as Error).message;
  }

  // ตารางเต็ม 360 แถวอ่านไม่ไหว — สรุปเป็นรายปีแทน โดยเก็บงวดสุดท้ายของแต่ละปี
  const yearly = result
    ? result.rows.filter((r) => r.period % 12 === 0 || r.period === result!.months)
    : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NumberInput id="price" label="ราคาบ้าน" mode="decimal" value={price} onValueChange={setPrice} suffix="บาท" />
        <NumberInput id="down" label="เงินดาวน์" mode="decimal" value={down} onValueChange={setDown} suffix="บาท" />
        <NumberInput id="years" label="ระยะเวลาผ่อน" mode="numeric" value={years} onValueChange={setYears} suffix="ปี" />
        <NumberInput
          id="promo-rate"
          label="ดอกเบี้ยช่วงโปรโมชัน"
          mode="decimal"
          value={promoRate}
          onValueChange={setPromoRate}
          suffix="% ต่อปี"
          hint="อัตราเฉลี่ยของ 3 ปีแรกตามที่แบงก์เสนอ"
        />
        <NumberInput id="promo-months" label="โปรโมชันนานกี่เดือน" mode="numeric" value={promoMonths} onValueChange={setPromoMonths} suffix="เดือน" />
        <NumberInput
          id="after-rate"
          label="ดอกเบี้ยหลังหมดโปรโมชัน"
          mode="decimal"
          value={afterRate}
          onValueChange={setAfterRate}
          suffix="% ต่อปี"
          hint="มักอ้างอิง MRR ลบส่วนลด ดูจากสัญญาหรือสอบถามแบงก์"
        />
        <NumberInput
          id="extra"
          label="ผ่อนเพิ่มต่อเดือน"
          mode="decimal"
          value={extra}
          onValueChange={setExtra}
          suffix="บาท"
          hint="ใส่ 0 ถ้าผ่อนตามค่างวดขั้นต่ำ"
          error={error || undefined}
        />
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {result && (
        <>
          <ResultBox label="ค่างวดต่อเดือน">{formatBaht(result.payment)} บาท</ResultBox>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="ยอดกู้" value={`${formatBaht(result.principal)} บาท`} />
            <Stat label="ดอกเบี้ยรวมตลอดสัญญา" value={`${formatBaht(result.totalInterest)} บาท`} />
            <Stat label="จ่ายรวมทั้งหมด" value={`${formatBaht(result.totalPaid)} บาท`} />
            <Stat label="ผ่อนจริง" value={`${result.months} งวด (${formatNumber(result.months / 12, 1)} ปี)`} />
          </div>

          <Disclaimer>
            รายได้ที่แบงก์มักขอสำหรับค่างวดนี้อยู่ราว {formatBaht(result.suggestedIncome)} บาทต่อเดือน
            เพราะโดยทั่วไปให้ภาระผ่อนทุกก้อนรวมกันไม่เกิน 40% ของรายได้ — เป็นเกณฑ์คร่าว ๆ ที่แต่ละแบงก์ใช้ไม่เท่ากัน
          </Disclaimer>

          {result.monthsSaved > 0 && (
            <p className="rounded-[10px] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              ดอกเบี้ยที่ต่ำในช่วงโปรโมชันทำให้ตัดเงินต้นได้มากกว่าปกติ จึงผ่อนหมดเร็วกว่ากำหนด {result.monthsSaved} งวด
              {result.interestSaved > 0 && ` และประหยัดดอกเบี้ยได้ ${formatBaht(result.interestSaved)} บาทจากการผ่อนเพิ่ม`}
            </p>
          )}

          <div>
            <h2 className="mb-2 text-base font-semibold text-slate-900">สรุปรายปี</h2>
            <DataTable
              caption="ยอดคงเหลือและดอกเบี้ยที่จ่ายในแต่ละปี"
              columns={[
                { key: 'year', header: 'สิ้นปีที่', align: 'right', render: (r) => String(Math.ceil(r.period / 12)) },
                { key: 'rate', header: 'ดอกเบี้ย', align: 'right', render: (r) => `${formatNumber(r.annualRate * 100, 2)}%` },
                { key: 'payment', header: 'ค่างวด', align: 'right', render: (r) => formatBaht(r.payment) },
                { key: 'interest', header: 'ดอกเบี้ยงวดนั้น', align: 'right', render: (r) => formatBaht(r.interest) },
                { key: 'balance', header: 'ยอดคงเหลือ', align: 'right', render: (r) => formatBaht(r.balance) },
              ]}
              rows={yearly}
              rowKey={(r) => String(r.period)}
            />
          </div>
        </>
      )}
    </div>
  );
}
