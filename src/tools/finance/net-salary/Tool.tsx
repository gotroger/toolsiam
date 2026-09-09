import { useState } from 'react';
import { useTodayInBangkok } from '@/lib/use-today';
import { calculateNetSalary } from './logic';
import { formatBaht, formatNumber } from '@/lib/format';
import { Checkbox, ErrorText, NumberInput, ResultBox, Stat } from '@/components/ui';
import { getToolUrl } from '@/lib/routes';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return n;
};

export default function NetSalaryTool() {
  const [salary, setSalary] = useState('30000');
  const [bonus, setBonus] = useState('0');
  const [otherIncome, setOtherIncome] = useState('0');
  const [sso, setSso] = useState(true);
  const [spouse, setSpouse] = useState(false);
  const [children, setChildren] = useState('0');
  const [parents, setParents] = useState('0');
  const [health, setHealth] = useState('0');
  const [rmf, setRmf] = useState('0');
  const [pvd, setPvd] = useState('0');
  const [pension, setPension] = useState('0');
  const [life, setLife] = useState('0');
  const [retirement, setRetirement] = useState('0');
  const [homeLoan, setHomeLoan] = useState('0');
  const [other, setOther] = useState('0');

  // เพดานประกันสังคมขึ้นกับวันที่ จึงต้องอิงวันไทย ไม่ใช่เครื่องผู้ใช้ (§27 D2)
  const asOf = useTodayInBangkok();

  let result: ReturnType<typeof calculateNetSalary> | null = null;
  let error = '';
  if (asOf !== '') {
    try {
      result = calculateNetSalary({
        monthlySalary: num(salary),
        bonus: num(bonus),
        otherIncome: num(otherIncome),
        hasSocialSecurity: sso,
        hasSpouseNoIncome: spouse,
        children: num(children),
        parents: num(parents),
        lifeInsurance: num(life),
        healthInsurance: num(health),
        rmf: num(rmf),
        providentFund: num(pvd),
        pensionInsurance: num(pension),
        retirementFunds: num(retirement),
        homeLoanInterest: num(homeLoan),
        otherDeductions: num(other),
        asOf,
      });
    } catch (e) {
      error = (e as Error).message;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-base font-medium text-slate-900">รายได้</h2>
        <p className="mb-3 text-sm text-slate-600">
          ประมาณการปีภาษี {asOf ? Number(asOf.slice(0, 4)) + 543 : '…'} สำหรับเงินเดือนมาตรา 40(1) คงที่ 12 เดือน;
          ภาษีรายเดือนเฉลี่ยจากทั้งปี
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberInput
            id="salary"
            label="เงินเดือน"
            mode="decimal"
            value={salary}
            onValueChange={setSalary}
            suffix="บาท/เดือน"
          />
          <NumberInput
            id="bonus"
            label="โบนัสทั้งปี"
            mode="decimal"
            value={bonus}
            onValueChange={setBonus}
            suffix="บาท"
          />
          <NumberInput
            id="other-income"
            label="รายได้เสริมทั้งปี"
            mode="decimal"
            value={otherIncome}
            onValueChange={setOtherIncome}
            suffix="บาท"
            hint="ค่าล่วงเวลา ค่าคอมมิชชั่น เบี้ยขยัน"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-base font-medium text-slate-900">ค่าลดหย่อน</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberInput
            id="children"
            label="จำนวนบุตร"
            mode="numeric"
            value={children}
            onValueChange={setChildren}
            suffix="คน"
          />
          <NumberInput
            id="parents"
            label="บิดามารดาที่อุปการะ"
            mode="numeric"
            value={parents}
            onValueChange={setParents}
            suffix="คน"
            hint="อายุ 60 ปีขึ้นไป รายได้ไม่เกิน 30,000/ปี ใช้สิทธิไม่ซ้ำพี่น้อง; สูงสุด 2 หรือ 4 เมื่อคู่สมรสไม่มีเงินได้"
          />
          <NumberInput
            id="life"
            label="เบี้ยประกันชีวิตทั้งปี"
            mode="decimal"
            value={life}
            onValueChange={setLife}
            suffix="บาท"
          />
          <NumberInput
            id="health"
            label="เบี้ยประกันสุขภาพทั้งปี"
            mode="decimal"
            value={health}
            onValueChange={setHealth}
            suffix="บาท"
            hint="สูงสุด 25,000; รวมประกันชีวิตไม่เกิน 100,000"
          />
          <NumberInput
            id="rmf"
            label="ค่าซื้อ RMF"
            mode="decimal"
            value={rmf}
            onValueChange={setRmf}
            suffix="บาท"
            hint="สูงสุด 30% ของเงินได้; รวมกลุ่มเกษียณไม่เกิน 500,000"
          />
          <NumberInput
            id="pvd"
            label="เงินสะสม PVD ของลูกจ้าง"
            mode="decimal"
            value={pvd}
            onValueChange={setPvd}
            suffix="บาท"
            hint="ไม่เกิน 15% ของค่าจ้าง; ไม่รวมเงินสมทบนายจ้าง"
          />
          <NumberInput
            id="pension"
            label="เบี้ยประกันบำนาญส่วนใช้สิทธิเกษียณ"
            mode="decimal"
            value={pension}
            onValueChange={setPension}
            suffix="บาท"
            hint="ไม่เกิน 15% สูงสุด 200,000; ไม่ซ้ำสิทธิประกันชีวิต"
          />
          <NumberInput
            id="retirement"
            label="สิทธิลดหย่อนกองทุนเกษียณอื่นที่ตรวจแล้ว"
            mode="decimal"
            value={retirement}
            onValueChange={setRetirement}
            suffix="บาท"
            hint="กบข./กอช. หลังตรวจเพดานรายประเภท; ไม่ซ้ำ 3 ช่องก่อนหน้า; รวมกลุ่มเกษียณไม่เกิน 500,000; ไม่รวม SSF ซื้อใหม่"
          />
          <NumberInput
            id="home-loan"
            label="ดอกเบี้ยบ้านทั้งปี"
            mode="decimal"
            value={homeLoan}
            onValueChange={setHomeLoan}
            suffix="บาท"
          />
          <NumberInput
            id="other"
            label="ค่าลดหย่อนอื่นทั้งปี"
            mode="decimal"
            value={other}
            onValueChange={setOther}
            suffix="บาท"
            hint="รวมมาตรการชั่วคราวของปีภาษีนี้ที่คุณมีสิทธิ"
          />
          <div className="space-y-2 self-end sm:col-span-2">
            <Checkbox label="ส่งประกันสังคม (มาตรา 33)" checked={sso} onChange={(e) => setSso(e.target.checked)} />
            <Checkbox label="มีคู่สมรสที่ไม่มีเงินได้" checked={spouse} onChange={(e) => setSpouse(e.target.checked)} />
          </div>
        </div>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {result && (
        <>
          <ResultBox label="รับสุทธิต่อเดือน">{formatBaht(result.netMonthly)} บาท</ResultBox>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="หักประกันสังคม/เดือน" value={`${formatBaht(result.ssoMonthly)} บาท`} />
            <Stat label="หักภาษี/เดือน" value={`${formatBaht(result.monthlyTax)} บาท`} />
            <Stat label="เงินได้ทั้งปี" value={`${formatBaht(result.annualIncome)} บาท`} />
            <Stat label="รับสุทธิทั้งปี" value={`${formatBaht(result.netYearly)} บาท`} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="หักค่าใช้จ่าย" value={`${formatBaht(result.expense)} บาท`} />
            <Stat label="ค่าลดหย่อนรวม" value={`${formatBaht(result.allowances)} บาท`} />
            <Stat label="เงินได้สุทธิที่ใช้คิดภาษี" value={`${formatBaht(result.netIncome)} บาท`} />
            <Stat label="อัตราภาษีที่แท้จริง" value={`${formatNumber(result.effectiveRate * 100, 2)}%`} />
          </div>

          <p className="text-sm text-slate-600">
            ดูรายละเอียดภาษีแบบเต็มรวมเงินบริจาคและภาษีที่ถูกหักไว้แล้ว ใช้{' '}
            <a
              href={getToolUrl('thai-income-tax')}
              className="text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              เครื่องมือคำนวณภาษีเงินได้
            </a>{' '}
            หรือดูเงินสมทบทุกมาตราที่{' '}
            <a
              href={getToolUrl('social-security')}
              className="text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              เครื่องมือคำนวณประกันสังคม
            </a>
          </p>
        </>
      )}
    </div>
  );
}
