# ToolSiam Phase 4a — เครื่องมือหมวดการเงิน 3 + ข้อความไทย 4 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มเครื่องมือ 7 ตัวที่ประมวลผลในเบราว์เซอร์ล้วน (เงินเดือนสุทธิ, VAT/หัก ณ ที่จ่าย, ดอกเบี้ยทบต้น, นับคำไทย, เลขไทย↔อารบิก, จัดการบรรทัด, ตรวจเลขบัตรประชาชน) ให้เว็บมี 12 เครื่องมือ ครอบคลุมหมวดการเงินและข้อความครบตาม spec

**Architecture:** ทำตาม pattern เดิมของ Phase 1 ทุกประการ — เครื่องมือ 1 ตัว = โฟลเดอร์ `src/tools/<category>/<slug>/` มี `logic.ts` (pure, ไม่แตะ DOM), `logic.test.ts` (เขียนก่อน), `meta.ts` (SEO), `Tool.tsx` (React island) แล้วลงทะเบียนใน `registry.ts` + `loaders.ts` หน้า `/t/<slug>`, `/c/<category>`, `/tools` และ sitemap ถูก generate จาก registry อัตโนมัติ ไม่ต้องแตะไฟล์หน้าเว็บเลย

**Tech Stack:** ไม่มี dependency ใหม่ — Astro 7, React 19, Tailwind 4, vitest 5, TypeScript 5.9 ที่มีอยู่แล้ว (`Intl.Segmenter` และ `Intl.NumberFormat` เป็น built-in ของ runtime)

**Spec:** `docs/superpowers/specs/2026-09-07-toolsiam-design.md` (หัวข้อ 4 — ตารางเครื่องมือ MVP, หัวข้อ 8 โครงสร้าง, หัวข้อ 9 เฟส 4)

**แผนพี่น้อง (นอกขอบเขตแผนนี้ โดยตั้งใจ):**
- 4b: หมวดวันที่/เวลา (3 ตัว) + QR เพิ่ม (2 ตัว) — QR ทั่วไป/WiFi/vCard ต้องเพิ่ม dependency `jsqr`
- 4c: หมวดรูปภาพ (3 ตัว) + PDF (2 ตัว) — ต้องเพิ่ม `pdf-lib`, ใช้ canvas/File API, ต้องทดสอบใน browser จริง
- 4d: หมวด dev เพิ่ม (2 ตัว) + web/SEO (3 ตัว) + ถอดอักษรไทยเป็นโรมัน RTGS + AdSlot + Cloudflare Web Analytics

## Global Constraints

- Package manager: **npm** เท่านั้น (commit `package-lock.json` ถ้ามีการเปลี่ยนแปลง — แผนนี้ไม่ควรมี)
- ทุก `logic.ts` เป็น pure function ไม่แตะ DOM/window/`navigator` และมี `logic.test.ts` คู่กัน — **เขียน test ก่อนเสมอ**
- ข้อความ UI ทั้งหมดเป็น **ภาษาไทย**; slug เป็น kebab-case ภาษาอังกฤษ
- `meta.ts` ต้องผ่าน `registry.test.ts`: `description` ≥ 40 ตัวอักษร, `keywords` ≥ 3, `howTo` ≥ 2, `faq` ≥ 2
- ห้ามใช้ Node API (`Buffer`, `node:crypto`) — โค้ดรันบน browser
- import ข้ามไฟล์ในโปรเจกต์ใช้ alias `@/` (ตั้งไว้แล้วใน `tsconfig.json` + `astro.config.mjs`)
- เงินทุกจำนวนปัดทศนิยม 2 ตำแหน่งด้วย `Math.round(n * 100) / 100` (half-up) — ห้ามใช้ `toFixed` ในการคำนวณ
- ทุก Task จบด้วย `npm test` + `npm run typecheck` ผ่าน แล้ว commit (ลงท้ายข้อความ commit ด้วย `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`)
- ห้าม deploy ระหว่างทาง — deploy ครั้งเดียวใน Task 8

## File Structure

```
src/tools/finance/net-salary/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}        ← Task 1
src/tools/finance/vat-wht/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}           ← Task 2
src/tools/finance/compound-interest/{logic.ts,logic.test.ts,meta.ts,Tool.tsx} ← Task 3
src/tools/text/word-count/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}           ← Task 4
src/tools/text/thai-numerals/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}        ← Task 5
src/tools/text/text-lines/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}           ← Task 6
src/tools/text/thai-id-check/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}        ← Task 7
src/tools/registry.ts    ← แก้ทุก Task (เพิ่ม import + ใส่ใน array `tools`)
src/tools/loaders.ts     ← แก้ทุก Task (เพิ่ม 1 บรรทัดใน `toolLoaders`)
```

ไฟล์ที่ **ไม่ต้องแตะ**: หน้าเว็บทั้งหมดใน `src/pages/`, `ToolShell.astro`, `ToolSearch.tsx`, `categories.ts` — ทั้งหมด generate จาก registry อยู่แล้ว

---

### Task 1: เครื่องมือ "คำนวณเงินเดือนสุทธิ" (`net-salary`, free)

หักประกันสังคม 5% (ฐาน 1,650–15,000 → สูงสุด 750 บาท/เดือน) และภาษีหัก ณ ที่จ่ายรายเดือน โดยคำนวณภาษีทั้งปีจาก `calculateTax` ของเครื่องมือภาษีที่มีอยู่แล้ว แล้วหาร 12

**Files:**
- Create: `src/tools/finance/net-salary/logic.ts`, `meta.ts`, `Tool.tsx`
- Test: `src/tools/finance/net-salary/logic.test.ts`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Consumes: `calculateTax(input: TaxInput): TaxResult` จาก `@/tools/finance/thai-income-tax/logic` (มีอยู่แล้ว — `TaxInput` ต้องส่งครบทุก field)
- Produces: `SSO`, `ssoMonthly(monthlySalary: number): number`, `calculateNetSalary(input: NetSalaryInput): NetSalaryResult`

- [ ] **Step 1: เขียน test (จะ fail เพราะยังไม่มี logic.ts)**

สร้าง `src/tools/finance/net-salary/logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SSO, ssoMonthly, calculateNetSalary, type NetSalaryInput } from './logic';

const base: NetSalaryInput = {
  monthlySalary: 30_000,
  bonus: 0,
  hasSocialSecurity: true,
  hasSpouseNoIncome: false,
  children: 0,
  parents: 0,
  otherDeductions: 0,
};

describe('ssoMonthly', () => {
  it('5% ของเงินเดือน', () => {
    expect(ssoMonthly(10_000)).toBe(500);
  });

  it('เพดาน 750 บาท เมื่อเงินเดือนเกิน 15,000', () => {
    expect(ssoMonthly(15_000)).toBe(750);
    expect(ssoMonthly(80_000)).toBe(750);
    expect(SSO.monthlyCap).toBe(750);
  });

  it('ฐานขั้นต่ำ 1,650 บาท → 83 บาท', () => {
    expect(ssoMonthly(1_000)).toBe(83);
    expect(ssoMonthly(1_650)).toBe(83);
  });

  it('ไม่มีรายได้ → 0', () => {
    expect(ssoMonthly(0)).toBe(0);
  });
});

describe('calculateNetSalary', () => {
  it('เงินเดือน 30,000 มีประกันสังคม ไม่มีลดหย่อนอื่น', () => {
    const r = calculateNetSalary(base);
    expect(r.annualIncome).toBe(360_000);
    expect(r.ssoMonthly).toBe(750);
    expect(r.ssoYearly).toBe(9_000);
    expect(r.netIncome).toBe(191_000); // 360,000 − 100,000 (ค่าใช้จ่าย) − 69,000 (ลดหย่อน)
    expect(r.annualTax).toBe(2_050);
    expect(r.monthlyTax).toBe(170.83);
    expect(r.netMonthly).toBe(29_079.17);
  });

  it('โบนัสเพิ่มเงินได้ทั้งปีแต่ไม่เพิ่มเงินเดือนรายเดือน', () => {
    const r = calculateNetSalary({ ...base, bonus: 60_000 });
    expect(r.annualIncome).toBe(420_000);
    expect(r.annualTax).toBeGreaterThan(2_050);
    expect(r.netYearly).toBe(Math.round((420_000 - r.ssoYearly - r.annualTax) * 100) / 100);
  });

  it('ไม่ส่งประกันสังคม → ไม่หัก และไม่ได้ลดหย่อน', () => {
    const r = calculateNetSalary({ ...base, hasSocialSecurity: false });
    expect(r.ssoMonthly).toBe(0);
    expect(r.ssoYearly).toBe(0);
    expect(r.netIncome).toBe(200_000); // ลดหย่อนเหลือแค่ส่วนตัว 60,000
    expect(r.annualTax).toBe(2_500);
  });

  it('เงินเดือนน้อยจนไม่ต้องเสียภาษี', () => {
    const r = calculateNetSalary({ ...base, monthlySalary: 15_000 });
    expect(r.annualTax).toBe(0);
    expect(r.monthlyTax).toBe(0);
    expect(r.netMonthly).toBe(14_250);
    expect(r.effectiveRate).toBe(0);
  });

  it('ลดหย่อนคู่สมรส/บุตร/บิดามารดา ทำให้ภาษีลดลง', () => {
    const r = calculateNetSalary({ ...base, hasSpouseNoIncome: true, children: 1, parents: 2 });
    expect(r.annualTax).toBe(0);
  });

  it('เงินเดือนติดลบ → error', () => {
    expect(() => calculateNetSalary({ ...base, monthlySalary: -1 })).toThrow();
  });
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `npx vitest run src/tools/finance/net-salary`
Expected: FAIL — `Failed to resolve import "./logic"`

- [ ] **Step 3: เขียน logic.ts**

สร้าง `src/tools/finance/net-salary/logic.ts`:

```ts
import { calculateTax } from '@/tools/finance/thai-income-tax/logic';

/** ประกันสังคมมาตรา 33 — ลูกจ้างส่ง 5% ของค่าจ้าง ฐาน 1,650–15,000 บาท/เดือน */
export const SSO = {
  rate: 0.05,
  minBase: 1_650,
  maxBase: 15_000,
  monthlyCap: 750,
  yearlyCap: 9_000,
} as const;

export interface NetSalaryInput {
  /** เงินเดือนต่อเดือน (ก่อนหัก) */
  monthlySalary: number;
  /** โบนัส/เงินได้อื่นรวมทั้งปี */
  bonus: number;
  hasSocialSecurity: boolean;
  hasSpouseNoIncome: boolean;
  children: number;
  parents: number;
  /** ลดหย่อนอื่นรวมทั้งปี (ประกันชีวิต กองทุน ดอกเบี้ยบ้าน ฯลฯ) */
  otherDeductions: number;
}

export interface NetSalaryResult {
  annualIncome: number;
  ssoMonthly: number;
  ssoYearly: number;
  /** เงินได้สุทธิที่ใช้คำนวณภาษี */
  netIncome: number;
  annualTax: number;
  monthlyTax: number;
  netMonthly: number;
  netYearly: number;
  /** ภาษีทั้งปี ÷ เงินได้ทั้งปี */
  effectiveRate: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function ssoMonthly(monthlySalary: number): number {
  if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) return 0;
  const capped = Math.min(Math.max(monthlySalary, SSO.minBase), SSO.maxBase);
  return Math.round(capped * SSO.rate);
}

