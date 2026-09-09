import { useMemo, useState } from 'react';
import { calculateTax, type TaxInput } from './logic';
import { Checkbox, DataTable, ErrorText, Field, Input, Select, Stat } from '@/components/ui';
import { formatBaht } from '@/lib/format';

type NumKey = Exclude<keyof TaxInput, 'hasSpouseNoIncome' | 'taxYear'>;
type TaxFormState = Record<NumKey, string> & { hasSpouseNoIncome: boolean };

const fields: { key: NumKey; label: string; hint?: string }[] = [
  { key: 'annualIncome', label: 'เงินได้รวมทั้งปี (บาท)', hint: 'เงินเดือน × 12 + โบนัส + ค่าคอมมิชชัน' },
  {
    key: 'children',
    label: 'บุตรกลุ่มสิทธิ 30,000 บาท/คน',
    hint: 'ไม่รวมบุตรที่กรอกในช่อง 60,000 บาท; บุตรต้องเข้าเงื่อนไขอายุ/การศึกษาและรายได้',
  },
  {
    key: 'childrenBorn2018Plus',
    label: 'บุตรคนที่ 2+ เกิดตั้งแต่ปี 2561 (60,000/คน)',
    hint: 'เฉพาะบุตรชอบด้วยกฎหมายที่เข้าเงื่อนไข ห้ามนับซ้ำกับช่องก่อนหน้า',
  },
  {
    key: 'parents',
    label: 'อุปการะบิดามารดา',
    hint: 'อายุ 60 ปีขึ้นไป รายได้ไม่เกิน 30,000 บาท/ปี ใช้สิทธิไม่ซ้ำพี่น้อง; สูงสุด 2 คน หรือ 4 เมื่อคู่สมรสไม่มีเงินได้',
  },
  {
    key: 'socialSecurity',
    label: 'ประกันสังคมที่จ่ายทั้งปี',
    hint: 'จ่ายจริงตามกฎหมาย; ปี 2568 สูงสุด 9,000 / ปี 2569 สูงสุด 10,500 บาท',
  },
  { key: 'lifeInsurance', label: 'เบี้ยประกันชีวิต', hint: 'สูงสุด 100,000' },
  { key: 'healthInsurance', label: 'เบี้ยประกันสุขภาพ', hint: 'สูงสุด 25,000 (รวมกับประกันชีวิตไม่เกิน 100,000)' },
  { key: 'rmf', label: 'ค่าซื้อ RMF', hint: 'ไม่เกิน 30% ของเงินได้ และรวมกลุ่มเกษียณไม่เกิน 500,000 บาท' },
  { key: 'providentFund', label: 'เงินสะสม PVD ของลูกจ้าง', hint: 'ไม่เกิน 15% ของค่าจ้าง; ไม่รวมเงินสมทบนายจ้าง' },
  {
    key: 'pensionInsurance',
    label: 'เบี้ยประกันบำนาญส่วนใช้สิทธิเกษียณ',
    hint: 'ไม่เกิน 15% ของเงินได้ สูงสุด 200,000; ห้ามซ้ำส่วนที่ใช้สิทธิประกันชีวิต 100,000',
  },
  {
    key: 'retirementFunds',
    label: 'สิทธิลดหย่อนกองทุนเกษียณอื่นที่ตรวจแล้ว',
    hint: 'เช่น กบข./กอช. หลังจำกัดเพดานรายประเภท; ไม่รวม 3 ช่องก่อนหน้า; ทุกช่องรวมไม่เกิน 500,000; ไม่รวม SSF ซื้อใหม่',
  },
  {
    key: 'thaiEsg',
    label: 'ค่าซื้อ Thai ESG',
    hint: 'ไม่เกิน 30% ของเงินได้ สูงสุด 300,000; เฉพาะซื้อปี 2568–2569 และถือครบเงื่อนไข 5 ปี; ไม่รวม ESGX',
  },
  { key: 'homeLoanInterest', label: 'ดอกเบี้ยกู้บ้าน', hint: 'สูงสุด 100,000' },
  {
    key: 'doubleDonations',
    label: 'เงินบริจาคที่มีสิทธิ 2 เท่า (ยอดจ่ายจริง)',
    hint: 'เฉพาะรายการที่เข้าเงื่อนไขและมีหลักฐาน/e-Donation ตามปีภาษี; ระบบคูณ 2 แล้วจำกัด 10%',
  },
  {
    key: 'donations',
    label: 'เงินบริจาคทั่วไป',
    hint: 'ไม่เกิน 10% ของยอดหลังหักเงินบริจาคสิทธิ 2 เท่าแล้ว; ไม่กรอกซ้ำ',
  },
  {
    key: 'otherDeductions',
    label: 'สิทธิลดหย่อนอื่นที่ตรวจแล้ว',
    hint: 'กรอกยอดหลังตรวจเงื่อนไขและเพดานของปีที่เลือก เช่น ESGX/Easy E-Receipt; ห้ามซ้ำรายการข้างต้น',
  },
  { key: 'withheldTax', label: 'ภาษีหัก ณ ที่จ่ายแล้ว (จาก 50 ทวิ)' },
];

