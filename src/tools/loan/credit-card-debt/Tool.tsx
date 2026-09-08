import { useState } from 'react';
import { comparePayments, minimumPayment, MINIMUM_PAYMENT_RATE, payoffSchedule } from './logic';
import { DataTable, Disclaimer, ErrorText, NumberInput, ResultBox, Stat } from '@/components/ui';
import { formatBaht, formatNumber } from '@/lib/format';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

/** แปลงจำนวนเดือนเป็นข้อความ "X ปี Y เดือน" ที่คนอ่านแล้วรู้สึกถึงระยะเวลาจริง */
function humanMonths(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} เดือน`;
  return m === 0 ? `${y} ปี` : `${y} ปี ${m} เดือน`;
}

export default function CreditCardDebtTool() {
  const [balance, setBalance] = useState('100000');
  const [rate, setRate] = useState('16');
  const [payment, setPayment] = useState('5000');

  const bal = num(balance);
  const annualRate = num(rate) / 100;
  const minPay = Number.isFinite(bal) ? minimumPayment(Math.max(0, bal)) : 0;

  let error = '';
  let result: ReturnType<typeof payoffSchedule> | null = null;
  try {
    result = payoffSchedule(bal, annualRate, num(payment));
  } catch (e) {
    error = (e as Error).message;
  }

  // เรียงจากน้อยไปมากและตัดค่าซ้ำ เพื่อให้ตารางอ่านเป็นลำดับ "จ่ายเพิ่มแล้วดีขึ้นแค่ไหน" จริง ๆ
  const candidates = [...new Set(
    [minPay, num(payment), num(payment) * 1.5, num(payment) * 2]
      .filter((p) => Number.isFinite(p) && p > 0)
      .map((p) => Math.round(p * 100) / 100),
  )].sort((a, b) => a - b);

  const options = Number.isFinite(bal) && Number.isFinite(annualRate) && bal > 0
    ? comparePayments(bal, annualRate, candidates)
    : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberInput id="balance" label="ยอดหนี้คงเหลือ" mode="decimal" value={balance} onValueChange={setBalance} suffix="บาท" />
        <NumberInput
          id="rate"
          label="ดอกเบี้ยและค่าธรรมเนียมรวม"
          mode="decimal"
          value={rate}
          onValueChange={setRate}
          suffix="% ต่อปี"
          hint="ดูจากใบแจ้งยอด — บัตรเครดิตและสินเชื่อส่วนบุคคลคิดคนละอัตรา"
        />
        <NumberInput
          id="payment"
          label="ตั้งใจจ่ายเดือนละ"
          mode="decimal"
          value={payment}
          onValueChange={setPayment}
          suffix="บาท"
          hint={minPay > 0 ? `ขั้นต่ำโดยทั่วไปราว ${formatBaht(minPay)} บาท` : undefined}
        />
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {result && (
        <>
          <ResultBox label="ปลดหนี้ได้ใน">
            {humanMonths(result.months)} ({result.months} งวด)
          </ResultBox>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="ดอกเบี้ยที่ต้องจ่ายรวม" value={`${formatBaht(result.totalInterest)} บาท`} />
            <Stat label="จ่ายรวมทั้งหมด" value={`${formatBaht(result.totalPaid)} บาท`} />
            <Stat
              label="ดอกเบี้ยคิดเป็น"
              value={`${formatNumber((result.totalInterest / bal) * 100, 1)}% ของยอดหนี้`}
            />
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-slate-900">จ่ายเพิ่มแล้วต่างกันแค่ไหน</h2>
            <DataTable
              caption="เปรียบเทียบระยะเวลาปลดหนี้และดอกเบี้ยรวมตามยอดที่จ่ายต่อเดือน"
              columns={[
                { key: 'pay', header: 'จ่ายเดือนละ', align: 'right', render: (o) => formatBaht(o.monthlyPayment) },
                { key: 'months', header: 'ปลดหนี้ใน', align: 'right', render: (o) => (o.feasible ? humanMonths(o.months) : 'ไม่มีวันหมด') },
                { key: 'interest', header: 'ดอกเบี้ยรวม', align: 'right', render: (o) => (o.feasible ? formatBaht(o.totalInterest) : '—') },
                { key: 'total', header: 'จ่ายรวม', align: 'right', render: (o) => (o.feasible ? formatBaht(o.totalPaid) : '—') },
              ]}
              rows={options}
              rowKey={(o) => String(o.monthlyPayment)}
            />
          </div>
        </>
      )}

      {error && (
        <Disclaimer>
          เมื่อยอดที่จ่ายต่อเดือนน้อยกว่าดอกเบี้ยที่เกิดขึ้น ยอดหนี้จะเพิ่มขึ้นทุกเดือนแม้จ่ายตรงเวลา
          การจ่ายขั้นต่ำอย่างเดียว (ราว {(MINIMUM_PAYMENT_RATE * 100).toFixed(0)}% ของยอดคงเหลือ)
          ทำให้ปลดหนี้ช้ามาก เพราะยอดขั้นต่ำลดลงตามยอดหนี้ที่เหลือไปด้วย
        </Disclaimer>
      )}
    </div>
  );
}