export function calculateNetSalary(input: NetSalaryInput): NetSalaryResult {
  if (!Number.isFinite(input.monthlySalary) || input.monthlySalary < 0) {
    throw new Error('เงินเดือนต้องเป็นตัวเลขไม่ติดลบ');
  }
  const bonus = Math.max(0, input.bonus);
  const annualIncome = round2(input.monthlySalary * 12 + bonus);

  const sso = input.hasSocialSecurity ? ssoMonthly(input.monthlySalary) : 0;
  const ssoYearly = Math.min(sso * 12, SSO.yearlyCap);

  const tax = calculateTax({
    annualIncome,
    hasSpouseNoIncome: input.hasSpouseNoIncome,
    children: Math.max(0, input.children),
    childrenBorn2018Plus: 0,
    parents: Math.max(0, input.parents),
    socialSecurity: ssoYearly,
    lifeInsurance: 0,
    healthInsurance: 0,
    retirementFunds: 0,
    thaiEsg: 0,
    homeLoanInterest: 0,
    donations: 0,
    otherDeductions: Math.max(0, input.otherDeductions),
    withheldTax: 0,
  });

  const monthlyTax = round2(tax.tax / 12);
  return {
    annualIncome,
    ssoMonthly: sso,
    ssoYearly,
    netIncome: tax.netIncome,
    annualTax: tax.tax,
    monthlyTax,
    netMonthly: round2(input.monthlySalary - sso - monthlyTax),
    netYearly: round2(annualIncome - ssoYearly - tax.tax),
    effectiveRate: tax.effectiveRate,
  };
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `npx vitest run src/tools/finance/net-salary`
Expected: PASS ทุกข้อ

- [ ] **Step 5: เขียน meta.ts**

สร้าง `src/tools/finance/net-salary/meta.ts`:

```ts
import type { ToolMeta } from '@/tools/types';

export const netSalaryMeta: ToolMeta = {
  slug: 'net-salary',
  name: 'คำนวณเงินเดือนสุทธิ (หักประกันสังคม + ภาษี)',
  nameEn: 'Net Salary Calculator',
  category: 'finance',
  tier: 'free',
  description:
    'คำนวณเงินเดือนสุทธิที่ได้รับจริงหลังหักประกันสังคม 5% (สูงสุด 750 บาท/เดือน) และภาษีหัก ณ ที่จ่าย พร้อมสรุปยอดทั้งปี ใส่โบนัสและค่าลดหย่อนได้',
  keywords: ['เงินเดือนสุทธิ', 'คำนวณเงินเดือนหลังหักภาษี', 'ประกันสังคม 750', 'ภาษีหัก ณ ที่จ่ายเงินเดือน', 'เงินเดือนออกเท่าไหร่'],
  howTo: [
    'กรอกเงินเดือนต่อเดือน และโบนัสทั้งปี (ถ้ามี)',
    'เลือกว่าส่งประกันสังคมหรือไม่ และกรอกค่าลดหย่อน เช่น คู่สมรส บุตร บิดามารดา',
    'ดูยอดสุทธิรายเดือนและสรุปทั้งปีทันที',
  ],
  faq: [
    { q: 'หักประกันสังคมเท่าไหร่', a: 'ลูกจ้างมาตรา 33 ส่ง 5% ของค่าจ้าง โดยคิดจากฐานค่าจ้าง 1,650–15,000 บาท จึงหักสูงสุด 750 บาทต่อเดือน หรือ 9,000 บาทต่อปี' },
    { q: 'ภาษีหัก ณ ที่จ่ายรายเดือนคำนวณอย่างไร', a: 'นายจ้างประมาณภาษีทั้งปีจากเงินได้ทั้งปีแล้วหารด้วยจำนวนงวด เครื่องมือนี้ใช้วิธีเดียวกันคือคำนวณภาษีทั้งปีตามขั้นบันไดแล้วหาร 12' },
    { q: 'ทำไมยอดไม่ตรงกับสลิปเงินเดือน', a: 'สลิปจริงอาจมีรายการอื่น เช่น กองทุนสำรองเลี้ยงชีพ ค่าล่วงเวลา เบี้ยขยัน หรือค่าลดหย่อนที่แจ้ง HR ไว้ ให้ใส่ค่าลดหย่อนอื่นเพิ่มเพื่อให้ใกล้เคียงขึ้น' },
  ],
};
```

- [ ] **Step 6: เขียน Tool.tsx**

สร้าง `src/tools/finance/net-salary/Tool.tsx`:

```tsx
import { useState } from 'react';
import { calculateNetSalary } from './logic';
import { formatBaht } from '@/lib/format';
import { Field, Input, Stat } from '@/components/ui';

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

      {error && <p className="text-sm text-red-600">{error}</p>}

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
```

- [ ] **Step 7: ลงทะเบียนใน registry และ loaders**

ใน `src/tools/registry.ts` เพิ่ม import ถัดจาก import ของ `loanInstallmentMeta`:

```ts
import { netSalaryMeta } from './finance/net-salary/meta';
```

และเพิ่ม `netSalaryMeta` ต่อท้าย `loanInstallmentMeta` ใน array `tools`:

```ts
export const tools: ToolMeta[] = [thaiIncomeTaxMeta, loanInstallmentMeta, netSalaryMeta, bahtTextMeta, promptpayQrMeta, jsonFormatterMeta];
```

ใน `src/tools/loaders.ts` เพิ่มบรรทัดใน `toolLoaders`:

```ts
  'net-salary': () => import('./finance/net-salary/Tool'),
```

- [ ] **Step 8: รัน test ทั้งหมด + typecheck + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: tests ผ่านทั้งหมด (รวม `registry.test.ts` ที่บังคับ meta/loader ครบ), typecheck เงียบ, build สำเร็จและมี `/t/net-salary` ในผลลัพธ์

- [ ] **Step 9: Commit**

```bash
git add src/tools/finance/net-salary src/tools/registry.ts src/tools/loaders.ts
git commit -m "feat(tool): net-salary — คำนวณเงินเดือนสุทธิหลังหักประกันสังคมและภาษี

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: เครื่องมือ "ถอด/รวม VAT 7% และหัก ณ ที่จ่าย" (`vat-wht`, free)

**Files:**
- Create: `src/tools/finance/vat-wht/logic.ts`, `meta.ts`, `Tool.tsx`
- Test: `src/tools/finance/vat-wht/logic.test.ts`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Consumes: `formatBaht` จาก `@/lib/format` (ใน Tool.tsx เท่านั้น)
- Produces: `VAT_RATE`, `WHT_RATES`, `calculateInvoice(input: InvoiceInput): InvoiceResult`

- [ ] **Step 1: เขียน test**

สร้าง `src/tools/finance/vat-wht/logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { VAT_RATE, WHT_RATES, calculateInvoice } from './logic';

describe('calculateInvoice', () => {
  it('รวม VAT: 100 → ฐาน 100, VAT 7, รวม 107', () => {
    const r = calculateInvoice({ amount: 100, mode: 'add', vatRate: VAT_RATE, whtRate: 0 });
    expect(r.base).toBe(100);
    expect(r.vat).toBe(7);
    expect(r.total).toBe(107);
    expect(r.wht).toBe(0);
    expect(r.payable).toBe(107);
  });

  it('ถอด VAT: 107 → ฐาน 100, VAT 7', () => {
    const r = calculateInvoice({ amount: 107, mode: 'extract', vatRate: VAT_RATE, whtRate: 0 });
    expect(r.base).toBe(100);
    expect(r.vat).toBe(7);
    expect(r.total).toBe(107);
  });

  it('ถอด VAT แล้ว ฐาน + VAT ต้องเท่ากับยอดรวมเป๊ะ ไม่เพี้ยนจากการปัดเศษ', () => {
    const r = calculateInvoice({ amount: 1000, mode: 'extract', vatRate: VAT_RATE, whtRate: 0 });
    expect(r.base).toBe(934.58);
    expect(r.vat).toBe(65.42);
    expect(Math.round((r.base + r.vat) * 100) / 100).toBe(1000);
  });

  it('หัก ณ ที่จ่ายคิดจากฐานก่อน VAT', () => {
    const r = calculateInvoice({ amount: 100, mode: 'add', vatRate: VAT_RATE, whtRate: 0.03 });
    expect(r.wht).toBe(3);
    expect(r.payable).toBe(104); // 107 − 3
  });

  it('อัตรา VAT 0% ใช้ได้', () => {
    const r = calculateInvoice({ amount: 500, mode: 'add', vatRate: 0, whtRate: 0.05 });
    expect(r.vat).toBe(0);
    expect(r.total).toBe(500);
    expect(r.wht).toBe(25);
    expect(r.payable).toBe(475);
  });

  it('ยอด 0 ได้ผลลัพธ์ 0 ทั้งหมด', () => {
    const r = calculateInvoice({ amount: 0, mode: 'extract', vatRate: VAT_RATE, whtRate: 0.03 });
    expect(r).toEqual({ base: 0, vat: 0, total: 0, wht: 0, payable: 0 });
  });

  it('ยอดติดลบ → error', () => {
    expect(() => calculateInvoice({ amount: -1, mode: 'add', vatRate: VAT_RATE, whtRate: 0 })).toThrow();
  });

  it('ตารางอัตราหัก ณ ที่จ่ายมีครบและอัตราอยู่ระหว่าง 0–1', () => {
    expect(WHT_RATES.length).toBeGreaterThanOrEqual(6);
    for (const w of WHT_RATES) {
      expect(w.rate).toBeGreaterThan(0);
      expect(w.rate).toBeLessThan(1);
      expect(w.label.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `npx vitest run src/tools/finance/vat-wht`
Expected: FAIL — resolve `./logic` ไม่ได้

- [ ] **Step 3: เขียน logic.ts**

สร้าง `src/tools/finance/vat-wht/logic.ts`:

```ts
export const VAT_RATE = 0.07;

/** อัตราภาษีหัก ณ ที่จ่ายที่ใช้บ่อย (ภ.ง.ด.3/53) */
export const WHT_RATES: { rate: number; label: string }[] = [
  { rate: 0.01, label: 'ค่าขนส่ง 1%' },
  { rate: 0.02, label: 'ค่าโฆษณา 2%' },
  { rate: 0.03, label: 'ค่าบริการ/รับจ้างทำของ 3%' },
  { rate: 0.05, label: 'ค่าเช่า 5%' },
  { rate: 0.1, label: 'เงินปันผล 10%' },
  { rate: 0.15, label: 'ดอกเบี้ย 15%' },
];

export interface InvoiceInput {
  amount: number;
  /** add = ยอดที่กรอกยังไม่รวม VAT, extract = ยอดที่กรอกรวม VAT แล้ว */
  mode: 'add' | 'extract';
  vatRate: number;
  /** 0 = ไม่หัก */
  whtRate: number;
}

export interface InvoiceResult {
  /** ราคาก่อน VAT */
  base: number;
  vat: number;
  total: number;
  /** ภาษีหัก ณ ที่จ่าย (คิดจาก base) */
  wht: number;
  /** ยอดจ่ายจริง = total − wht */
  payable: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateInvoice(input: InvoiceInput): InvoiceResult {
  const { amount, mode, vatRate, whtRate } = input;
  if (!Number.isFinite(amount) || amount < 0) throw new Error('ยอดเงินต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(vatRate) || vatRate < 0) throw new Error('อัตรา VAT ไม่ถูกต้อง');
  if (!Number.isFinite(whtRate) || whtRate < 0) throw new Error('อัตราหัก ณ ที่จ่ายไม่ถูกต้อง');

  let base: number;
  let total: number;
  if (mode === 'add') {
    base = round2(amount);
    total = round2(base * (1 + vatRate));
  } else {
    total = round2(amount);
    base = round2(total / (1 + vatRate));
  }
  // คำนวณ vat จากส่วนต่าง เพื่อให้ base + vat = total เสมอแม้ปัดเศษแล้ว
  const vat = round2(total - base);
  const wht = round2(base * whtRate);

  return { base, vat, total, wht, payable: round2(total - wht) };
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `npx vitest run src/tools/finance/vat-wht`
Expected: PASS ทุกข้อ

- [ ] **Step 5: เขียน meta.ts**

สร้าง `src/tools/finance/vat-wht/meta.ts`:

```ts
import type { ToolMeta } from '@/tools/types';

export const vatWhtMeta: ToolMeta = {
  slug: 'vat-wht',
  name: 'คำนวณ VAT 7% (ถอด/รวม) และภาษีหัก ณ ที่จ่าย',
  nameEn: 'VAT & Withholding Tax Calculator',
  category: 'finance',
  tier: 'free',
  description:
    'ถอด VAT ออกจากยอดรวม หรือบวก VAT 7% เข้ากับราคาก่อนภาษี พร้อมคำนวณภาษีหัก ณ ที่จ่าย 1–15% และยอดที่ต้องจ่ายจริง ใช้ทำใบกำกับภาษีและใบสำคัญจ่าย',
  keywords: ['ถอด vat', 'คำนวณ vat 7%', 'แยก vat จากยอดรวม', 'หัก ณ ที่จ่าย 3%', 'ภาษีหัก ณ ที่จ่าย'],
  howTo: [
    'เลือกว่ายอดที่กรอก "ยังไม่รวม VAT" หรือ "รวม VAT แล้ว"',
    'กรอกยอดเงิน แล้วเลือกอัตราภาษีหัก ณ ที่จ่าย (ถ้ามี)',
    'อ่านผลลัพธ์: ราคาก่อน VAT, VAT, ยอดรวม, ยอดหัก ณ ที่จ่าย และยอดจ่ายจริง',
  ],
  faq: [
    { q: 'ถอด VAT คำนวณอย่างไร', a: 'ราคาก่อน VAT = ยอดรวม ÷ 1.07 และ VAT = ยอดรวม − ราคาก่อน VAT เครื่องมือนี้คำนวณ VAT จากส่วนต่างเพื่อให้ผลรวมตรงกับยอดที่กรอกเสมอ ไม่เพี้ยนจากการปัดเศษ' },
    { q: 'หัก ณ ที่จ่ายคิดจากยอดรวม VAT หรือไม่', a: 'ไม่ ภาษีหัก ณ ที่จ่ายคิดจากราคาก่อน VAT เท่านั้น เครื่องมือนี้จึงหักจากฐานก่อน VAT ให้อัตโนมัติ' },
    { q: 'ยอดจ่ายจริงคืออะไร', a: 'ยอดรวมที่มี VAT แล้ว หักด้วยภาษีหัก ณ ที่จ่าย คือจำนวนเงินที่ผู้จ่ายโอนให้ผู้รับจริง ส่วนภาษีที่หักไว้ผู้จ่ายต้องนำส่งกรมสรรพากร' },
  ],
};
```

- [ ] **Step 6: เขียน Tool.tsx**

สร้าง `src/tools/finance/vat-wht/Tool.tsx`:

```tsx
import { useState } from 'react';
import { VAT_RATE, WHT_RATES, calculateInvoice } from './logic';
import { formatBaht } from '@/lib/format';
import { Field, Input, Select, Stat } from '@/components/ui';

export default function VatWhtTool() {
  const [amount, setAmount] = useState('1000');
  const [mode, setMode] = useState<'add' | 'extract'>('add');
  const [whtRate, setWhtRate] = useState('0');

  const parsed = Number(amount.replace(/,/g, ''));
  let result: ReturnType<typeof calculateInvoice> | null = null;
  let error = '';
  try {
    result = calculateInvoice({
      amount: Number.isFinite(parsed) ? parsed : 0,
      mode,
      vatRate: VAT_RATE,
      whtRate: Number(whtRate),
    });
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="ยอดเงิน (บาท)" htmlFor="amount">
          <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <Field label="ยอดที่กรอก" htmlFor="mode">
          <Select id="mode" value={mode} onChange={(e) => setMode(e.target.value as 'add' | 'extract')}>
            <option value="add">ยังไม่รวม VAT</option>
            <option value="extract">รวม VAT แล้ว</option>
          </Select>
        </Field>
        <Field label="ภาษีหัก ณ ที่จ่าย" htmlFor="wht">
          <Select id="wht" value={whtRate} onChange={(e) => setWhtRate(e.target.value)}>
            <option value="0">ไม่หัก</option>
            {WHT_RATES.map((w) => (
              <option key={w.rate} value={w.rate}>{w.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="ราคาก่อน VAT" value={`${formatBaht(result.base)} บาท`} />
          <Stat label={`VAT ${VAT_RATE * 100}%`} value={`${formatBaht(result.vat)} บาท`} />
          <Stat label="ยอดรวม" value={`${formatBaht(result.total)} บาท`} />
          <Stat label="หัก ณ ที่จ่าย" value={`${formatBaht(result.wht)} บาท`} />
          <Stat label="ยอดจ่ายจริง" value={`${formatBaht(result.payable)} บาท`} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: ลงทะเบียน**

ใน `src/tools/registry.ts`:

```ts
import { vatWhtMeta } from './finance/vat-wht/meta';
```

แล้วใส่ `vatWhtMeta` ต่อท้าย `netSalaryMeta` ใน array `tools`

ใน `src/tools/loaders.ts`:

```ts
  'vat-wht': () => import('./finance/vat-wht/Tool'),
```

- [ ] **Step 8: ทดสอบและ commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: ผ่านทั้งหมด

```bash
git add src/tools/finance/vat-wht src/tools/registry.ts src/tools/loaders.ts
git commit -m "feat(tool): vat-wht — ถอด/รวม VAT 7% และภาษีหัก ณ ที่จ่าย

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: เครื่องมือ "ดอกเบี้ยทบต้น / เป้าหมายออม" (`compound-interest`, free)

**Files:**
- Create: `src/tools/finance/compound-interest/logic.ts`, `meta.ts`, `Tool.tsx`
- Test: `src/tools/finance/compound-interest/logic.test.ts`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Produces: `compoundGrowth(input: CompoundInput): CompoundResult`, `monthlyForGoal(input: GoalInput): number`

- [ ] **Step 1: เขียน test**

สร้าง `src/tools/finance/compound-interest/logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { compoundGrowth, monthlyForGoal } from './logic';

describe('compoundGrowth', () => {
  it('ดอกเบี้ย 0% → ยอดสุดท้ายเท่ากับเงินต้นบวกเงินฝากรวม', () => {
    const r = compoundGrowth({ principal: 100_000, monthlyDeposit: 1_000, annualRate: 0, years: 1, compoundsPerYear: 12 });
    expect(r.futureValue).toBe(112_000);
    expect(r.totalDeposits).toBe(12_000);
    expect(r.totalInterest).toBe(0);
  });

  it('ทบต้นรายเดือน 12% ต่อปี 1 ปี ไม่มีเงินฝากเพิ่ม', () => {
    const r = compoundGrowth({ principal: 100_000, monthlyDeposit: 0, annualRate: 0.12, years: 1, compoundsPerYear: 12 });
    expect(r.futureValue).toBe(112_682.5);
    expect(r.totalInterest).toBe(12_682.5);
  });

  it('มีตารางรายปีครบตามจำนวนปี และยอดปีสุดท้ายเท่ากับ futureValue', () => {
    const r = compoundGrowth({ principal: 10_000, monthlyDeposit: 500, annualRate: 0.05, years: 3, compoundsPerYear: 12 });
    expect(r.rows).toHaveLength(3);
    expect(r.rows[0].year).toBe(1);
    expect(r.rows[2].balance).toBe(r.futureValue);
    expect(r.rows[2].balance).toBeGreaterThan(r.rows[1].balance);
  });

  it('ยอดรวมดอกเบี้ย = ยอดสุดท้าย − เงินต้น − เงินฝากรวม', () => {
    const r = compoundGrowth({ principal: 50_000, monthlyDeposit: 2_000, annualRate: 0.06, years: 5, compoundsPerYear: 12 });
    expect(r.totalDeposits).toBe(120_000);
    expect(r.totalInterest).toBe(Math.round((r.futureValue - 50_000 - 120_000) * 100) / 100);
  });

  it('จำนวนปีต้องมากกว่า 0', () => {
    expect(() => compoundGrowth({ principal: 1, monthlyDeposit: 0, annualRate: 0.05, years: 0, compoundsPerYear: 12 })).toThrow();
  });

  it('เงินต้นติดลบ → error', () => {
    expect(() => compoundGrowth({ principal: -1, monthlyDeposit: 0, annualRate: 0.05, years: 1, compoundsPerYear: 12 })).toThrow();
  });
});

describe('monthlyForGoal', () => {
  it('ดอกเบี้ย 0% → (เป้าหมาย − เงินต้น) ÷ จำนวนเดือน', () => {
    expect(monthlyForGoal({ goal: 112_000, principal: 100_000, annualRate: 0, years: 1, compoundsPerYear: 12 })).toBe(1_000);
  });

  it('ฝากตามที่คำนวณได้ แล้วโตถึงเป้าหมายพอดี', () => {
    const args = { goal: 1_000_000, principal: 100_000, annualRate: 0.05, years: 10, compoundsPerYear: 12 };
    const pmt = monthlyForGoal(args);
    const grown = compoundGrowth({ ...args, monthlyDeposit: pmt });
    expect(grown.futureValue).toBeCloseTo(1_000_000, 0);
  });

  it('เงินต้นมากกว่าเป้าหมายแล้ว → 0', () => {
    expect(monthlyForGoal({ goal: 50_000, principal: 100_000, annualRate: 0.05, years: 5, compoundsPerYear: 12 })).toBe(0);
  });
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `npx vitest run src/tools/finance/compound-interest`
Expected: FAIL — resolve `./logic` ไม่ได้

- [ ] **Step 3: เขียน logic.ts**

สร้าง `src/tools/finance/compound-interest/logic.ts` (จำลองรายเดือน เงินฝากลงตอนสิ้นเดือน):

```ts
export interface CompoundInput {
  principal: number;
  /** เงินฝากเพิ่มทุกสิ้นเดือน */
  monthlyDeposit: number;
  /** อัตราต่อปีแบบทศนิยม เช่น 0.05 = 5% */
  annualRate: number;
  years: number;
  /** จำนวนครั้งที่ทบต้นต่อปี เช่น 12 = รายเดือน, 1 = รายปี */
  compoundsPerYear: number;
}

export interface CompoundYearRow {
  year: number;
  /** เงินฝากสะสมถึงสิ้นปีนั้น (ไม่รวมเงินต้น) */
  deposits: number;
  /** ดอกเบี้ยสะสมถึงสิ้นปีนั้น */
  interest: number;
  balance: number;
}

export interface CompoundResult {
  futureValue: number;
  totalDeposits: number;
  totalInterest: number;
  rows: CompoundYearRow[];
}

export interface GoalInput {
  goal: number;
  principal: number;
  annualRate: number;
  years: number;
  compoundsPerYear: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** อัตราผลตอบแทนต่อเดือนที่เทียบเท่าการทบต้น n ครั้งต่อปี */
function monthlyRate(annualRate: number, compoundsPerYear: number): number {
  if (annualRate === 0) return 0;
  return (1 + annualRate / compoundsPerYear) ** (compoundsPerYear / 12) - 1;
}

function validate(principal: number, annualRate: number, years: number, compoundsPerYear: number): void {
  if (!Number.isFinite(principal) || principal < 0) throw new Error('เงินต้นต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(annualRate) || annualRate < 0) throw new Error('อัตราดอกเบี้ยต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(years) || years <= 0) throw new Error('จำนวนปีต้องมากกว่า 0');
  if (!Number.isFinite(compoundsPerYear) || compoundsPerYear <= 0) throw new Error('จำนวนครั้งที่ทบต้นต้องมากกว่า 0');
}

export function compoundGrowth(input: CompoundInput): CompoundResult {
  validate(input.principal, input.annualRate, input.years, input.compoundsPerYear);
  const deposit = Math.max(0, input.monthlyDeposit);
  const m = monthlyRate(input.annualRate, input.compoundsPerYear);
  const months = Math.round(input.years * 12);

  let balance = input.principal;
  let deposits = 0;
  const rows: CompoundYearRow[] = [];

  for (let i = 1; i <= months; i++) {
    balance = balance * (1 + m) + deposit;
    deposits += deposit;
    if (i % 12 === 0 || i === months) {
      rows.push({
        year: Math.ceil(i / 12),
        deposits: round2(deposits),
        interest: round2(balance - input.principal - deposits),
        balance: round2(balance),
      });
    }
  }

  const futureValue = round2(balance);
  return {
    futureValue,
    totalDeposits: round2(deposits),
    totalInterest: round2(futureValue - input.principal - deposits),
    rows,
  };
}

/** เงินที่ต้องฝากทุกเดือนเพื่อให้ถึงเป้าหมาย */
export function monthlyForGoal(input: GoalInput): number {
  validate(input.principal, input.annualRate, input.years, input.compoundsPerYear);
  if (!Number.isFinite(input.goal) || input.goal < 0) throw new Error('เป้าหมายต้องเป็นตัวเลขไม่ติดลบ');

  const m = monthlyRate(input.annualRate, input.compoundsPerYear);
  const n = Math.round(input.years * 12);
  const grownPrincipal = input.principal * (1 + m) ** n;
  const need = input.goal - grownPrincipal;
  if (need <= 0) return 0;
  // เงินฝากสิ้นงวด: FV = PMT × ((1+m)^n − 1) / m
  const factor = m === 0 ? n : ((1 + m) ** n - 1) / m;
  return round2(need / factor);
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `npx vitest run src/tools/finance/compound-interest`
Expected: PASS ทุกข้อ

- [ ] **Step 5: เขียน meta.ts**

สร้าง `src/tools/finance/compound-interest/meta.ts`:

```ts
import type { ToolMeta } from '@/tools/types';

export const compoundInterestMeta: ToolMeta = {
  slug: 'compound-interest',
  name: 'คำนวณดอกเบี้ยทบต้นและเป้าหมายการออม',
  nameEn: 'Compound Interest & Savings Goal',
  category: 'finance',
  tier: 'free',
  description:
    'คำนวณเงินออมในอนาคตจากดอกเบี้ยทบต้น พร้อมตารางการเติบโตรายปี และคำนวณย้อนกลับว่าต้องออมเดือนละเท่าไหร่จึงจะถึงเป้าหมายที่ตั้งไว้',
  keywords: ['ดอกเบี้ยทบต้น', 'คำนวณเงินออม', 'เป้าหมายการออม', 'compound interest', 'ออมเดือนละเท่าไหร่'],
  howTo: [
    'เลือกโหมด "คำนวณเงินในอนาคต" หรือ "คำนวณเงินที่ต้องออม"',
    'กรอกเงินต้น เงินฝากต่อเดือน อัตราดอกเบี้ยต่อปี และจำนวนปี',
    'ดูยอดสุดท้ายพร้อมตารางการเติบโตรายปี',
  ],
  faq: [
    { q: 'ดอกเบี้ยทบต้นต่างจากดอกเบี้ยธรรมดาอย่างไร', a: 'ดอกเบี้ยทบต้นนำดอกเบี้ยที่ได้ในแต่ละงวดไปรวมเป็นเงินต้นของงวดถัดไป เงินจึงโตแบบทวีคูณ ยิ่งระยะเวลานานยิ่งต่างจากดอกเบี้ยธรรมดามาก' },
    { q: 'เงินฝากรายเดือนคิดตอนต้นเดือนหรือสิ้นเดือน', a: 'เครื่องมือนี้คิดแบบฝากตอนสิ้นเดือน (ordinary annuity) ซึ่งเป็นวิธีมาตรฐานของแผนออมรายเดือนทั่วไป' },
    { q: 'จำนวนครั้งที่ทบต้นต่อปีมีผลแค่ไหน', a: 'ยิ่งทบต้นถี่ ผลตอบแทนจริงยิ่งสูงขึ้นเล็กน้อย เช่น 12% ทบต้นรายเดือนให้ผลตอบแทนจริงประมาณ 12.68% ต่อปี' },
  ],
};
```

- [ ] **Step 6: เขียน Tool.tsx**

สร้าง `src/tools/finance/compound-interest/Tool.tsx`:

```tsx
import { useState } from 'react';
import { compoundGrowth, monthlyForGoal } from './logic';
import { formatBaht } from '@/lib/format';
import { Field, Input, Select, Stat } from '@/components/ui';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export default function CompoundInterestTool() {
  const [mode, setMode] = useState<'future' | 'goal'>('future');
  const [principal, setPrincipal] = useState('100000');
  const [deposit, setDeposit] = useState('5000');
  const [goal, setGoal] = useState('1000000');
  const [ratePercent, setRatePercent] = useState('5');
  const [years, setYears] = useState('10');
  const [compounds, setCompounds] = useState('12');

  const args = {
    principal: num(principal),
    annualRate: num(ratePercent) / 100,
    years: num(years),
    compoundsPerYear: num(compounds),
  };

  let error = '';
  let growth: ReturnType<typeof compoundGrowth> | null = null;
  let required = 0;
  try {
    if (mode === 'goal') {
      required = monthlyForGoal({ ...args, goal: num(goal) });
      growth = compoundGrowth({ ...args, monthlyDeposit: required });
    } else {
      growth = compoundGrowth({ ...args, monthlyDeposit: num(deposit) });
    }
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="โหมด" htmlFor="mode">
          <Select id="mode" value={mode} onChange={(e) => setMode(e.target.value as 'future' | 'goal')}>
            <option value="future">คำนวณเงินในอนาคต</option>
            <option value="goal">คำนวณเงินที่ต้องออม</option>
          </Select>
        </Field>
        <Field label="เงินต้น (บาท)" htmlFor="principal">
          <Input id="principal" inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
        </Field>
        {mode === 'future' ? (
          <Field label="ฝากเพิ่มต่อเดือน (บาท)" htmlFor="deposit">
            <Input id="deposit" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </Field>
        ) : (
          <Field label="เป้าหมาย (บาท)" htmlFor="goal">
            <Input id="goal" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} />
          </Field>
        )}
        <Field label="ดอกเบี้ยต่อปี (%)" htmlFor="rate">
          <Input id="rate" inputMode="decimal" value={ratePercent} onChange={(e) => setRatePercent(e.target.value)} />
        </Field>
        <Field label="ระยะเวลา (ปี)" htmlFor="years">
          <Input id="years" inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} />
        </Field>
        <Field label="ทบต้นต่อปี" htmlFor="compounds">
          <Select id="compounds" value={compounds} onChange={(e) => setCompounds(e.target.value)}>
            <option value="12">รายเดือน (12)</option>
            <option value="4">รายไตรมาส (4)</option>
            <option value="2">ทุก 6 เดือน (2)</option>
            <option value="1">รายปี (1)</option>
          </Select>
        </Field>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {growth && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {mode === 'goal' && <Stat label="ต้องออมเดือนละ" value={`${formatBaht(required)} บาท`} />}
            <Stat label="ยอดเงินสุดท้าย" value={`${formatBaht(growth.futureValue)} บาท`} />
            <Stat label="เงินฝากรวม" value={`${formatBaht(growth.totalDeposits)} บาท`} />
            <Stat label="ดอกเบี้ยรวม" value={`${formatBaht(growth.totalInterest)} บาท`} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">ปีที่</th>
                  <th className="px-3 py-2 text-right">เงินฝากสะสม</th>
                  <th className="px-3 py-2 text-right">ดอกเบี้ยสะสม</th>
                  <th className="px-3 py-2 text-right">ยอดคงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {growth.rows.map((row) => (
                  <tr key={row.year} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.year}</td>
                    <td className="px-3 py-2 text-right">{formatBaht(row.deposits)}</td>
                    <td className="px-3 py-2 text-right">{formatBaht(row.interest)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatBaht(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 7: ลงทะเบียน**

`src/tools/registry.ts`: `import { compoundInterestMeta } from './finance/compound-interest/meta';` แล้วใส่ `compoundInterestMeta` ต่อท้าย `vatWhtMeta` ใน array `tools`

`src/tools/loaders.ts`: `'compound-interest': () => import('./finance/compound-interest/Tool'),`

- [ ] **Step 8: ทดสอบและ commit**

Run: `npm test && npm run typecheck && npm run build`

```bash
git add src/tools/finance/compound-interest src/tools/registry.ts src/tools/loaders.ts
git commit -m "feat(tool): compound-interest — ดอกเบี้ยทบต้นและเป้าหมายการออม

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: เครื่องมือ "นับคำ/ตัวอักษรภาษาไทย" (`word-count`, free)

ใช้ `Intl.Segmenter` ตัดคำภาษาไทย (รองรับใน Node 22 และเบราว์เซอร์ทันสมัยทุกตัว) พร้อม fallback เป็นการแยกด้วยช่องว่างเมื่อ runtime ไม่มี Segmenter

**Files:**
- Create: `src/tools/text/word-count/logic.ts`, `meta.ts`, `Tool.tsx`
- Test: `src/tools/text/word-count/logic.test.ts`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Produces: `countText(text: string): CountResult`

- [ ] **Step 1: เขียน test**

หมายเหตุสำคัญเรื่องการทดสอบ: จำนวนคำภาษาไทยที่ `Intl.Segmenter` ตัดได้ขึ้นกับเวอร์ชัน ICU ของ runtime จึงยืนยันเป็นช่วงสำหรับข้อความไทย และยืนยันค่าเป๊ะเฉพาะภาษาอังกฤษกับตัวนับที่ไม่พึ่ง ICU

สร้าง `src/tools/text/word-count/logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { countText } from './logic';

describe('countText', () => {
  it('ข้อความว่างได้ 0 ทุกค่า', () => {
    const r = countText('');
    expect(r.characters).toBe(0);
    expect(r.charactersNoSpaces).toBe(0);
    expect(r.words).toBe(0);
    expect(r.lines).toBe(0);
    expect(r.paragraphs).toBe(0);
    expect(r.readingMinutes).toBe(0);
  });

  it('นับตัวอักษรรวมและไม่รวมช่องว่าง', () => {
    const r = countText('ก ข ค');
    expect(r.characters).toBe(5);
    expect(r.charactersNoSpaces).toBe(3);
  });

  it('นับสระและวรรณยุกต์ไทยเป็นตัวอักษรแยก แต่นับเป็น 1 พยางค์ที่มองเห็น', () => {
    const r = countText('ที่');
    expect(r.characters).toBe(3);
    expect(r.graphemes).toBe(1);
  });

  it('นับคำภาษาอังกฤษได้เป๊ะ', () => {
    expect(countText('hello world').words).toBe(2);
    expect(countText('  hello   world  ').words).toBe(2);
  });

  it('ตัดคำภาษาไทยที่ไม่มีช่องว่างได้มากกว่า 1 คำ', () => {
    const r = countText('สวัสดีครับผมชื่อสมชาย');
    expect(r.words).toBeGreaterThanOrEqual(4);
    expect(r.words).toBeLessThanOrEqual(8);
  });

  it('นับบรรทัดและย่อหน้า', () => {
    const r = countText('บรรทัดหนึ่ง\nบรรทัดสอง\n\nย่อหน้าใหม่');
    expect(r.lines).toBe(4);
    expect(r.paragraphs).toBe(2);
  });

  it('รองรับ CRLF', () => {
    expect(countText('a\r\nb').lines).toBe(2);
  });

  it('นับประโยคจากเครื่องหมายจบประโยค', () => {
    expect(countText('Hello. How are you? Fine!').sentences).toBe(3);
  });

  it('เวลาอ่านปัดขึ้นเป็นนาที', () => {
    const text = Array.from({ length: 250 }, () => 'word').join(' ');
    expect(countText(text).words).toBe(250);
    expect(countText(text).readingMinutes).toBe(2); // 200 คำ/นาที
  });
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `npx vitest run src/tools/text/word-count`
Expected: FAIL — resolve `./logic` ไม่ได้

- [ ] **Step 3: เขียน logic.ts**

สร้าง `src/tools/text/word-count/logic.ts`:

```ts
export interface CountResult {
  /** จำนวน code point รวมช่องว่าง (สระ/วรรณยุกต์นับแยก) */
  characters: number;
  charactersNoSpaces: number;
  /** จำนวนตัวอักษรที่ตาเห็น (รวมสระ/วรรณยุกต์เข้ากับพยัญชนะแล้ว) */
  graphemes: number;
  words: number;
  lines: number;
  paragraphs: number;
  sentences: number;
  /** ปัดขึ้น ที่ 200 คำ/นาที */
  readingMinutes: number;
}

const WORDS_PER_MINUTE = 200;

function countGraphemes(text: string): number {
  const Seg = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (!Seg) return Array.from(text).length;
  return [...new Seg('th', { granularity: 'grapheme' }).segment(text)].length;
}

function countWords(text: string): number {
  if (!text.trim()) return 0;
  const Seg = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (!Seg) return text.trim().split(/\s+/).length;
  const segments = [...new Seg('th', { granularity: 'word' }).segment(text)];
  return segments.filter((s) => s.isWordLike).length;
}

export function countText(text: string): CountResult {
  const characters = Array.from(text).length;
  const charactersNoSpaces = Array.from(text.replace(/\s/g, '')).length;
  const words = countWords(text);
  const lines = text === '' ? 0 : text.split(/\r\n|\r|\n/).length;
  const paragraphs = text
    .split(/(?:\r\n|\r|\n){2,}/)
    .filter((p) => p.trim() !== '').length;
  const sentences = text
    .split(/[.!?…]+|(?:\r\n|\r|\n)+/)
    .filter((s) => s.trim() !== '').length;

  return {
    characters,
    charactersNoSpaces,
    graphemes: countGraphemes(text),
    words,
    lines,
    paragraphs,
    sentences,
    readingMinutes: words === 0 ? 0 : Math.ceil(words / WORDS_PER_MINUTE),
  };
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `npx vitest run src/tools/text/word-count`
Expected: PASS ทุกข้อ

ถ้าข้อ "ตัดคำภาษาไทย" fail เพราะ Node ในเครื่องไม่มี ICU เต็ม (`node -p "new Intl.Segmenter('th',{granularity:'word'})"` โยน error) ให้รายงานกลับก่อนแก้ test — ห้ามลด assertion ลงเงียบ ๆ

- [ ] **Step 5: เขียน meta.ts**

สร้าง `src/tools/text/word-count/meta.ts`:

```ts
import type { ToolMeta } from '@/tools/types';

export const wordCountMeta: ToolMeta = {
  slug: 'word-count',
  name: 'นับคำและตัวอักษรภาษาไทย',
  nameEn: 'Thai Word & Character Counter',
  category: 'text',
  tier: 'free',
  description:
    'นับจำนวนคำ ตัวอักษร บรรทัด ย่อหน้า และประโยคของข้อความภาษาไทย ตัดคำไทยที่เขียนติดกันโดยไม่มีช่องว่างได้ พร้อมประมาณเวลาอ่าน',
  keywords: ['นับคำ', 'นับตัวอักษร', 'นับคำภาษาไทย', 'ตัดคำไทย', 'นับจำนวนตัวอักษรออนไลน์'],
  howTo: [
    'พิมพ์หรือวางข้อความลงในกล่องข้อความ',
    'ระบบนับคำ ตัวอักษร บรรทัด ย่อหน้าให้ทันทีขณะพิมพ์',
    'ใช้ตัวเลข "ตัวอักษรที่ตาเห็น" เมื่อต้องนับตามจำนวนที่แสดงผล เช่น จำกัดความยาวโพสต์',
  ],
  faq: [
    { q: 'นับคำภาษาไทยที่ไม่มีช่องว่างได้อย่างไร', a: 'ใช้ตัวตัดคำมาตรฐานของเบราว์เซอร์ (Intl.Segmenter) ซึ่งใช้พจนานุกรมภาษาไทย จึงแยก "สวัสดีครับ" เป็น "สวัสดี" และ "ครับ" ได้โดยไม่ต้องมีช่องว่าง' },
    { q: 'ทำไม "ที่" นับได้ 3 ตัวอักษร', a: 'เพราะสระและวรรณยุกต์ไทยเป็นอักขระแยกในระบบคอมพิวเตอร์ เครื่องมือจึงแสดงทั้งจำนวนอักขระจริงและจำนวนตัวอักษรที่ตาเห็น ให้เลือกใช้ตามงาน' },
    { q: 'ข้อมูลที่พิมพ์ถูกส่งขึ้นเซิร์ฟเวอร์ไหม', a: 'ไม่ ข้อความทั้งหมดประมวลผลในเบราว์เซอร์ของคุณเท่านั้น ไม่มีการส่งออกไปที่ใด' },
  ],
};
```

- [ ] **Step 6: เขียน Tool.tsx**

สร้าง `src/tools/text/word-count/Tool.tsx`:

```tsx
import { useState } from 'react';
import { countText } from './logic';
import { formatNumber } from '@/lib/format';
import { Field, Stat, Textarea } from '@/components/ui';

export default function WordCountTool() {
  const [text, setText] = useState('');
  const r = countText(text);

  return (
    <div className="space-y-4">
      <Field label="ข้อความ" htmlFor="text" hint="ประมวลผลในเบราว์เซอร์ ไม่มีการส่งข้อมูลออก">
        <Textarea id="text" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์หรือวางข้อความที่นี่…" autoFocus />
      </Field>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="คำ" value={formatNumber(r.words)} />
        <Stat label="ตัวอักษร (รวมช่องว่าง)" value={formatNumber(r.characters)} />
        <Stat label="ตัวอักษร (ไม่รวมช่องว่าง)" value={formatNumber(r.charactersNoSpaces)} />
        <Stat label="ตัวอักษรที่ตาเห็น" value={formatNumber(r.graphemes)} />
        <Stat label="บรรทัด" value={formatNumber(r.lines)} />
        <Stat label="ย่อหน้า" value={formatNumber(r.paragraphs)} />
        <Stat label="ประโยค" value={formatNumber(r.sentences)} />
        <Stat label="เวลาอ่านโดยประมาณ" value={`${formatNumber(r.readingMinutes)} นาที`} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: ลงทะเบียน**

`src/tools/registry.ts`: `import { wordCountMeta } from './text/word-count/meta';` แล้วใส่ `wordCountMeta` ต่อท้าย `bahtTextMeta` ใน array `tools`

`src/tools/loaders.ts`: `'word-count': () => import('./text/word-count/Tool'),`

- [ ] **Step 8: ทดสอบและ commit**

Run: `npm test && npm run typecheck && npm run build`

```bash
git add src/tools/text/word-count src/tools/registry.ts src/tools/loaders.ts
git commit -m "feat(tool): word-count — นับคำและตัวอักษรภาษาไทยด้วย Intl.Segmenter

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: เครื่องมือ "เลขไทย ↔ อารบิก และตัวพิมพ์ใหญ่/เล็ก" (`thai-numerals`, free)

**Files:**
- Create: `src/tools/text/thai-numerals/logic.ts`, `meta.ts`, `Tool.tsx`
- Test: `src/tools/text/thai-numerals/logic.test.ts`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Produces: `toThaiDigits`, `toArabicDigits`, `transformCase(text: string, mode: CaseMode): string`, `type CaseMode = 'upper' | 'lower' | 'title' | 'sentence'`

- [ ] **Step 1: เขียน test**

สร้าง `src/tools/text/thai-numerals/logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { toThaiDigits, toArabicDigits, transformCase } from './logic';

describe('toThaiDigits', () => {
  it('แปลงเลขอารบิกเป็นเลขไทย', () => {
    expect(toThaiDigits('0123456789')).toBe('๐๑๒๓๔๕๖๗๘๙');
  });

  it('คงตัวอักษรอื่นไว้เหมือนเดิม', () => {
    expect(toThaiDigits('บ้านเลขที่ 25/3')).toBe('บ้านเลขที่ ๒๕/๓');
  });

  it('ข้อความว่างได้ข้อความว่าง', () => {
    expect(toThaiDigits('')).toBe('');
  });
});

describe('toArabicDigits', () => {
  it('แปลงเลขไทยเป็นอารบิก', () => {
    expect(toArabicDigits('๐๑๒๓๔๕๖๗๘๙')).toBe('0123456789');
  });

  it('แปลงกลับไปกลับมาแล้วได้ค่าเดิม', () => {
    const s = 'ปี พ.ศ. 2569 วันที่ 7';
    expect(toArabicDigits(toThaiDigits(s))).toBe(s);
  });
});

describe('transformCase', () => {
  it('ตัวพิมพ์ใหญ่ทั้งหมด', () => {
    expect(transformCase('hello ไทย world', 'upper')).toBe('HELLO ไทย WORLD');
  });

  it('ตัวพิมพ์เล็กทั้งหมด', () => {
    expect(transformCase('HELLO World', 'lower')).toBe('hello world');
  });

  it('ขึ้นต้นคำด้วยตัวใหญ่', () => {
    expect(transformCase('hello world', 'title')).toBe('Hello World');
    expect(transformCase('HELLO WORLD', 'title')).toBe('Hello World');
  });

  it('ขึ้นต้นประโยคด้วยตัวใหญ่', () => {
    expect(transformCase('hello world. how are you?', 'sentence')).toBe('Hello world. How are you?');
  });

  it('ไม่ทำให้ข้อความไทยเปลี่ยน', () => {
    expect(transformCase('สวัสดีครับ', 'title')).toBe('สวัสดีครับ');
  });
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `npx vitest run src/tools/text/thai-numerals`
Expected: FAIL — resolve `./logic` ไม่ได้

- [ ] **Step 3: เขียน logic.ts**

สร้าง `src/tools/text/thai-numerals/logic.ts`:

```ts
const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';

export type CaseMode = 'upper' | 'lower' | 'title' | 'sentence';

export function toThaiDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) => THAI_DIGITS[Number(d)]);
}

export function toArabicDigits(text: string): string {
  return text.replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)));
}

export function transformCase(text: string, mode: CaseMode): string {
  switch (mode) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'title':
      return text.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
    case 'sentence': {
      const lower = text.toLowerCase();
      // ตัวแรกของข้อความ และตัวแรกหลังเครื่องหมายจบประโยค
      return lower.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, prefix: string, c: string) => prefix + c.toUpperCase());
    }
  }
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `npx vitest run src/tools/text/thai-numerals`
Expected: PASS ทุกข้อ

- [ ] **Step 5: เขียน meta.ts**

สร้าง `src/tools/text/thai-numerals/meta.ts`:

```ts
import type { ToolMeta } from '@/tools/types';

export const thaiNumeralsMeta: ToolMeta = {
  slug: 'thai-numerals',
  name: 'แปลงเลขไทย ↔ เลขอารบิก และเปลี่ยนตัวพิมพ์',
  nameEn: 'Thai Numerals & Text Case Converter',
  category: 'text',
  tier: 'free',
  description:
    'แปลงเลขอารบิก 0-9 เป็นเลขไทย ๐-๙ และแปลงกลับ พร้อมเปลี่ยนตัวพิมพ์ใหญ่ เล็ก ขึ้นต้นคำ หรือขึ้นต้นประโยค ใช้กับหนังสือราชการและงานเอกสารไทย',
  keywords: ['เลขไทย', 'แปลงเลขไทยเป็นเลขอารบิก', 'เลขอารบิกเป็นเลขไทย', 'ตัวพิมพ์ใหญ่', 'แปลงตัวอักษร'],
  howTo: [
    'วางข้อความลงในกล่องด้านบน',
    'เลือกการแปลงที่ต้องการ เช่น เป็นเลขไทย หรือเป็นตัวพิมพ์ใหญ่',
    'กด "คัดลอก" เพื่อนำผลลัพธ์ไปใช้ต่อ',
  ],
  faq: [
    { q: 'เครื่องมือแปลงเฉพาะตัวเลขหรือทั้งข้อความ', a: 'แปลงเฉพาะตัวเลขในข้อความ ตัวอักษรและเครื่องหมายอื่นคงเดิมทั้งหมด จึงวางทั้งย่อหน้าได้เลย' },
    { q: 'ทำไมข้อความภาษาไทยไม่เปลี่ยนเมื่อเลือกตัวพิมพ์ใหญ่', a: 'ภาษาไทยไม่มีตัวพิมพ์ใหญ่-เล็ก การแปลงตัวพิมพ์จึงมีผลกับอักษรโรมันเท่านั้น' },
    { q: 'ใช้เลขไทยในหนังสือราชการอย่างไร', a: 'ระเบียบงานสารบรรณกำหนดให้ใช้เลขไทยในหนังสือราชการ เช่น วันที่และเลขที่หนังสือ เครื่องมือนี้ช่วยแปลงทั้งฉบับได้ในครั้งเดียว' },
  ],
};
```

- [ ] **Step 6: เขียน Tool.tsx**

สร้าง `src/tools/text/thai-numerals/Tool.tsx`:

```tsx
import { useState } from 'react';
import { toThaiDigits, toArabicDigits, transformCase, type CaseMode } from './logic';
import { Button, Field, Textarea } from '@/components/ui';

type Action = 'thai' | 'arabic' | CaseMode;

const ACTIONS: { id: Action; label: string }[] = [
  { id: 'thai', label: 'เป็นเลขไทย ๐-๙' },
  { id: 'arabic', label: 'เป็นเลขอารบิก 0-9' },
  { id: 'upper', label: 'ตัวพิมพ์ใหญ่' },
  { id: 'lower', label: 'ตัวพิมพ์เล็ก' },
  { id: 'title', label: 'ขึ้นต้นคำด้วยตัวใหญ่' },
  { id: 'sentence', label: 'ขึ้นต้นประโยคด้วยตัวใหญ่' },
];

function apply(text: string, action: Action): string {
  if (action === 'thai') return toThaiDigits(text);
  if (action === 'arabic') return toArabicDigits(text);
  return transformCase(text, action);
}

export default function ThaiNumeralsTool() {
  const [text, setText] = useState('ประกาศ ณ วันที่ 7 กันยายน 2569');
  const [action, setAction] = useState<Action>('thai');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const result = apply(text, action);

  async function copy() {
    try {
      await navigator.clipboard.writeText(result);
      setCopyError('');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError('คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง');
    }
  }

  return (
    <div className="space-y-4">
      <Field label="ข้อความต้นฉบับ" htmlFor="src">
        <Textarea id="src" rows={6} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </Field>

      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <Button key={a.id} variant={a.id === action ? 'primary' : 'secondary'} onClick={() => setAction(a.id)}>
            {a.label}
          </Button>
        ))}
      </div>

      <Field label="ผลลัพธ์" htmlFor="out">
        <Textarea id="out" rows={6} value={result} readOnly />
      </Field>

      <Button onClick={copy} disabled={!result}>{copied ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}</Button>
      {copyError && <p className="text-sm text-red-600">{copyError}</p>}
    </div>
  );
}
```

- [ ] **Step 7: ลงทะเบียน**

`src/tools/registry.ts`: `import { thaiNumeralsMeta } from './text/thai-numerals/meta';` แล้วใส่ `thaiNumeralsMeta` ต่อท้าย `wordCountMeta` ใน array `tools`

`src/tools/loaders.ts`: `'thai-numerals': () => import('./text/thai-numerals/Tool'),`

- [ ] **Step 8: ทดสอบและ commit**

Run: `npm test && npm run typecheck && npm run build`

```bash
git add src/tools/text/thai-numerals src/tools/registry.ts src/tools/loaders.ts
git commit -m "feat(tool): thai-numerals — แปลงเลขไทย/อารบิก และเปลี่ยนตัวพิมพ์

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: เครื่องมือ "จัดการบรรทัด: ลบซ้ำ เรียง ตัดช่องว่าง" (`text-lines`, free)

**Files:**
- Create: `src/tools/text/text-lines/logic.ts`, `meta.ts`, `Tool.tsx`
- Test: `src/tools/text/text-lines/logic.test.ts`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Produces: `processLines(text: string, options: LineOptions): LineResult`, `DEFAULT_LINE_OPTIONS: LineOptions`

- [ ] **Step 1: เขียน test**

สร้าง `src/tools/text/text-lines/logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { processLines, DEFAULT_LINE_OPTIONS, type LineOptions } from './logic';

const opts = (over: Partial<LineOptions> = {}): LineOptions => ({ ...DEFAULT_LINE_OPTIONS, ...over });

describe('processLines', () => {
  it('ค่าเริ่มต้นไม่เปลี่ยนข้อความ', () => {
    const r = processLines('b\na\nb', opts());
    expect(r.text).toBe('b\na\nb');
    expect(r.stats).toEqual({ input: 3, output: 3, removed: 0 });
  });

  it('ลบบรรทัดซ้ำ เก็บอันแรกไว้', () => {
    const r = processLines('b\na\nb\na', opts({ unique: true }));
    expect(r.text).toBe('b\na');
    expect(r.stats.removed).toBe(2);
  });

  it('ลบซ้ำแบบไม่สนตัวพิมพ์', () => {
    expect(processLines('Apple\napple', opts({ unique: true })).text).toBe('Apple\napple');
    expect(processLines('Apple\napple', opts({ unique: true, caseInsensitive: true })).text).toBe('Apple');
  });

  it('ตัดช่องว่างหัวท้ายบรรทัด', () => {
    expect(processLines('  a  \n b', opts({ trim: true })).text).toBe('a\nb');
  });

  it('ลบบรรทัดว่าง', () => {
    const r = processLines('a\n\n\nb', opts({ removeEmpty: true }));
    expect(r.text).toBe('a\nb');
    expect(r.stats.output).toBe(2);
  });

  it('เรียงจากน้อยไปมากด้วยลำดับภาษาไทย', () => {
    expect(processLines('ขนม\nกล้วย\nคน', opts({ sort: 'asc' })).text).toBe('กล้วย\nขนม\nคน');
  });

  it('เรียงจากมากไปน้อย', () => {
    expect(processLines('a\nc\nb', opts({ sort: 'desc' })).text).toBe('c\nb\na');
  });

  it('กลับลำดับบรรทัด', () => {
    expect(processLines('a\nb\nc', opts({ reverse: true })).text).toBe('c\nb\na');
  });

  it('ใส่เลขลำดับหน้าบรรทัด', () => {
    expect(processLines('a\nb', opts({ addNumbers: true })).text).toBe('1. a\n2. b');
  });

  it('รวมหลายตัวเลือก: ตัดช่องว่าง + ลบว่าง + ลบซ้ำ + เรียง', () => {
    const r = processLines('  b \n\n a\nb  \n', opts({ trim: true, removeEmpty: true, unique: true, sort: 'asc' }));
    expect(r.text).toBe('a\nb');
    expect(r.stats.input).toBe(5);
    expect(r.stats.output).toBe(2);
  });

  it('รองรับ CRLF และคืนค่าเป็น LF', () => {
    expect(processLines('a\r\nb', opts()).text).toBe('a\nb');
  });

  it('ข้อความว่างได้ผลว่าง', () => {
    const r = processLines('', opts({ removeEmpty: true }));
    expect(r.text).toBe('');
    expect(r.stats).toEqual({ input: 0, output: 0, removed: 0 });
  });
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `npx vitest run src/tools/text/text-lines`
Expected: FAIL — resolve `./logic` ไม่ได้

- [ ] **Step 3: เขียน logic.ts**

สร้าง `src/tools/text/text-lines/logic.ts`:

```ts
export interface LineOptions {
  trim: boolean;
  removeEmpty: boolean;
  unique: boolean;
  /** ใช้กับทั้ง unique และ sort */
  caseInsensitive: boolean;
  sort: 'none' | 'asc' | 'desc';
  reverse: boolean;
  addNumbers: boolean;
}

export interface LineResult {
  text: string;
  stats: { input: number; output: number; removed: number };
}

export const DEFAULT_LINE_OPTIONS: LineOptions = {
  trim: false,
  removeEmpty: false,
  unique: false,
  caseInsensitive: false,
  sort: 'none',
  reverse: false,
  addNumbers: false,
};

const collator = new Intl.Collator('th');

export function processLines(text: string, options: LineOptions): LineResult {
  if (text === '') return { text: '', stats: { input: 0, output: 0, removed: 0 } };

  let lines = text.split(/\r\n|\r|\n/);
  const input = lines.length;

  if (options.trim) lines = lines.map((l) => l.trim());
  if (options.removeEmpty) lines = lines.filter((l) => l.trim() !== '');

  if (options.unique) {
    const seen = new Set<string>();
    lines = lines.filter((l) => {
      const key = options.caseInsensitive ? l.toLowerCase() : l;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (options.sort !== 'none') {
    const dir = options.sort === 'asc' ? 1 : -1;
    lines = [...lines].sort((a, b) => {
      const x = options.caseInsensitive ? a.toLowerCase() : a;
      const y = options.caseInsensitive ? b.toLowerCase() : b;
      return dir * collator.compare(x, y);
    });
  }

  if (options.reverse) lines = [...lines].reverse();

  const output = lines.length;
  if (options.addNumbers) lines = lines.map((l, i) => `${i + 1}. ${l}`);

  return { text: lines.join('\n'), stats: { input, output, removed: input - output } };
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `npx vitest run src/tools/text/text-lines`
Expected: PASS ทุกข้อ

- [ ] **Step 5: เขียน meta.ts**

สร้าง `src/tools/text/text-lines/meta.ts`:

```ts
import type { ToolMeta } from '@/tools/types';

export const textLinesMeta: ToolMeta = {
  slug: 'text-lines',
  name: 'จัดการบรรทัด: ลบบรรทัดซ้ำ เรียงลำดับ ตัดช่องว่าง',
  nameEn: 'Line Tools — Dedupe, Sort, Trim',
  category: 'text',
  tier: 'free',
  description:
    'ลบบรรทัดที่ซ้ำกัน เรียงลำดับ ก-ฮ หรือ A-Z ตัดช่องว่างหัวท้าย ลบบรรทัดว่าง กลับลำดับ และใส่เลขลำดับ ทำได้พร้อมกันหลายอย่างในครั้งเดียว',
  keywords: ['ลบบรรทัดซ้ำ', 'เรียงลำดับข้อความ', 'ลบบรรทัดว่าง', 'ตัดช่องว่าง', 'จัดการรายการข้อความ'],
  howTo: [
    'วางรายการข้อความ บรรทัดละ 1 รายการ',
    'ติ๊กตัวเลือกที่ต้องการ เช่น ลบบรรทัดซ้ำ และเรียงลำดับ',
    'คัดลอกผลลัพธ์ไปใช้ต่อ พร้อมดูสรุปว่าลบไปกี่บรรทัด',
  ],
  faq: [
    { q: 'เรียงภาษาไทยถูกต้องตามพจนานุกรมไหม', a: 'ใช้การเรียงลำดับมาตรฐานภาษาไทยของเบราว์เซอร์ (Intl.Collator) จึงเรียง ก ข ค ได้ถูกต้อง ไม่ใช่การเรียงตามรหัสอักขระ' },
    { q: 'ลบบรรทัดซ้ำแล้วเก็บบรรทัดไหนไว้', a: 'เก็บบรรทัดที่พบครั้งแรกไว้ และตัดบรรทัดซ้ำที่ตามมาออก หากติ๊ก "ไม่สนตัวพิมพ์ใหญ่-เล็ก" จะถือว่า Apple และ apple ซ้ำกัน' },
    { q: 'ใช้กับรายการอีเมลหรือเบอร์โทรได้ไหม', a: 'ได้ และปลอดภัย เพราะประมวลผลในเบราว์เซอร์ทั้งหมด ข้อมูลไม่ถูกส่งออกไปที่ใด' },
  ],
};
```

- [ ] **Step 6: เขียน Tool.tsx**

สร้าง `src/tools/text/text-lines/Tool.tsx`:

```tsx
import { useState } from 'react';
import { processLines, DEFAULT_LINE_OPTIONS, type LineOptions } from './logic';
import { Button, Field, Select, Stat, Textarea } from '@/components/ui';

const TOGGLES: { key: keyof LineOptions; label: string }[] = [
  { key: 'trim', label: 'ตัดช่องว่างหัวท้าย' },
  { key: 'removeEmpty', label: 'ลบบรรทัดว่าง' },
  { key: 'unique', label: 'ลบบรรทัดซ้ำ' },
  { key: 'caseInsensitive', label: 'ไม่สนตัวพิมพ์ใหญ่-เล็ก' },
  { key: 'reverse', label: 'กลับลำดับ' },
  { key: 'addNumbers', label: 'ใส่เลขลำดับ' },
];

export default function TextLinesTool() {
  const [text, setText] = useState('');
  const [options, setOptions] = useState<LineOptions>(DEFAULT_LINE_OPTIONS);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const result = processLines(text, options);

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.text);
      setCopyError('');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError('คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง');
    }
  }

  return (
    <div className="space-y-4">
      <Field label="ข้อความต้นฉบับ" htmlFor="src" hint="บรรทัดละ 1 รายการ">
        <Textarea id="src" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="วางรายการที่นี่…" autoFocus />
      </Field>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={options[t.key] as boolean}
                onChange={(e) => setOptions({ ...options, [t.key]: e.target.checked })}
              />
              {t.label}
            </label>
          ))}
        </div>
        <div className="w-48">
          <Field label="เรียงลำดับ" htmlFor="sort">
            <Select id="sort" value={options.sort} onChange={(e) => setOptions({ ...options, sort: e.target.value as LineOptions['sort'] })}>
              <option value="none">ไม่เรียง</option>
              <option value="asc">ก-ฮ / A-Z</option>
              <option value="desc">ฮ-ก / Z-A</option>
            </Select>
          </Field>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="บรรทัดเข้า" value={result.stats.input} />
        <Stat label="บรรทัดออก" value={result.stats.output} />
        <Stat label="ลบออก" value={result.stats.removed} />
      </div>

      <Field label="ผลลัพธ์" htmlFor="out">
        <Textarea id="out" rows={8} value={result.text} readOnly />
      </Field>

      <Button onClick={copy} disabled={!result.text}>{copied ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}</Button>
      {copyError && <p className="text-sm text-red-600">{copyError}</p>}
    </div>
  );
}
```

- [ ] **Step 7: ลงทะเบียน**

`src/tools/registry.ts`: `import { textLinesMeta } from './text/text-lines/meta';` แล้วใส่ `textLinesMeta` ต่อท้าย `thaiNumeralsMeta` ใน array `tools`

`src/tools/loaders.ts`: `'text-lines': () => import('./text/text-lines/Tool'),`

- [ ] **Step 8: ทดสอบและ commit**

Run: `npm test && npm run typecheck && npm run build`

```bash
git add src/tools/text/text-lines src/tools/registry.ts src/tools/loaders.ts
git commit -m "feat(tool): text-lines — ลบบรรทัดซ้ำ เรียงลำดับ ตัดช่องว่าง

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: เครื่องมือ "ตรวจเลขบัตรประชาชน 13 หลัก" (`thai-id-check`, free)

สูตร checksum: ผลรวมของ `หลักที่ i × (13 − i)` สำหรับ 12 หลักแรก (i เริ่มที่ 0) แล้วหลักตรวจสอบ = `(11 − ผลรวม mod 11) mod 10`

**Files:**
- Create: `src/tools/text/thai-id-check/logic.ts`, `meta.ts`, `Tool.tsx`
- Test: `src/tools/text/thai-id-check/logic.test.ts`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Produces: `idCheckDigit(first12: string): number`, `validateThaiId(input: string): IdValidation`, `formatThaiId(id13: string): string`, `randomThaiId(rand?: () => number): string`

- [ ] **Step 1: เขียน test**

สร้าง `src/tools/text/thai-id-check/logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { idCheckDigit, validateThaiId, formatThaiId, randomThaiId } from './logic';

describe('idCheckDigit', () => {
  it('คำนวณหลักตรวจสอบจาก 12 หลักแรก', () => {
    expect(idCheckDigit('123456789012')).toBe(1);
    expect(idCheckDigit('100000000000')).toBe(9);
  });

  it('ต้องเป็นตัวเลข 12 หลักเท่านั้น', () => {
    expect(() => idCheckDigit('12345')).toThrow();
    expect(() => idCheckDigit('12345678901a')).toThrow();
  });
});

describe('validateThaiId', () => {
  it('เลขถูกต้อง', () => {
    const r = validateThaiId('1234567890121');
    expect(r.valid).toBe(true);
    expect(r.normalized).toBe('1234567890121');
    expect(r.formatted).toBe('1-2345-67890-12-1');
    expect(r.error).toBeUndefined();
  });

  it('ยอมรับรูปแบบที่มีขีดและช่องว่าง', () => {
    expect(validateThaiId('1-2345-67890-12-1').valid).toBe(true);
    expect(validateThaiId(' 1234 5678 9012 1 ').valid).toBe(true);
  });

  it('หลักตรวจสอบผิด → ไม่ถูกต้อง', () => {
    const r = validateThaiId('1234567890122');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('หลักตรวจสอบ');
  });

  it('จำนวนหลักไม่ครบ → ไม่ถูกต้อง', () => {
    const r = validateThaiId('12345');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('13 หลัก');
  });

  it('มีตัวอักษรที่ไม่ใช่ตัวเลข → ไม่ถูกต้อง', () => {
    expect(validateThaiId('abcdefghijklm').valid).toBe(false);
  });

  it('ข้อความว่าง → ไม่ถูกต้องแต่ไม่ throw', () => {
    expect(validateThaiId('').valid).toBe(false);
  });
});

describe('formatThaiId', () => {
  it('ใส่ขีดตามรูปแบบราชการ', () => {
    expect(formatThaiId('1234567890121')).toBe('1-2345-67890-12-1');
  });
});

describe('randomThaiId', () => {
  it('สุ่มด้วยค่าคงที่ได้ผลคาดเดาได้ และหลักตรวจสอบถูก', () => {
    expect(randomThaiId(() => 0)).toBe('1000000000009');
  });

  it('เลขที่สุ่มได้ต้องผ่านการตรวจสอบเสมอ', () => {
    for (let i = 0; i < 50; i++) {
      const id = randomThaiId();
      expect(id).toHaveLength(13);
      expect(validateThaiId(id).valid).toBe(true);
    }
  });

  it('หลักแรกอยู่ในช่วง 1-8 ตามประเภทบุคคลที่มีจริง', () => {
    for (let i = 0; i < 50; i++) {
      const first = Number(randomThaiId()[0]);
      expect(first).toBeGreaterThanOrEqual(1);
      expect(first).toBeLessThanOrEqual(8);
    }
  });
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `npx vitest run src/tools/text/thai-id-check`
Expected: FAIL — resolve `./logic` ไม่ได้

- [ ] **Step 3: เขียน logic.ts**

สร้าง `src/tools/text/thai-id-check/logic.ts`:

```ts
export interface IdValidation {
  valid: boolean;
  /** เฉพาะตัวเลขที่กรอก (ตัดขีด/ช่องว่างออก) */
  normalized: string;
  /** รูปแบบ x-xxxx-xxxxx-xx-x ถ้าครบ 13 หลัก มิฉะนั้นเท่ากับ normalized */
  formatted: string;
  error?: string;
}

export function idCheckDigit(first12: string): number {
  if (!/^\d{12}$/.test(first12)) throw new Error('ต้องเป็นตัวเลข 12 หลัก');
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (13 - i);
  return (11 - (sum % 11)) % 10;
}

export function formatThaiId(id13: string): string {
  if (!/^\d{13}$/.test(id13)) return id13;
  return `${id13[0]}-${id13.slice(1, 5)}-${id13.slice(5, 10)}-${id13.slice(10, 12)}-${id13[12]}`;
}

export function validateThaiId(input: string): IdValidation {
  const normalized = input.replace(/[\s-]/g, '');
  const base: IdValidation = { valid: false, normalized, formatted: formatThaiId(normalized) };

  if (normalized === '') return { ...base, error: 'กรุณากรอกเลขบัตรประชาชน' };
  if (!/^\d+$/.test(normalized)) return { ...base, error: 'ต้องเป็นตัวเลขเท่านั้น' };
  if (normalized.length !== 13) return { ...base, error: `ต้องมี 13 หลัก (กรอกมา ${normalized.length} หลัก)` };

  const expected = idCheckDigit(normalized.slice(0, 12));
  if (expected !== Number(normalized[12])) {
    return { ...base, error: `หลักตรวจสอบไม่ถูกต้อง (ควรเป็น ${expected})` };
  }
  return { ...base, valid: true };
}

/** สุ่มเลขบัตรที่ผ่าน checksum สำหรับใช้ทดสอบระบบเท่านั้น */
export function randomThaiId(rand: () => number = Math.random): string {
  let digits = String(1 + Math.floor(rand() * 8));
  for (let i = 1; i < 12; i++) digits += String(Math.floor(rand() * 10));
  return digits + String(idCheckDigit(digits));
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `npx vitest run src/tools/text/thai-id-check`
Expected: PASS ทุกข้อ

- [ ] **Step 5: เขียน meta.ts**

สร้าง `src/tools/text/thai-id-check/meta.ts`:

```ts
import type { ToolMeta } from '@/tools/types';

export const thaiIdCheckMeta: ToolMeta = {
  slug: 'thai-id-check',
  name: 'ตรวจสอบเลขบัตรประชาชน 13 หลัก',
  nameEn: 'Thai National ID Validator',
  category: 'text',
  tier: 'free',
  description:
    'ตรวจสอบว่าเลขประจำตัวประชาชน 13 หลักถูกต้องตามสูตรหลักตรวจสอบหรือไม่ พร้อมจัดรูปแบบใส่ขีดให้อัตโนมัติ และสุ่มเลขที่ผ่าน checksum สำหรับทดสอบระบบ',
  keywords: ['ตรวจเลขบัตรประชาชน', 'เช็คเลขบัตรประชาชน', 'checksum บัตรประชาชน', 'สุ่มเลขบัตรประชาชน', 'เลข 13 หลัก'],
  howTo: [
    'พิมพ์เลขบัตรประชาชน 13 หลัก (ใส่ขีดหรือไม่ใส่ก็ได้)',
    'ระบบตรวจหลักตรวจสอบให้ทันที พร้อมบอกว่าหลักสุดท้ายที่ถูกต้องคือเลขอะไร',
    'กด "สุ่มเลขทดสอบ" เมื่อต้องการเลขสมมติที่ผ่าน checksum สำหรับทดสอบระบบ',
  ],
  faq: [
    { q: 'ตรวจแบบนี้ยืนยันว่ามีคนนี้อยู่จริงไหม', a: 'ไม่ เครื่องมือตรวจเฉพาะความถูกต้องทางคณิตศาสตร์ของหลักตรวจสอบเท่านั้น ไม่ได้เชื่อมกับฐานข้อมูลทะเบียนราษฎร จึงบอกไม่ได้ว่าเลขนั้นออกให้ใครหรือมีอยู่จริง' },
    { q: 'หลักตรวจสอบคำนวณอย่างไร', a: 'นำเลข 12 หลักแรกคูณด้วยน้ำหนัก 13 ลดลงถึง 2 ตามลำดับ รวมผลลัพธ์ หาเศษจากการหารด้วย 11 แล้วคำนวณ (11 − เศษ) mod 10 จะได้หลักที่ 13' },
    { q: 'เลขที่สุ่มได้นำไปใช้จริงได้ไหม', a: 'ไม่ควร เลขที่สุ่มเป็นเลขสมมติที่ผ่านสูตรตรวจสอบเท่านั้น มีไว้สำหรับทดสอบฟอร์มและระบบ ไม่ใช่เลขบัตรของบุคคลใด' },
  ],
};
```

- [ ] **Step 6: เขียน Tool.tsx**

สร้าง `src/tools/text/thai-id-check/Tool.tsx`:

```tsx
import { useState } from 'react';
import { validateThaiId, randomThaiId, formatThaiId } from './logic';
import { Button, Field, Input, ResultBox } from '@/components/ui';

export default function ThaiIdCheckTool() {
  const [value, setValue] = useState('');
  const r = validateThaiId(value);
  const touched = value.trim() !== '';

  return (
    <div className="space-y-4">
      <Field label="เลขบัตรประชาชน" htmlFor="id" hint="ใส่ขีดหรือเว้นวรรคได้ ระบบตัดให้อัตโนมัติ">
        <Input id="id" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder="1-2345-67890-12-1" autoFocus />
      </Field>

      {touched && (
        <ResultBox label="ผลการตรวจสอบ">
          {r.valid ? (
            <span className="text-emerald-700">ถูกต้อง ✓ {r.formatted}</span>
          ) : (
            <span className="text-red-600">ไม่ถูกต้อง — {r.error}</span>
          )}
        </ResultBox>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setValue(formatThaiId(randomThaiId()))}>สุ่มเลขทดสอบ</Button>
        <Button variant="secondary" onClick={() => setValue('')}>ล้าง</Button>
      </div>

      <p className="text-xs text-slate-500">
        ตรวจเฉพาะสูตรหลักตรวจสอบ ไม่ได้เชื่อมกับฐานข้อมูลทะเบียนราษฎร และเลขที่กรอกไม่ถูกส่งออกจากเบราว์เซอร์
      </p>
    </div>
  );
}
```

- [ ] **Step 7: ลงทะเบียน**

`src/tools/registry.ts`: `import { thaiIdCheckMeta } from './text/thai-id-check/meta';` แล้วใส่ `thaiIdCheckMeta` ต่อท้าย `textLinesMeta` ใน array `tools`

`src/tools/loaders.ts`: `'thai-id-check': () => import('./text/thai-id-check/Tool'),`

- [ ] **Step 8: ทดสอบและ commit**

Run: `npm test && npm run typecheck && npm run build`

```bash
git add src/tools/text/thai-id-check src/tools/registry.ts src/tools/loaders.ts
git commit -m "feat(tool): thai-id-check — ตรวจสอบและสุ่มเลขบัตรประชาชน 13 หลัก

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: ตรวจในเบราว์เซอร์ + deploy

**Files:**
- Modify: ไม่มี (เว้นแต่พบบั๊กจากการตรวจ)

**Interfaces:**
- Consumes: เครื่องมือทั้ง 7 ตัวจาก Task 1–7 ที่ลงทะเบียนใน registry แล้ว

- [ ] **Step 1: ตรวจ HTML ที่ build ออกมาว่ามีเนื้อหา SEO โดยไม่ต้องรัน JS**

Run:
```bash
npm run build
grep -c "คำถามที่พบบ่อย" dist/client/t/net-salary.html dist/client/t/word-count.html dist/client/t/thai-id-check.html
grep -o "FAQPage" dist/client/t/vat-wht.html | head -1
grep -c "loc>" dist/client/sitemap-0.xml
```
Expected: ทุกไฟล์เจอ "คำถามที่พบบ่อย" อย่างน้อย 1 ครั้ง, เจอ `FAQPage`, และ sitemap มีจำนวน `<loc>` เพิ่มขึ้นจากเดิม 7 รายการ (เดิม 5 เครื่องมือ → รวม 12 เครื่องมือ)

- [ ] **Step 2: ทดสอบ 7 เครื่องมือใหม่ใน dev server**

Run: `npm run dev` แล้วเปิดทีละหน้า
- `/t/net-salary` — เปลี่ยนเงินเดือนเป็น 50000 แล้วดูว่าตัวเลขอัปเดต, ติ๊ก/ปลดประกันสังคมแล้วยอดเปลี่ยน
- `/t/vat-wht` — สลับ "รวม VAT แล้ว" แล้วดูว่าฐาน + VAT = ยอดรวมเป๊ะ
- `/t/compound-interest` — สลับโหมด "คำนวณเงินที่ต้องออม" แล้วตารางแสดงครบทุกปี
- `/t/word-count` — วางข้อความไทยยาว ๆ แล้วตัวเลขคำมากกว่า 1
- `/t/thai-numerals` — กดปุ่มทุกปุ่ม และทดสอบ "คัดลอก"
- `/t/text-lines` — ติ๊กหลายตัวเลือกพร้อมกัน
- `/t/thai-id-check` — กด "สุ่มเลขทดสอบ" แล้วต้องขึ้น "ถูกต้อง ✓" ทุกครั้ง
- `/c/finance` และ `/c/text` — เครื่องมือใหม่โผล่ครบ
- `/tools` — ค้นหาคำว่า "vat" และ "บัตรประชาชน" แล้วเจอเครื่องมือที่ถูกต้อง

Expected: ไม่มี error ใน console และทุกข้อเป็นไปตามที่ระบุ

- [ ] **Step 3: Deploy**

Run: `npm run deploy`
Expected: deploy สำเร็จ และแสดง `toolsiam.com (custom domain)`

- [ ] **Step 4: ตรวจ production**

Run:
```bash
for p in /t/net-salary /t/vat-wht /t/compound-interest /t/word-count /t/thai-numerals /t/text-lines /t/thai-id-check /c/text /c/finance; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' "https://toolsiam.com$p")  $p"
done
```
Expected: `200` ทุกบรรทัด

- [ ] **Step 5: Commit สรุปเฟส (ถ้ามีไฟล์ค้าง)**

```bash
git status --short
```
ถ้าไม่มีอะไรค้างก็ข้ามได้ — งานทั้งหมด commit ไปแล้วราย Task

---

## Self-review (ทำแล้ว)

**1. Spec coverage** — spec หัวข้อ 4 ระบุหมวดการเงิน 5 ตัว (มีแล้ว 2 จาก Phase 1: ภาษี, ผ่อน) → แผนนี้เติมครบทั้ง 3 ที่เหลือ (เงินเดือนสุทธิ, VAT/หัก ณ ที่จ่าย, ดอกเบี้ยทบต้น) ✓ หมวดข้อความไทย 6 ตัว (มีแล้ว 1: บาทถ้วน) → แผนนี้เติม 4 ตัว (นับคำ, เลขไทย+ตัวพิมพ์, ลบบรรทัดซ้ำ/เรียง/ตัดช่องว่าง, เลขบัตรประชาชน) เหลือ **ถอดอักษรไทยเป็นโรมัน RTGS (premium)** ที่ยกไปแผน 4d โดยตั้งใจ เพราะต้องมีตารางถอดเสียงและกฎการสะกดที่ต้องออกแบบแยก ✓ หมวดวันที่/QR/รูป/PDF/dev/web อยู่ในแผน 4b–4d ✓ AdSlot + analytics อยู่ในแผน 4d ✓

**2. Placeholder scan** — ไม่มี TBD/TODO/"similar to Task N"; ทุก step ที่ต้องเขียนโค้ดมี code block เต็ม ทุก test มี assertion จริงพร้อมค่าที่คำนวณมือมาแล้ว (2,050 บาท, 112,682.50, 934.58/65.42, check digit 1 และ 9) ✓

**3. Type consistency** — `NetSalaryInput`/`NetSalaryResult`, `InvoiceInput`/`InvoiceResult`, `CompoundInput`/`CompoundResult`/`GoalInput`, `CountResult`, `CaseMode`, `LineOptions`/`LineResult`, `IdValidation` ชื่อ field ใน test ตรงกับ interface ใน logic ทุกตัว; `calculateTax` ถูกเรียกด้วย `TaxInput` ครบทุก field ตามที่ประกาศไว้ใน `thai-income-tax/logic.ts` (ตรวจแล้วว่าไม่ขาด `childrenBorn2018Plus`, `thaiEsg`, `withheldTax`) ✓; ชื่อ export ของ meta ใน registry (`netSalaryMeta`, `vatWhtMeta`, `compoundInterestMeta`, `wordCountMeta`, `thaiNumeralsMeta`, `textLinesMeta`, `thaiIdCheckMeta`) ตรงกับที่ประกาศในแต่ละ `meta.ts` ✓

**ความเสี่ยงที่รู้ตัว:** test "ตัดคำภาษาไทย" ของ Task 4 พึ่ง ICU ของ Node — ระบุ assertion เป็นช่วงและมีคำสั่งตรวจ ICU ไว้ใน Step 4 แล้ว
