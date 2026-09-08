import { useState } from 'react';
import { calculateNetSalary } from './logic';
import { formatBaht } from '@/lib/format';
import { ErrorText, Field, Input, Stat } from '@/components/ui';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export default function NetSalaryTool() {
  const [salary, setSalary] = useState('30000');
  const [bonus, setBonus] = useState('0');
  const [sso, setSso] = useState(true);
  const [spouse, setSpouse] = useState(false);
  const [children, setChildren] = useState('0');
  const [parents, setParents] = useState('0');
  const [other, setOther] = useState('0');

  let result: ReturnType<typeof calculateNetSalary> | null = null;
  let error = '';
  try {
    result = calculateNetSalary({
      monthlySalary: num(salary),
      bonus: num(bonus),
      hasSocialSecurity: sso,
      hasSpouseNoIncome: spouse,
      children: num(children),
      parents: num(parents),
      otherDeductions: num(other),
    });
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="เงินเดือน (บาท/เดือน)" htmlFor="salary">
          <Input id="salary" inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value)} />
        </Field>
        <Field label="โบนัส/เงินได้อื่นทั้งปี (บาท)" htmlFor="bonus">
          <Input id="bonus" inputMode="decimal" value={bonus} onChange={(e) => setBonus(e.target.value)} />
        </Field>
        <Field label="จำนวนบุตร" htmlFor="children">
          <Input id="children" inputMode="numeric" value={children} onChange={(e) => setChildren(e.target.value)} />
        </Field>
        <Field label="บิดามารดาที่อุปการะ (สูงสุด 4)" htmlFor="parents">
          <Input id="parents" inputMode="numeric" value={parents} onChange={(e) => setParents(e.target.value)} />
        </Field>
        <Field label="ค่าลดหย่อนอื่นทั้งปี (บาท)" htmlFor="other" hint="ประกันชีวิต กองทุน ดอกเบี้ยบ้าน ฯลฯ">
          <Input id="other" inputMode="decimal" value={other} onChange={(e) => setOther(e.target.value)} />
        </Field>
        <div className="space-y-2 self-end">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sso} onChange={(e) => setSso(e.target.checked)} className="size-4" />
            ส่งประกันสังคม (มาตรา 33)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={spouse} onChange={(e) => setSpouse(e.target.checked)} className="size-4" />
            มีคู่สมรสที่ไม่มีเงินได้
          </label>
        </div>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {result && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="รับสุทธิต่อเดือน" value={`${formatBaht(result.netMonthly)} บาท`} />
            <Stat label="หักประกันสังคม/เดือน" value={`${formatBaht(result.ssoMonthly)} บาท`} />
            <Stat label="หักภาษี/เดือน" value={`${formatBaht(result.monthlyTax)} บาท`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="เงินได้ทั้งปี" value={`${formatBaht(result.annualIncome)} บาท`} />
            <Stat label="ภาษีทั้งปี" value={`${formatBaht(result.annualTax)} บาท`} />
            <Stat label="อัตราภาษีที่แท้จริง" value={`${(result.effectiveRate * 100).toFixed(2)}%`} />
          </div>
          <p className="text-xs text-slate-500">
            ตัวเลขเป็นการประมาณตามอัตราภาษีปีภาษี 2568 ยอดจริงบนสลิปอาจต่างออกไปตามรายการหักของนายจ้าง
          </p>
        </>
      )}
    </div>
  );
}
