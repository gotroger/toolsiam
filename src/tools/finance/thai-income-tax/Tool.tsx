import { useMemo, useState } from 'react';
import { calculateTax, type TaxInput } from './logic';
import { Field, Input, Stat } from '@/components/ui';
import { formatBaht } from '@/lib/format';

type NumKey = Exclude<keyof TaxInput, 'hasSpouseNoIncome'>;
type Form = Record<NumKey, string> & { hasSpouseNoIncome: boolean };

const fields: { key: NumKey; label: string; hint?: string }[] = [
  { key: 'annualIncome', label: 'เงินได้รวมทั้งปี (บาท)', hint: 'เงินเดือน × 12 + โบนัส + ค่าคอมมิชชัน' },
  { key: 'children', label: 'จำนวนบุตร (30,000/คน)' },
  { key: 'childrenBorn2018Plus', label: 'บุตรคนที่ 2+ เกิดตั้งแต่ปี 2561 (60,000/คน)' },
  { key: 'parents', label: 'อุปการะบิดามารดา (คน, สูงสุด 4)' },
  { key: 'socialSecurity', label: 'ประกันสังคมที่จ่ายทั้งปี', hint: 'สูงสุด 9,000' },
  { key: 'lifeInsurance', label: 'เบี้ยประกันชีวิต', hint: 'สูงสุด 100,000' },
  { key: 'healthInsurance', label: 'เบี้ยประกันสุขภาพ', hint: 'สูงสุด 25,000 (รวมกับประกันชีวิตไม่เกิน 100,000)' },
  { key: 'retirementFunds', label: 'กองทุนสำรองเลี้ยงชีพ (PVD) + RMF + ประกันบำนาญ + กบข./กอช.', hint: 'รวมสูงสุด 500,000 (SSF ใช้ไม่ได้แล้วในปีภาษี 2568)' },
  { key: 'thaiEsg', label: 'Thai ESG / ESGX', hint: 'สูงสุด 300,000 แยกจากกองทุนเกษียณ' },
  { key: 'homeLoanInterest', label: 'ดอกเบี้ยกู้บ้าน', hint: 'สูงสุด 100,000' },
  { key: 'donations', label: 'เงินบริจาค', hint: 'ไม่เกิน 10% ของเงินได้หลังหักลดหย่อน' },
  { key: 'otherDeductions', label: 'ลดหย่อนอื่น ๆ (Easy E-Receipt ฯลฯ)' },
  { key: 'withheldTax', label: 'ภาษีหัก ณ ที่จ่ายแล้ว (จาก 50 ทวิ)' },
];

const initial: Form = {
  annualIncome: '600000', children: '0', childrenBorn2018Plus: '0', parents: '0', socialSecurity: '9000',
  lifeInsurance: '0', healthInsurance: '0', retirementFunds: '0', thaiEsg: '0', homeLoanInterest: '0', donations: '0',
  otherDeductions: '0', withheldTax: '0', hasSpouseNoIncome: false,
};

export default function ThaiIncomeTaxTool() {
  const [form, setForm] = useState<Form>(initial);

  const result = useMemo(() => {
    const input = Object.fromEntries(fields.map((f) => [f.key, Number(form[f.key].replace(/,/g, '')) || 0])) as Record<NumKey, number>;
    try {
      return { ok: true as const, value: calculateTax({ ...input, hasSpouseNoIncome: form.hasSpouseNoIncome }) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [form]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-3">
        {fields.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={f.key} hint={f.hint}>
            <Input id={f.key} inputMode="decimal" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
          </Field>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.hasSpouseNoIncome} onChange={(e) => setForm({ ...form, hasSpouseNoIncome: e.target.checked })} />
          คู่สมรสไม่มีเงินได้ (ลดหย่อน 60,000)
        </label>
      </div>

      <div className="space-y-4">
        {!result.ok && <p className="text-sm text-red-600">{result.error}</p>}
        {result.ok && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label="ภาษีที่ต้องเสีย" value={`${formatBaht(result.value.tax)} บาท`} />
              <Stat label={result.value.balance >= 0 ? 'ต้องชำระเพิ่ม' : 'ได้คืน'} value={`${formatBaht(Math.abs(result.value.balance))} บาท`} />
              <Stat label="เงินได้สุทธิ" value={`${formatBaht(result.value.netIncome)} บาท`} />
              <Stat label="อัตราภาษีเฉลี่ย" value={`${(result.value.effectiveRate * 100).toFixed(2)}%`} />
            </div>
            <ul className="space-y-1 text-sm text-slate-600">
              <li>หักค่าใช้จ่าย {formatBaht(result.value.expense)} บาท</li>
              <li>ค่าลดหย่อนรวม {formatBaht(result.value.allowances)} บาท</li>
              <li>เงินบริจาคที่ใช้ได้ {formatBaht(result.value.donationUsed)} บาท</li>
            </ul>
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr><th className="px-2 py-1">ขั้นเงินได้สุทธิ</th><th className="px-2 py-1">อัตรา</th><th className="px-2 py-1">ภาษี</th></tr>
              </thead>
              <tbody>
                {result.value.lines.map((l) => (
                  <tr key={l.from} className="border-t border-slate-100">
                    <td className="px-2 py-1">{formatBaht(l.from)} – {l.to === Infinity ? 'ขึ้นไป' : formatBaht(l.to)}</td>
                    <td className="px-2 py-1">{l.rate * 100}%</td>
                    <td className="px-2 py-1">{formatBaht(l.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
