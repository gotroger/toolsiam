import { useEffect, useState } from 'react';
import { calculateNetSalary } from './logic';
import { formatBaht, formatNumber } from '@/lib/format';
import { Checkbox, ErrorText, NumberInput, ResultBox, Stat } from '@/components/ui';
import { todayInBangkok } from '@/lib/today';
import { getToolUrl } from '@/lib/routes';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export default function NetSalaryTool() {
  const [salary, setSalary] = useState('30000');
  const [bonus, setBonus] = useState('0');
  const [otherIncome, setOtherIncome] = useState('0');
  const [sso, setSso] = useState(true);
  const [spouse, setSpouse] = useState(false);
  const [children, setChildren] = useState('0');
  const [parents, setParents] = useState('0');
  const [life, setLife] = useState('0');
  const [retirement, setRetirement] = useState('0');
  const [homeLoan, setHomeLoan] = useState('0');
  const [other, setOther] = useState('0');
  const [asOf, setAsOf] = useState('');

  // เพดานประกันสังคมขึ้นกับวันที่ จึงต้องอิงวันไทย ไม่ใช่เครื่องผู้ใช้ (§27 D2)
  useEffect(() => { setAsOf(todayInBangkok()); }, []);

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
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberInput id="salary" label="เงินเดือน" mode="decimal" value={salary} onValueChange={setSalary} suffix="บาท/เดือน" />
          <NumberInput id="bonus" label="โบนัสทั้งปี" mode="decimal" value={bonus} onValueChange={setBonus} suffix="บาท" />
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
          <NumberInput id="children" label="จำนวนบุตร" mode="numeric" value={children} onValueChange={setChildren} suffix="คน" />
          <NumberInput
            id="parents"
            label="บิดามารดาที่อุปการะ"
            mode="numeric"
            value={parents}
            onValueChange={setParents}
            suffix="คน"
            hint="สูงสุด 4 คน (ของตัวเองและคู่สมรส)"
          />
          <NumberInput id="life" label="เบี้ยประกันชีวิต/สุขภาพทั้งปี" mode="decimal" value={life} onValueChange={setLife} suffix="บาท" />
          <NumberInput
            id="retirement"
            label="กองทุนเพื่อเกษียณทั้งปี"
            mode="decimal"
            value={retirement}
            onValueChange={setRetirement}
            suffix="บาท"
            hint="RMF, SSF, กองทุนสำรองเลี้ยงชีพ, กบข."
          />
          <NumberInput id="home-loan" label="ดอกเบี้ยบ้านทั้งปี" mode="decimal" value={homeLoan} onValueChange={setHomeLoan} suffix="บาท" />
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

          {result.ssoYearly > result.ssoDeductible && (
            <p className="rounded-[10px] border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              ส่งประกันสังคมทั้งปี {formatBaht(result.ssoYearly)} บาท แต่ใช้ลดหย่อนภาษีได้ {formatBaht(result.ssoDeductible)} บาท
              ตามเพดานที่กรมสรรพากรประกาศไว้ — เพดานเงินสมทบขึ้นแล้วในปี 2569 แต่ยังไม่พบเอกสารว่าเพดานลดหย่อนถูกปรับตาม
            </p>
          )}

          <p className="text-sm text-slate-600">
            ดูรายละเอียดภาษีแบบเต็มรวมเงินบริจาคและภาษีที่ถูกหักไว้แล้ว ใช้{' '}
            <a href={getToolUrl('thai-income-tax')} className="text-brand-700 underline underline-offset-2 hover:text-brand-800">
              เครื่องมือคำนวณภาษีเงินได้
            </a>{' '}
            หรือดูเงินสมทบทุกมาตราที่{' '}
            <a href={getToolUrl('social-security')} className="text-brand-700 underline underline-offset-2 hover:text-brand-800">
              เครื่องมือคำนวณประกันสังคม
            </a>
          </p>
        </>
      )}
    </div>
  );
}