const initial: TaxFormState = {
  rmf: '0',
  providentFund: '0',
  pensionInsurance: '0',
  doubleDonations: '0',
  annualIncome: '600000',
  children: '0',
  childrenBorn2018Plus: '0',
  parents: '0',
  socialSecurity: '9000',
  lifeInsurance: '0',
  healthInsurance: '0',
  retirementFunds: '0',
  thaiEsg: '0',
  homeLoanInterest: '0',
  donations: '0',
  otherDeductions: '0',
  withheldTax: '0',
  hasSpouseNoIncome: false,
};

export default function ThaiIncomeTaxTool() {
  const [taxYear, setTaxYear] = useState('2026');
  const [form, setForm] = useState<TaxFormState>(initial);

  const result = useMemo(() => {
    const input = Object.fromEntries(fields.map((f) => [f.key, Number(form[f.key].replace(/,/g, ''))])) as Record<
      NumKey,
      number
    >;
    try {
      return {
        ok: true as const,
        value: calculateTax({ ...input, taxYear: Number(taxYear), hasSpouseNoIncome: form.hasSpouseNoIncome }),
      };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [form, taxYear]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-3">
        <Field
          label="ปีภาษี"
          htmlFor="tax-year"
          hint="สำหรับเงินเดือนตามมาตรา 40(1); รายได้ธุรกิจและฟรีแลนซ์ใช้วิธีคำนวณต่างกัน"
        >
          <Select id="tax-year" value={taxYear} onChange={(e) => setTaxYear(e.target.value)}>
            <option value="2026">2569 (รายได้ปี 2026)</option>
            <option value="2025">2568 (รายได้ปี 2025)</option>
          </Select>
        </Field>
        {fields.map((f) => {
          const value = Number(form[f.key].replace(/,/g, ''));
          const count = ['children', 'childrenBorn2018Plus', 'parents'].includes(f.key);
          const error =
            !Number.isFinite(value) || value < 0
              ? 'กรอกตัวเลขไม่ติดลบ'
              : count && !Number.isInteger(value)
                ? 'กรอกจำนวนคนเป็นจำนวนเต็ม'
                : undefined;
          return (
            <Field key={f.key} label={f.label} htmlFor={f.key} hint={f.hint} error={error}>
              <Input
                id={f.key}
                inputMode={count ? 'numeric' : 'decimal'}
                value={form[f.key]}
                aria-invalid={error ? true : undefined}
                aria-describedby={
                  [f.hint && `${f.key}-hint`, error && `${f.key}-error`].filter(Boolean).join(' ') || undefined
                }
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </Field>
          );
        })}
        <Checkbox
          label="คู่สมรสไม่มีเงินได้ (ลดหย่อน 60,000)"
          checked={form.hasSpouseNoIncome}
          onChange={(e) => setForm({ ...form, hasSpouseNoIncome: e.target.checked })}
        />
      </div>

      <div className="space-y-4">
        {!result.ok && <ErrorText>{result.error}</ErrorText>}
        {result.ok && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label="ภาษีที่ต้องเสีย" value={`${formatBaht(result.value.tax)} บาท`} />
              <Stat
                label={result.value.balance >= 0 ? 'ต้องชำระเพิ่ม' : 'ได้คืน'}
                value={`${formatBaht(Math.abs(result.value.balance))} บาท`}
              />
              <Stat label="เงินได้สุทธิ" value={`${formatBaht(result.value.netIncome)} บาท`} />
              <Stat label="อัตราภาษีเฉลี่ย" value={`${(result.value.effectiveRate * 100).toFixed(2)}%`} />
            </div>
            <ul className="space-y-1 text-sm text-slate-600">
              <li>หักค่าใช้จ่าย {formatBaht(result.value.expense)} บาท</li>
              <li>ค่าลดหย่อนรวม {formatBaht(result.value.allowances)} บาท</li>
              <li>เงินบริจาคที่ใช้ได้ {formatBaht(result.value.donationUsed)} บาท</li>
            </ul>
            <DataTable
              caption="ภาษีแยกตามขั้นเงินได้สุทธิ"
              rows={result.value.lines}
              rowKey={(l) => String(l.from)}
              columns={[
                {
                  key: 'range',
                  header: 'ขั้นเงินได้สุทธิ',
                  render: (l) => `${formatBaht(l.from)} – ${l.to === Infinity ? 'ขึ้นไป' : formatBaht(l.to)}`,
                },
                { key: 'rate', header: 'อัตรา', align: 'right', render: (l) => `${l.rate * 100}%` },
                { key: 'tax', header: 'ภาษี', align: 'right', render: (l) => formatBaht(l.tax) },
              ]}
            />
          </>
        )}
      </div>
    </div>
  );
}
