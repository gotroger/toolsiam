import { useState } from 'react';
import { effectiveToFlat, flatToEffective, fromPayment } from './logic';
import { Disclaimer, ErrorText, NumberInput, ResultBox, Stat, Tabs, TabPanel } from '@/components/ui';
import { formatBaht, formatNumber } from '@/lib/format';

const ID = 'rate';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

export default function FlatEffectiveRateTool() {
  const [tab, setTab] = useState('flat');
  const [principal, setPrincipal] = useState('640000');
  const [months, setMonths] = useState('60');
  const [flatRate, setFlatRate] = useState('2.99');
  const [effRate, setEffRate] = useState('5.62');
  const [payment, setPayment] = useState('12261.33');

  let error = '';
  let result: ReturnType<typeof flatToEffective> | null = null;
  try {
    const p = num(principal);
    const m = num(months);
    if (tab === 'flat') result = flatToEffective(p, num(flatRate) / 100, m);
    else if (tab === 'effective') result = effectiveToFlat(p, num(effRate) / 100, m);
    else result = fromPayment(p, num(payment), m);
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberInput id="principal" label="ยอดจัด / เงินต้น" mode="decimal" value={principal} onValueChange={setPrincipal} suffix="บาท" />
        <NumberInput id="months" label="จำนวนงวด" mode="numeric" value={months} onValueChange={setMonths} suffix="งวด" />
      </div>

      <Tabs
        idPrefix={ID}
        label="ทิศทางการแปลงอัตรา"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'flat', label: 'จากคงที่ → ลดต้นลดดอก' },
          { id: 'effective', label: 'จากลดต้นลดดอก → คงที่' },
          { id: 'payment', label: 'จากค่างวดที่เขาเสนอ' },
        ]}
      />

      <TabPanel id="flat" idPrefix={ID} active={tab === 'flat'}>
        <NumberInput id="flat-rate" label="ดอกเบี้ยคงที่" mode="decimal" value={flatRate} onValueChange={setFlatRate} suffix="% ต่อปี" />
      </TabPanel>
      <TabPanel id="effective" idPrefix={ID} active={tab === 'effective'}>
        <NumberInput id="eff-rate" label="ดอกเบี้ยลดต้นลดดอก" mode="decimal" value={effRate} onValueChange={setEffRate} suffix="% ต่อปี" />
      </TabPanel>
      <TabPanel id="payment" idPrefix={ID} active={tab === 'payment'}>
        <NumberInput
          id="payment"
          label="ค่างวดที่เสนอมา"
          mode="decimal"
          value={payment}
          onValueChange={setPayment}
          suffix="บาท/เดือน"
          hint="กรอกค่างวดจากใบเสนอ แล้วดูว่าอัตราจริงเป็นเท่าไหร่ทั้งสองแบบ"
        />
      </TabPanel>

      {error && <ErrorText>{error}</ErrorText>}

      {result && !error && (
        <>
          <ResultBox label="อัตราที่เทียบเท่ากัน">
            คงที่ {formatNumber(result.flatRate * 100, 2)}% ต่อปี = ลดต้นลดดอก {formatNumber(result.effectiveRate * 100, 2)}% ต่อปี
          </ResultBox>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="ค่างวดต่อเดือน" value={`${formatBaht(result.payment)} บาท`} />
            <Stat label="ดอกเบี้ยรวม" value={`${formatBaht(result.totalInterest)} บาท`} />
            <Stat label="จ่ายรวมทั้งหมด" value={`${formatBaht(result.totalPaid)} บาท`} />
            <Stat label="ต่างกัน" value={result.multiple > 0 ? `${formatNumber(result.multiple, 2)} เท่า` : '—'} />
          </div>

          <Disclaimer>
            อัตราคงที่คิดดอกเบี้ยจากเงินต้นเต็มจำนวนตลอดสัญญา ส่วนลดต้นลดดอกคิดจากเงินต้นที่เหลือจริง
            ตัวเลขบนป้ายจึงเทียบกันตรง ๆ ไม่ได้ ยิ่งผ่อนนานส่วนต่างยิ่งกว้าง — ใช้อัตราลดต้นลดดอกเป็นตัวเทียบเสมอ
            เวลาเลือกระหว่างสินเชื่อคนละประเภท
          </Disclaimer>
        </>
      )}
    </div>
  );
}
