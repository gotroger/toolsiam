# ToolSiam Phase 4b — หมวดวันที่/เวลา 3 ตัว + QR อีก 2 ตัว — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มเครื่องมือ 5 ตัว (คำนวณอายุ/นับวัน, แปลง พ.ศ.↔ค.ศ.+วันในสัปดาห์, วันหยุดราชการ/ธนาคาร 2569 + นับวันทำการ, สร้าง QR ทั่วไป/WiFi/vCard, อ่าน QR จากรูป) ให้เว็บมี 17 เครื่องมือ และเปิดหมวด "วันที่และเวลา" ที่ยังว่างอยู่

**Architecture:** ตาม pattern เดิมของ Phase 1/4a ทุกประการ — เครื่องมือ 1 ตัว = โฟลเดอร์ `src/tools/<category>/<slug>/` มี `logic.ts` (pure, ไม่แตะ DOM), `logic.test.ts` (เขียนก่อน), `meta.ts` (SEO), `Tool.tsx` (React island) แล้วลงทะเบียนใน `registry.ts` + `loaders.ts` หน้า `/t/<slug>`, `/c/<category>`, `/tools` และ sitemap generate จาก registry อัตโนมัติ ไม่ต้องแตะไฟล์หน้าเว็บ **ข้อต่างของเฟสนี้:** เครื่องมือวันที่ทั้ง 3 ตัวใช้ helper กลางตัวใหม่ `src/lib/date.ts` (Task 1 สร้าง, Task 2–3 ใช้ต่อ) เพื่อไม่ให้แต่ละตัวเขียน parse/format วันที่ซ้ำกัน และข้อมูลวันหยุดแยกเป็น `data.ts` เพื่ออัปเดตรายปีได้โดยไม่แตะ logic

**Tech Stack:** Astro 7, React 19, Tailwind 4, vitest 5, TypeScript 5.9 ที่มีอยู่แล้ว + `qrcode` (ติดตั้งแล้วจาก Phase 1) + **dependency ใหม่ 1 ตัว: `jsqr@1.4.0`** (Task 5 เท่านั้น — มี TypeScript types ในตัว ไม่ต้องลง `@types/`)

**Spec:** `docs/superpowers/specs/2026-09-07-toolsiam-design.md` (หัวข้อ 4 — ตารางเครื่องมือ MVP แถวหมวด "วันที่/เวลา" 3 แถว และหมวด "QR / PromptPay" 2 แถวที่ยังไม่ได้ทำ, หัวข้อ 8 โครงสร้าง, หัวข้อ 9 เฟส 4)

**แผนพี่น้อง (นอกขอบเขตแผนนี้ โดยตั้งใจ):**
- 4a (เสร็จแล้ว): การเงิน 3 + ข้อความไทย 4 — `docs/superpowers/plans/2026-09-07-phase4a-finance-text-tools.md`
- 4c: หมวดรูปภาพ (3 ตัว) + PDF (2 ตัว) — ต้องเพิ่ม `pdf-lib`, ใช้ canvas/File API
- 4d: dev เพิ่ม (2 ตัว) + web/SEO (3 ตัว) + ถอดอักษรไทยเป็นโรมัน RTGS + AdSlot + Cloudflare Web Analytics

## Global Constraints

- Package manager: **npm** เท่านั้น — Task 5 มีการติดตั้ง dependency ใหม่ ต้อง commit `package.json` + `package-lock.json` ด้วย
- ทุก `logic.ts` เป็น pure function ไม่แตะ DOM/`window`/`navigator` และมี `logic.test.ts` คู่กัน — **เขียน test ก่อนเสมอ**
- ข้อความ UI ทั้งหมดเป็น **ภาษาไทย**; slug เป็น kebab-case ภาษาอังกฤษ
- `meta.ts` ต้องผ่าน `registry.test.ts`: `description` ≥ 40 ตัวอักษร, `keywords` ≥ 3, `howTo` ≥ 2, `faq` ≥ 2
- ห้ามใช้ Node API (`Buffer`, `node:crypto`) — โค้ดรันบน browser
- import ข้ามไฟล์ในโปรเจกต์ใช้ alias `@/`; import ในโฟลเดอร์เดียวกันใช้ `./`
- **วันที่ทุกจุดใช้ UTC เสมอ** (`Date.UTC`, `getUTC*`) และส่งต่อกันเป็นสตริง `YYYY-MM-DD` — ห้ามใช้ `new Date('2026-01-01')` แบบ local time หรือ `getMonth()`/`getDay()` ที่ไม่ใช่ UTC เพราะผู้ใช้ในโซนเวลาอื่นจะได้วันเพี้ยนไป 1 วัน
- ทุก Task จบด้วย `npm test` + `npm run typecheck` ผ่าน แล้ว commit (ลงท้ายข้อความ commit ด้วย `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`)
- ห้าม deploy ระหว่างทาง — deploy ครั้งเดียวใน Task 6

## File Structure

```
src/lib/date.ts, src/lib/date.test.ts                                     ← Task 1 สร้าง (ใช้ร่วมกัน 3 เครื่องมือ)
src/tools/date/age-days/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}         ← Task 1
src/tools/date/thai-year-convert/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}← Task 2
src/tools/date/thai-holidays/{data.ts,logic.ts,logic.test.ts,meta.ts,Tool.tsx} ← Task 3
docs/data/thai-holidays-2569.md   (แทนที่ไฟล์ -DRAFT.md เดิม)              ← Task 3
src/tools/qr/qr-generator/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}       ← Task 4
src/tools/qr/qr-reader/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}          ← Task 5
package.json, package-lock.json  (เพิ่ม jsqr)                              ← Task 5
src/tools/registry.ts    ← แก้ทุก Task (เพิ่ม import + ใส่ใน array `tools`)
src/tools/loaders.ts     ← แก้ทุก Task (เพิ่ม 1 บรรทัดใน `toolLoaders`)
```

ไฟล์ที่ **ไม่ต้องแตะ**: หน้าเว็บทั้งหมดใน `src/pages/`, `ToolShell.astro`, `ToolCard.astro`, `ToolSearch.tsx`, `categories.ts` — หมวด `date` และ `qr` มีอยู่ใน `categories.ts` แล้ว หน้า `/c/date` จะมีเครื่องมือขึ้นเองหลัง Task 1

---

### Task 1: helper วันที่กลาง + เครื่องมือ "คำนวณอายุและนับวันระหว่างวันที่" (`age-days`, free)

สร้าง `src/lib/date.ts` ที่อีกสองเครื่องมือในเฟสนี้จะใช้ต่อ แล้วทำเครื่องมือแรกของหมวดวันที่

**Files:**
- Create: `src/lib/date.ts`, `src/tools/date/age-days/logic.ts`, `meta.ts`, `Tool.tsx`
- Test: `src/lib/date.test.ts`, `src/tools/date/age-days/logic.test.ts`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Produces (ใช้ต่อใน Task 2 และ 3):
  `MS_PER_DAY`, `parseIsoDate(iso: string): number`, `toIsoDate(ms: number): string`,
  `daysBetweenDates(aIso: string, bIso: string): number`, `addDays(iso: string, n: number): string`,
  `weekdayIndex(iso: string): number`, `isWeekend(iso: string): boolean`,
  `daysInMonth(year: number, month: number): number`, `isLeapYear(year: number): boolean`
- Produces (เฉพาะเครื่องมือนี้): `dateDiffParts(aIso, bIso): DiffParts`, `calculateAge(birthIso, refIso): AgeResult`, `daysBetween(startIso, endIso): DateSpan`

- [ ] **Step 1: เขียน test ของ helper กลาง**

สร้าง `src/lib/date.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  MS_PER_DAY, parseIsoDate, toIsoDate, daysBetweenDates, addDays,
  weekdayIndex, isWeekend, daysInMonth, isLeapYear,
} from './date';

describe('parseIsoDate', () => {
  it('แปลงเป็น UTC timestamp', () => {
    expect(parseIsoDate('2026-09-08')).toBe(Date.UTC(2026, 8, 8));
  });

  it('ปฏิเสธรูปแบบที่ไม่ใช่ YYYY-MM-DD', () => {
    expect(() => parseIsoDate('8/9/2026')).toThrow();
    expect(() => parseIsoDate('2026-9-8')).toThrow();
    expect(() => parseIsoDate('')).toThrow();
  });

  it('ปฏิเสธวันที่ที่ไม่มีอยู่จริง', () => {
    expect(() => parseIsoDate('2026-02-30')).toThrow();
    expect(() => parseIsoDate('2026-13-01')).toThrow();
    expect(() => parseIsoDate('2026-02-29')).toThrow(); // 2026 ไม่ใช่ปีอธิกสุรทิน
    expect(parseIsoDate('2024-02-29')).toBe(Date.UTC(2024, 1, 29));
  });
});

describe('toIsoDate', () => {
  it('กลับเป็นสตริงเดิม', () => {
    expect(toIsoDate(parseIsoDate('2026-01-05'))).toBe('2026-01-05');
  });
});

describe('daysBetweenDates / addDays', () => {
  it('นับผลต่างเป็นจำนวนวัน (b − a)', () => {
    expect(daysBetweenDates('2026-01-01', '2026-01-31')).toBe(30);
    expect(daysBetweenDates('2026-01-31', '2026-01-01')).toBe(-30);
    expect(daysBetweenDates('1990-05-15', '2026-09-08')).toBe(13_265);
  });

  it('บวก/ลบวันข้ามเดือนและข้ามปีได้', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-09-08', 0)).toBe('2026-09-08');
  });

  it('MS_PER_DAY ถูกต้อง', () => {
    expect(MS_PER_DAY).toBe(86_400_000);
  });
});

describe('weekdayIndex / isWeekend', () => {
  it('0 = อาทิตย์ ถึง 6 = เสาร์ (คิดแบบ UTC)', () => {
    expect(weekdayIndex('2026-09-08')).toBe(2); // อังคาร
    expect(weekdayIndex('2026-05-31')).toBe(0); // อาทิตย์
    expect(weekdayIndex('2026-12-05')).toBe(6); // เสาร์
  });

  it('เสาร์-อาทิตย์เป็นวันหยุดสุดสัปดาห์', () => {
    expect(isWeekend('2026-05-31')).toBe(true);
    expect(isWeekend('2026-12-05')).toBe(true);
    expect(isWeekend('2026-09-08')).toBe(false);
  });
});

describe('daysInMonth / isLeapYear', () => {
  it('จำนวนวันในเดือน', () => {
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
  });

  it('ปีอธิกสุรทิน', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
  });
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `npx vitest run src/lib/date`
Expected: FAIL — `Failed to resolve import "./date"`

- [ ] **Step 3: เขียน `src/lib/date.ts`**

```ts
/** helper วันที่แบบ "วันที่ปฏิทิน" — ทุกอย่างเป็น UTC และส่งต่อกันเป็นสตริง YYYY-MM-DD */

export const MS_PER_DAY = 86_400_000;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** month = 1–12 */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** คืน timestamp UTC เที่ยงคืนของวันนั้น; โยน error ถ้ารูปแบบผิดหรือวันที่ไม่มีจริง */
export function parseIsoDate(iso: string): number {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error('รูปแบบวันที่ต้องเป็น ปี-เดือน-วัน เช่น 2026-09-08');
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) throw new Error('เดือนต้องอยู่ระหว่าง 01–12');
  if (day < 1 || day > daysInMonth(year, month)) throw new Error(`ไม่มีวันที่ ${iso} ในปฏิทิน`);
  return Date.UTC(year, month - 1, day);
}

export function toIsoDate(ms: number): string {
  const d = new Date(ms);
  const y = String(d.getUTCFullYear()).padStart(4, '0');
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** จำนวนวันจาก a ถึง b (ติดลบได้ถ้า b อยู่ก่อน a) */
export function daysBetweenDates(aIso: string, bIso: string): number {
  return Math.round((parseIsoDate(bIso) - parseIsoDate(aIso)) / MS_PER_DAY);
}

export function addDays(iso: string, n: number): string {
  return toIsoDate(parseIsoDate(iso) + Math.round(n) * MS_PER_DAY);
}

/** 0 = อาทิตย์ … 6 = เสาร์ */
export function weekdayIndex(iso: string): number {
  return new Date(parseIsoDate(iso)).getUTCDay();
}

export function isWeekend(iso: string): boolean {
  const d = weekdayIndex(iso);
  return d === 0 || d === 6;
}
```

- [ ] **Step 4: รัน test ของ helper ให้ผ่าน**

Run: `npx vitest run src/lib/date`
Expected: PASS ทุกข้อ

- [ ] **Step 5: เขียน test ของเครื่องมือ `age-days`**

สร้าง `src/tools/date/age-days/logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculateAge, daysBetween, dateDiffParts } from './logic';

describe('dateDiffParts', () => {
  it('แยกเป็นปี/เดือน/วัน โดยยืมวันจากเดือนก่อนหน้า', () => {
    expect(dateDiffParts('1990-05-15', '2026-09-08')).toEqual({ years: 36, months: 3, days: 24 });
    expect(dateDiffParts('2026-01-01', '2026-01-31')).toEqual({ years: 0, months: 0, days: 30 });
    expect(dateDiffParts('2026-09-08', '2026-09-08')).toEqual({ years: 0, months: 0, days: 0 });
  });

  it('สลับลำดับก็ได้ผลเท่ากัน', () => {
    expect(dateDiffParts('2026-09-08', '1990-05-15')).toEqual({ years: 36, months: 3, days: 24 });
  });
});

describe('calculateAge', () => {
  it('อายุ ณ วันอ้างอิงพร้อมวันเกิดครั้งถัดไป', () => {
    const r = calculateAge('1990-05-15', '2026-09-08');
    expect(r.years).toBe(36);
    expect(r.months).toBe(3);
    expect(r.days).toBe(24);
    expect(r.totalDays).toBe(13_265);
    expect(r.totalWeeks).toBe(1_895);
    expect(r.nextBirthday).toBe('2027-05-15');
    expect(r.daysToNextBirthday).toBe(249);
  });

  it('วันเกิดวันนี้ → เหลือ 0 วัน และวันเกิดถัดไปคือวันนี้', () => {
    const r = calculateAge('2000-09-08', '2026-09-08');
    expect(r.years).toBe(26);
    expect(r.months).toBe(0);
    expect(r.days).toBe(0);
    expect(r.daysToNextBirthday).toBe(0);
    expect(r.nextBirthday).toBe('2026-09-08');
  });

  it('เกิด 29 ก.พ. ในปีที่ไม่ใช่อธิกสุรทิน → นับวันเกิดวันที่ 1 มี.ค.', () => {
    const r = calculateAge('2000-02-29', '2026-02-28');
    expect(r.years).toBe(25);
    expect(r.months).toBe(11);
    expect(r.days).toBe(30);
    expect(r.nextBirthday).toBe('2026-03-01');
    expect(r.daysToNextBirthday).toBe(1);
  });

  it('วันเกิดอยู่หลังวันอ้างอิง → error', () => {
    expect(() => calculateAge('2027-01-01', '2026-09-08')).toThrow();
  });

  it('วันที่ไม่ถูกต้อง → error', () => {
    expect(() => calculateAge('2026-02-30', '2026-09-08')).toThrow();
  });
});

describe('daysBetween', () => {
  it('นับวันในเดือนมกราคม 2569 ทั้งเดือน', () => {
    const r = daysBetween('2026-01-01', '2026-01-31');
    expect(r.days).toBe(30);
    expect(r.inclusiveDays).toBe(31);
    expect(r.weeks).toBe(4);
    expect(r.remainderDays).toBe(2);
    expect(r.weekdayCount).toBe(22);
    expect(r.weekendCount).toBe(9);
    expect(r.parts).toEqual({ years: 0, months: 0, days: 30 });
  });

  it('สลับวันเริ่ม/วันสิ้นสุดได้ผลเท่ากัน', () => {
    expect(daysBetween('2026-01-31', '2026-01-01')).toEqual(daysBetween('2026-01-01', '2026-01-31'));
  });

  it('วันเดียวกัน → 0 วัน แต่นับรวมได้ 1 วัน', () => {
    const r = daysBetween('2026-09-08', '2026-09-08');
    expect(r.days).toBe(0);
    expect(r.inclusiveDays).toBe(1);
    expect(r.weekdayCount).toBe(1);
    expect(r.weekendCount).toBe(0);
  });

  it('weekdayCount + weekendCount = inclusiveDays เสมอ', () => {
    const r = daysBetween('2026-04-01', '2026-06-30');
    expect(r.weekdayCount + r.weekendCount).toBe(r.inclusiveDays);
  });
});
```

- [ ] **Step 6: รัน test ให้เห็นว่า fail**

Run: `npx vitest run src/tools/date/age-days`
Expected: FAIL — `Failed to resolve import "./logic"`

- [ ] **Step 7: เขียน `src/tools/date/age-days/logic.ts`**

```ts
import { daysBetweenDates, daysInMonth, isLeapYear, isWeekend, parseIsoDate, toIsoDate } from '@/lib/date';

export interface DiffParts {
  years: number;
  months: number;
  days: number;
}

export interface AgeResult extends DiffParts {
  /** จำนวนวันทั้งหมดตั้งแต่วันเกิดถึงวันอ้างอิง */
  totalDays: number;
  totalWeeks: number;
  totalMonths: number;
  /** YYYY-MM-DD ของวันเกิดครั้งถัดไป (ถ้าวันนี้เป็นวันเกิด = วันนี้) */
  nextBirthday: string;
  daysToNextBirthday: number;
}

export interface DateSpan {
  /** ผลต่างเป็นวัน (ไม่นับวันเริ่มต้น) */
  days: number;
  /** นับรวมทั้งวันเริ่มและวันสิ้นสุด */
  inclusiveDays: number;
  weeks: number;
  remainderDays: number;
  /** จันทร์–ศุกร์ ในช่วง (นับรวมปลายทั้งสองข้าง) */
  weekdayCount: number;
  weekendCount: number;
  parts: DiffParts;
}

/** เรียงวันที่จากน้อยไปมาก */
function order(aIso: string, bIso: string): [string, string] {
  return parseIsoDate(aIso) <= parseIsoDate(bIso) ? [aIso, bIso] : [bIso, aIso];
}

/** ผลต่างแบบปฏิทิน ยืมวันจากเดือนก่อนหน้าวันสิ้นสุดเมื่อวันไม่พอ */
export function dateDiffParts(aIso: string, bIso: string): DiffParts {
  const [startIso, endIso] = order(aIso, bIso);
  const start = new Date(parseIsoDate(startIso));
  const end = new Date(parseIsoDate(endIso));

  let years = end.getUTCFullYear() - start.getUTCFullYear();
  let months = end.getUTCMonth() - start.getUTCMonth();
  let days = end.getUTCDate() - start.getUTCDate();

  if (days < 0) {
    months -= 1;
    // จำนวนวันของเดือนก่อนหน้าเดือนของวันสิ้นสุด
    const prevMonth = end.getUTCMonth() === 0 ? 12 : end.getUTCMonth();
    const prevYear = end.getUTCMonth() === 0 ? end.getUTCFullYear() - 1 : end.getUTCFullYear();
    days += daysInMonth(prevYear, prevMonth);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

/** วันเกิดในปีที่กำหนด — 29 ก.พ. ในปีที่ไม่ใช่อธิกสุรทินให้นับเป็น 1 มี.ค. */
function birthdayInYear(birthIso: string, year: number): string {
  const month = Number(birthIso.slice(5, 7));
  const day = Number(birthIso.slice(8, 10));
  if (month === 2 && day === 29 && !isLeapYear(year)) return `${year}-03-01`;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function calculateAge(birthIso: string, refIso: string): AgeResult {
  const birth = parseIsoDate(birthIso);
  const ref = parseIsoDate(refIso);
  if (birth > ref) throw new Error('วันเกิดต้องไม่อยู่หลังวันที่อ้างอิง');

  const parts = dateDiffParts(birthIso, refIso);
  const totalDays = daysBetweenDates(birthIso, refIso);

  const refYear = Number(refIso.slice(0, 4));
  let next = birthdayInYear(birthIso, refYear);
  if (parseIsoDate(next) < ref) next = birthdayInYear(birthIso, refYear + 1);

  return {
    ...parts,
    totalDays,
    totalWeeks: Math.floor(totalDays / 7),
    totalMonths: parts.years * 12 + parts.months,
    nextBirthday: next,
    daysToNextBirthday: daysBetweenDates(refIso, next),
  };
}

export function daysBetween(startIso: string, endIso: string): DateSpan {
  const [fromIso, toIso] = order(startIso, endIso);
  const days = daysBetweenDates(fromIso, toIso);
  const inclusiveDays = days + 1;

  let weekendCount = 0;
  for (let t = parseIsoDate(fromIso); t <= parseIsoDate(toIso); t += 86_400_000) {
    if (isWeekend(toIsoDate(t))) weekendCount += 1;
  }

  return {
    days,
    inclusiveDays,
    weeks: Math.floor(days / 7),
    remainderDays: days % 7,
    weekdayCount: inclusiveDays - weekendCount,
    weekendCount,
    parts: dateDiffParts(fromIso, toIso),
  };
}
```

- [ ] **Step 8: รัน test ให้ผ่าน**

Run: `npx vitest run src/lib/date src/tools/date/age-days`
Expected: PASS ทุกข้อ

- [ ] **Step 9: เขียน meta.ts**

สร้าง `src/tools/date/age-days/meta.ts`:

```ts
import type { ToolMeta } from '@/tools/types';

export const ageDaysMeta: ToolMeta = {
  slug: 'age-days',
  name: 'คำนวณอายุ และนับวันระหว่างสองวันที่',
  nameEn: 'Age & Date Difference Calculator',
  category: 'date',
  tier: 'free',
  description:
    'คำนวณอายุจากวันเกิดเป็นปี เดือน วัน พร้อมบอกจำนวนวันทั้งหมดและวันเกิดครั้งถัดไป และนับจำนวนวัน สัปดาห์ วันทำการระหว่างสองวันที่ กรอกได้ทั้ง พ.ศ. และ ค.ศ.',
  keywords: ['คำนวณอายุ', 'นับวันระหว่างวันที่', 'อายุกี่ปีกี่เดือน', 'นับวันถอยหลัง', 'คำนวณอายุจากวันเกิด พ.ศ.'],
  howTo: [
    'เลือกโหมด "คำนวณอายุ" แล้วกรอกวันเกิด หรือโหมด "นับวันระหว่างวันที่" แล้วกรอกวันเริ่มและวันสิ้นสุด',
    'เลือกว่าปีที่กรอกเป็น พ.ศ. หรือ ค.ศ. (ค่าเริ่มต้นคือ พ.ศ.)',
    'อ่านผลลัพธ์ทันที ทั้งแบบปี/เดือน/วัน และจำนวนวันรวม',
  ],
  faq: [
    { q: 'กรอกปี พ.ศ. ได้เลยไหม', a: 'ได้ เลือกหน่วยปีเป็น พ.ศ. แล้วกรอกปีแบบไทยได้เลย เช่น 2533 ระบบจะลบ 543 ให้เป็น ค.ศ. ก่อนคำนวณโดยอัตโนมัติ' },
    { q: 'คนเกิด 29 กุมภาพันธ์ นับวันเกิดวันไหนในปีที่ไม่มี 29', a: 'เครื่องมือนี้นับวันเกิดเป็นวันที่ 1 มีนาคมในปีที่ไม่ใช่ปีอธิกสุรทิน ซึ่งเป็นแนวปฏิบัติที่ใช้กันทั่วไปในการนับอายุครบรอบ' },
    { q: 'จำนวนวันทำการที่แสดงรวมวันหยุดนักขัตฤกษ์ด้วยไหม', a: 'ไม่รวม โหมดนับวันที่นี่ตัดเฉพาะเสาร์-อาทิตย์ ถ้าต้องการหักวันหยุดราชการหรือวันหยุดธนาคารด้วย ให้ใช้เครื่องมือวันหยุดและวันทำการ 2569' },
  ],
};
```

- [ ] **Step 10: เขียน Tool.tsx**

สร้าง `src/tools/date/age-days/Tool.tsx`:

```tsx
import { useState } from 'react';
import { calculateAge, daysBetween } from './logic';
import { Field, Input, Select, Stat } from '@/components/ui';

/** วันนี้ในรูปแบบ YYYY-MM-DD (ใช้เวลาเครื่องผู้ใช้ตอน mount เท่านั้น) */
function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AgeDaysTool() {
  const [mode, setMode] = useState<'age' | 'between'>('age');
  const [birth, setBirth] = useState('1990-05-15');
  const [ref, setRef] = useState(todayIso());
  const [start, setStart] = useState(todayIso());
  const [end, setEnd] = useState(todayIso());

  let error = '';
  let age: ReturnType<typeof calculateAge> | null = null;
  let span: ReturnType<typeof daysBetween> | null = null;
  try {
    if (mode === 'age') age = calculateAge(birth, ref);
    else span = daysBetween(start, end);
  } catch (e) {
    error = (e as Error).message;
  }

  const beYear = (iso: string) => (/^\d{4}-/.test(iso) ? Number(iso.slice(0, 4)) + 543 : '—');

  return (
    <div className="space-y-6">
      <Field label="โหมด" htmlFor="mode">
        <Select id="mode" value={mode} onChange={(e) => setMode(e.target.value as 'age' | 'between')}>
          <option value="age">คำนวณอายุ</option>
          <option value="between">นับวันระหว่างสองวันที่</option>
        </Select>
      </Field>

      {mode === 'age' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="วันเกิด" htmlFor="birth" hint={`ตรงกับ พ.ศ. ${beYear(birth)}`}>
            <Input id="birth" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
          </Field>
          <Field label="คำนวณ ณ วันที่" htmlFor="ref" hint={`ตรงกับ พ.ศ. ${beYear(ref)}`}>
            <Input id="ref" type="date" value={ref} onChange={(e) => setRef(e.target.value)} />
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="วันเริ่มต้น" htmlFor="start" hint={`ตรงกับ พ.ศ. ${beYear(start)}`}>
            <Input id="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="วันสิ้นสุด" htmlFor="end" hint={`ตรงกับ พ.ศ. ${beYear(end)}`}>
            <Input id="end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {age && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="อายุ" value={`${age.years} ปี ${age.months} เดือน ${age.days} วัน`} />
            <Stat label="รวมทั้งหมด" value={`${age.totalDays.toLocaleString('en-US')} วัน`} />
            <Stat label="คิดเป็นสัปดาห์" value={`${age.totalWeeks.toLocaleString('en-US')} สัปดาห์`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="วันเกิดครั้งถัดไป" value={age.nextBirthday} />
            <Stat
              label="อีกกี่วันถึงวันเกิด"
              value={age.daysToNextBirthday === 0 ? 'วันนี้คือวันเกิด 🎂' : `${age.daysToNextBirthday} วัน`}
            />
          </div>
        </>
      )}

      {span && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="ห่างกัน" value={`${span.days.toLocaleString('en-US')} วัน`} />
          <Stat label="นับรวมวันเริ่ม-วันสิ้นสุด" value={`${span.inclusiveDays.toLocaleString('en-US')} วัน`} />
          <Stat label="แบบปฏิทิน" value={`${span.parts.years} ปี ${span.parts.months} เดือน ${span.parts.days} วัน`} />
          <Stat label="สัปดาห์" value={`${span.weeks} สัปดาห์ ${span.remainderDays} วัน`} />
          <Stat label="วันจันทร์–ศุกร์" value={`${span.weekdayCount.toLocaleString('en-US')} วัน`} />
          <Stat label="เสาร์–อาทิตย์" value={`${span.weekendCount.toLocaleString('en-US')} วัน`} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 11: ลงทะเบียนใน registry และ loaders**

ใน `src/tools/registry.ts` เพิ่ม import ถัดจาก `thaiIdCheckMeta`:

```ts
import { ageDaysMeta } from './date/age-days/meta';
```

และเพิ่ม `ageDaysMeta` ต่อท้าย `thaiIdCheckMeta` ใน array `tools`

ใน `src/tools/loaders.ts` เพิ่มบรรทัดหลัง `'thai-id-check'`:

```ts
  'age-days': () => import('./date/age-days/Tool'),
```

- [ ] **Step 12: รัน test ทั้งหมด + typecheck + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: ผ่านทั้งหมด และ build มี `/t/age-days`

- [ ] **Step 13: Commit**

```bash
git add src/lib/date.ts src/lib/date.test.ts src/tools/date/age-days src/tools/registry.ts src/tools/loaders.ts
git commit -m "feat(tool): age-days — คำนวณอายุและนับวันระหว่างวันที่ + helper วันที่กลาง

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: เครื่องมือ "แปลง พ.ศ. ↔ ค.ศ. และดูวันในสัปดาห์" (`thai-year-convert`, free)

**Files:**
- Create: `src/tools/date/thai-year-convert/logic.ts`, `meta.ts`, `Tool.tsx`
- Test: `src/tools/date/thai-year-convert/logic.test.ts`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Consumes: `parseIsoDate`, `weekdayIndex`, `isLeapYear`, `daysBetweenDates` จาก `@/lib/date` (Task 1)
- Produces: `BE_OFFSET`, `THAI_MONTHS`, `THAI_MONTHS_SHORT`, `THAI_WEEKDAYS`, `THAI_DAY_COLORS`, `toBuddhistYear(ce)`, `toChristianYear(be)`, `describeDate(iso): ThaiDateInfo`, `formatThaiDate(iso, opts?)`

- [ ] **Step 1: เขียน test**

สร้าง `src/tools/date/thai-year-convert/logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  BE_OFFSET, THAI_MONTHS, THAI_WEEKDAYS, THAI_DAY_COLORS,
  toBuddhistYear, toChristianYear, describeDate, formatThaiDate,
} from './logic';

describe('แปลงปี', () => {
  it('ค.ศ. → พ.ศ. บวก 543', () => {
    expect(BE_OFFSET).toBe(543);
    expect(toBuddhistYear(2026)).toBe(2569);
    expect(toBuddhistYear(1990)).toBe(2533);
  });

  it('พ.ศ. → ค.ศ. ลบ 543', () => {
    expect(toChristianYear(2569)).toBe(2026);
    expect(toChristianYear(2533)).toBe(1990);
  });

  it('แปลงไปกลับได้ค่าเดิม', () => {
    expect(toChristianYear(toBuddhistYear(2026))).toBe(2026);
  });

  it('ปีที่ไม่ใช่จำนวนเต็มหรือน้อยกว่า 1 → error', () => {
    expect(() => toBuddhistYear(2026.5)).toThrow();
    expect(() => toChristianYear(0)).toThrow();
    expect(() => toChristianYear(543)).toThrow(); // จะได้ ค.ศ. 0 ซึ่งไม่มีอยู่
  });
});

describe('ตารางชื่อภาษาไทย', () => {
  it('มีครบ 12 เดือน และ 7 วัน', () => {
    expect(THAI_MONTHS).toHaveLength(12);
    expect(THAI_MONTHS[0]).toBe('มกราคม');
    expect(THAI_MONTHS[11]).toBe('ธันวาคม');
    expect(THAI_WEEKDAYS).toHaveLength(7);
    expect(THAI_WEEKDAYS[0]).toBe('อาทิตย์');
    expect(THAI_DAY_COLORS).toHaveLength(7);
    expect(THAI_DAY_COLORS[0]).toBe('แดง');
  });
});

describe('describeDate', () => {
  it('8 กันยายน 2026 = วันอังคารที่ 8 กันยายน พ.ศ. 2569', () => {
    const d = describeDate('2026-09-08');
    expect(d.day).toBe(8);
    expect(d.month).toBe(9);
    expect(d.monthName).toBe('กันยายน');
    expect(d.monthShort).toBe('ก.ย.');
    expect(d.ceYear).toBe(2026);
    expect(d.beYear).toBe(2569);
    expect(d.weekdayIndex).toBe(2);
    expect(d.weekdayName).toBe('อังคาร');
    expect(d.dayColor).toBe('ชมพู');
    expect(d.dayOfYear).toBe(251);
    expect(d.isLeapYear).toBe(false);
    expect(d.fullThai).toBe('วันอังคารที่ 8 กันยายน พ.ศ. 2569');
    expect(d.shortThai).toBe('8 ก.ย. 2569');
  });

  it('วันอาทิตย์สีแดง และวันเสาร์สีม่วง', () => {
    expect(describeDate('2026-05-31').weekdayName).toBe('อาทิตย์');
    expect(describeDate('2026-05-31').dayColor).toBe('แดง');
    expect(describeDate('2026-12-05').weekdayName).toBe('เสาร์');
    expect(describeDate('2026-12-05').dayColor).toBe('ม่วง');
  });

  it('วันแรกและวันสุดท้ายของปี', () => {
    expect(describeDate('2026-01-01').dayOfYear).toBe(1);
    expect(describeDate('2026-12-31').dayOfYear).toBe(365);
    expect(describeDate('2024-12-31').dayOfYear).toBe(366);
  });

  it('วันที่ไม่ถูกต้อง → error', () => {
    expect(() => describeDate('2026-02-29')).toThrow();
  });
});

describe('formatThaiDate', () => {
  it('ค่าเริ่มต้นเป็นแบบเต็ม พ.ศ.', () => {
    expect(formatThaiDate('2026-09-08')).toBe('วันอังคารที่ 8 กันยายน พ.ศ. 2569');
  });

  it('เลือก ค.ศ. ได้', () => {
    expect(formatThaiDate('2026-09-08', { era: 'ce' })).toBe('วันอังคารที่ 8 กันยายน ค.ศ. 2026');
  });

  it('แบบสั้นและแบบกลาง', () => {
    expect(formatThaiDate('2026-09-08', { style: 'short' })).toBe('8 ก.ย. 2569');
    expect(formatThaiDate('2026-09-08', { style: 'medium' })).toBe('8 กันยายน 2569');
  });
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `npx vitest run src/tools/date/thai-year-convert`
Expected: FAIL — `Failed to resolve import "./logic"`

- [ ] **Step 3: เขียน logic.ts**

สร้าง `src/tools/date/thai-year-convert/logic.ts`:

```ts
import { daysBetweenDates, isLeapYear, parseIsoDate, weekdayIndex } from '@/lib/date';

export const BE_OFFSET = 543;

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
] as const;

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
] as const;

export const THAI_WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'] as const;

/** สีประจำวันตามคติไทย เรียงตาม THAI_WEEKDAYS */
export const THAI_DAY_COLORS = ['แดง', 'เหลือง', 'ชมพู', 'เขียว', 'ส้ม', 'ฟ้า', 'ม่วง'] as const;

export interface ThaiDateInfo {
  iso: string;
  day: number;
  month: number;
  monthName: string;
  monthShort: string;
  ceYear: number;
  beYear: number;
  weekdayIndex: number;
  weekdayName: string;
  dayColor: string;
  dayOfYear: number;
  isLeapYear: boolean;
  fullThai: string;
  shortThai: string;
}

function assertYear(year: number, label: string): void {
  if (!Number.isInteger(year)) throw new Error(`${label}ต้องเป็นจำนวนเต็ม`);
  if (year < 1) throw new Error(`${label}ต้องมากกว่า 0`);
}

export function toBuddhistYear(ce: number): number {
  assertYear(ce, 'ปี ค.ศ.');
  return ce + BE_OFFSET;
}

export function toChristianYear(be: number): number {
  assertYear(be, 'ปี พ.ศ.');
  const ce = be - BE_OFFSET;
  if (ce < 1) throw new Error('ปี พ.ศ. ต้องมากกว่า 543');
  return ce;
}

export function describeDate(iso: string): ThaiDateInfo {
  parseIsoDate(iso); // ตรวจความถูกต้องของวันที่
  const ceYear = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const wd = weekdayIndex(iso);
  const monthName = THAI_MONTHS[month - 1];
  const monthShort = THAI_MONTHS_SHORT[month - 1];
  const beYear = ceYear + BE_OFFSET;

  return {
    iso,
    day,
    month,
    monthName,
    monthShort,
    ceYear,
    beYear,
    weekdayIndex: wd,
    weekdayName: THAI_WEEKDAYS[wd],
    dayColor: THAI_DAY_COLORS[wd],
    dayOfYear: daysBetweenDates(`${ceYear}-01-01`, iso) + 1,
    isLeapYear: isLeapYear(ceYear),
    fullThai: `วัน${THAI_WEEKDAYS[wd]}ที่ ${day} ${monthName} พ.ศ. ${beYear}`,
    shortThai: `${day} ${monthShort} ${beYear}`,
  };
}

export interface FormatOptions {
  era?: 'be' | 'ce';
  style?: 'full' | 'medium' | 'short';
}

export function formatThaiDate(iso: string, opts: FormatOptions = {}): string {
  const { era = 'be', style = 'full' } = opts;
  const d = describeDate(iso);
  const year = era === 'be' ? d.beYear : d.ceYear;
  if (style === 'short') return `${d.day} ${d.monthShort} ${year}`;
  if (style === 'medium') return `${d.day} ${d.monthName} ${year}`;
  return `วัน${d.weekdayName}ที่ ${d.day} ${d.monthName} ${era === 'be' ? 'พ.ศ.' : 'ค.ศ.'} ${year}`;
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `npx vitest run src/tools/date/thai-year-convert`
Expected: PASS ทุกข้อ

- [ ] **Step 5: เขียน meta.ts**

สร้าง `src/tools/date/thai-year-convert/meta.ts`:

```ts
import type { ToolMeta } from '@/tools/types';

export const thaiYearConvertMeta: ToolMeta = {
  slug: 'thai-year-convert',
  name: 'แปลง พ.ศ. ↔ ค.ศ. และดูวันในสัปดาห์',
  nameEn: 'Buddhist ↔ Gregorian Year Converter',
  category: 'date',
  tier: 'free',
  description:
    'แปลงปี พ.ศ. เป็น ค.ศ. และกลับกันด้วยส่วนต่าง 543 ปี พร้อมบอกว่าวันที่ที่กรอกตรงกับวันอะไรในสัปดาห์ สีประจำวัน วันที่เท่าไหร่ของปี และเขียนเป็นภาษาไทยแบบเต็มให้พร้อมคัดลอก',
  keywords: ['แปลง พ.ศ. เป็น ค.ศ.', 'แปลง ค.ศ. เป็น พ.ศ.', 'วันนี้วันอะไร', 'ปี 2569 ตรงกับ ค.ศ. อะไร', 'สีประจำวันเกิด'],
  howTo: [
    'กรอกปีในช่อง พ.ศ. หรือ ค.ศ. ช่องใดช่องหนึ่ง อีกช่องจะอัปเดตทันที',
    'เลือกวันที่ในปฏิทินเพื่อดูวันในสัปดาห์ สีประจำวัน และวันที่เท่าไหร่ของปี',
    'กดคัดลอกเพื่อนำข้อความวันที่ภาษาไทยไปใช้ในเอกสาร',
  ],
  faq: [
    { q: 'พ.ศ. กับ ค.ศ. ต่างกันกี่ปี', a: 'ต่างกัน 543 ปี ปี ค.ศ. บวก 543 จะได้ปี พ.ศ. เช่น ค.ศ. 2026 ตรงกับ พ.ศ. 2569 และปี พ.ศ. ลบ 543 จะได้ปี ค.ศ.' },
    { q: 'ทำไมบางเอกสารเก่าแปลงแล้วคลาดเคลื่อน 1 ปี', a: 'ก่อน พ.ศ. 2484 ปีไทยขึ้นปีใหม่วันที่ 1 เมษายน วันที่ระหว่างมกราคมถึงมีนาคมของเอกสารยุคนั้นจึงต่างจากสูตร 543 อยู่ 1 ปี เครื่องมือนี้ใช้สูตรมาตรฐานปัจจุบัน' },
    { q: 'สีประจำวันคิดจากอะไร', a: 'ยึดตามคติไทยเรื่องสีประจำวันทั้งเจ็ด คือ อาทิตย์สีแดง จันทร์สีเหลือง อังคารสีชมพู พุธสีเขียว พฤหัสบดีสีส้ม ศุกร์สีฟ้า และเสาร์สีม่วง' },
  ],
};
```

- [ ] **Step 6: เขียน Tool.tsx**

สร้าง `src/tools/date/thai-year-convert/Tool.tsx`:

```tsx
import { useState } from 'react';
import { BE_OFFSET, describeDate, formatThaiDate } from './logic';
import { Button, Field, Input, ResultBox, Stat } from '@/components/ui';

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function ThaiYearConvertTool() {
  const [ce, setCe] = useState('2026');
  const [date, setDate] = useState(todayIso());
  const [copied, setCopied] = useState(false);

  const ceNum = Number(ce);
  const beText = Number.isInteger(ceNum) && ceNum > 0 ? String(ceNum + BE_OFFSET) : '';

  let info: ReturnType<typeof describeDate> | null = null;
  let error = '';
  try {
    info = describeDate(date);
  } catch (e) {
    error = (e as Error).message;
  }

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ปี ค.ศ." htmlFor="ce">
          <Input id="ce" inputMode="numeric" value={ce} onChange={(e) => setCe(e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Field label="ปี พ.ศ." htmlFor="be">
          <Input
            id="be"
            inputMode="numeric"
            value={beText}
            onChange={(e) => {
              const be = Number(e.target.value.replace(/\D/g, ''));
              setCe(be > BE_OFFSET ? String(be - BE_OFFSET) : '');
            }}
          />
        </Field>
      </div>

      <Field label="เลือกวันที่เพื่อดูรายละเอียด" htmlFor="date">
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {info && (
        <>
          <ResultBox label="วันที่ภาษาไทย">{info.fullThai}</ResultBox>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="วันในสัปดาห์" value={`วัน${info.weekdayName}`} />
            <Stat label="สีประจำวัน" value={info.dayColor} />
            <Stat label="วันที่ของปี" value={`${info.dayOfYear} / ${info.isLeapYear ? 366 : 365}`} />
            <Stat label="แบบสั้น" value={info.shortThai} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => copy(info!.fullThai)}>{copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกแบบเต็ม'}</Button>
            <Button variant="secondary" onClick={() => copy(formatThaiDate(info!.iso, { style: 'short' }))}>
              คัดลอกแบบสั้น
            </Button>
            <Button variant="secondary" onClick={() => copy(formatThaiDate(info!.iso, { era: 'ce' }))}>
              คัดลอกแบบ ค.ศ.
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 7: ลงทะเบียน**

`src/tools/registry.ts`: `import { thaiYearConvertMeta } from './date/thai-year-convert/meta';` แล้วใส่ `thaiYearConvertMeta` ต่อท้าย `ageDaysMeta` ใน array `tools`

`src/tools/loaders.ts`: `'thai-year-convert': () => import('./date/thai-year-convert/Tool'),`

- [ ] **Step 8: ทดสอบและ commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: ผ่านทั้งหมด

```bash
git add src/tools/date/thai-year-convert src/tools/registry.ts src/tools/loaders.ts
git commit -m "feat(tool): thai-year-convert — แปลง พ.ศ./ค.ศ. และวันในสัปดาห์

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: เครื่องมือ "วันหยุดราชการ/ธนาคาร 2569 + นับวันทำการ" (`thai-holidays`, premium)

ข้อมูลวันหยุดในแผนนี้ **ตรวจสอบมาแล้ว** จากการรายงานประกาศ ธปท. โดย PPTV และ Thai PBS (ทั้งสองแหล่งตรงกันว่าวันหยุดธนาคาร 2569 = 19 วันทำการ) ต่างจากไฟล์ร่างเดิมที่ `docs/data/thai-holidays-2569-DRAFT.md` สองจุด:
1. **ตัด "16 ต.ค. วันหยุดพิเศษธนาคาร" ออก** — ไม่มีในประกาศ ธปท. และเป็นสาเหตุที่ร่างเดิมนับได้ไม่ตรง 19 วัน
2. **แก้ชื่อ 13 ต.ค. เป็น "วันนวมินทรมหาราช"** ตามชื่อทางการ

จุดที่ยังต้องระวัง (มีคอมเมนต์กำกับไว้ใน `data.ts`): **1 พ.ค. วันแรงงานแห่งชาติ** — เป็นวันหยุดของธนาคารและภาคเอกชน แต่ไม่ใช่วันหยุดราชการ (บางเว็บรวมข่าวเหมารวมไว้ในตารางวันหยุดราชการ) แผนนี้เลือกตามหลักที่ถูกต้อง คือ `government: false, bank: true`

**Files:**
- Create: `src/tools/date/thai-holidays/data.ts`, `logic.ts`, `meta.ts`, `Tool.tsx`, `docs/data/thai-holidays-2569.md`
- Test: `src/tools/date/thai-holidays/logic.test.ts`
- Delete: `docs/data/thai-holidays-2569-DRAFT.md`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Consumes: `addDays`, `daysBetweenDates`, `isWeekend`, `parseIsoDate`, `toIsoDate` จาก `@/lib/date` (Task 1); `formatThaiDate`, `THAI_WEEKDAYS` จาก `@/tools/date/thai-year-convert/logic` (Task 2 — ใช้ใน `Tool.tsx` เท่านั้น)
- Produces: `Holiday`, `HolidayCalendar`, `HOLIDAYS_2569`, `COVERED_YEAR`, `listHolidays(cal)`, `findHoliday(iso, cal)`, `isBusinessDay(iso, cal)`, `businessDaysBetween(startIso, endIso, cal): BusinessDaySpan`, `addBusinessDays(iso, count, cal): string`

- [ ] **Step 1: เขียน `data.ts` (ข้อมูลดิบ ไม่ต้องมี test แยก — logic.test.ts ตรวจให้)**

สร้าง `src/tools/date/thai-holidays/data.ts`:

```ts
export type HolidayType = 'ปกติ' | 'ชดเชย' | 'พิเศษ';

export interface Holiday {
  /** YYYY-MM-DD (ค.ศ.) */
  date: string;
  name: string;
  /** เป็นวันหยุดราชการหรือไม่ */
  government: boolean;
  /** เป็นวันหยุดของสถาบันการเงินตามประกาศ ธปท. หรือไม่ */
  bank: boolean;
  type: HolidayType;
}

/**
 * วันหยุด พ.ศ. 2569 (ค.ศ. 2026)
 * ที่มา: ประกาศ ธปท. เรื่องวันหยุดของสถาบันการเงิน 2569 (วันหยุดธนาคารรวม 19 วันทำการ)
 * ตามที่รายงานโดย PPTV และ Thai PBS — ดู docs/data/thai-holidays-2569.md
 *
 * หมายเหตุที่ตั้งใจ:
 * - 1 พ.ค. วันแรงงานแห่งชาติ = วันหยุดธนาคาร/เอกชน แต่ไม่ใช่วันหยุดราชการ
 * - 13 พ.ค. วันพืชมงคล และ 30 ก.ค. วันเข้าพรรษา = วันหยุดราชการ แต่ธนาคารเปิดทำการ
 * - 31 พ.ค. (อาทิตย์) และ 5 ธ.ค. (เสาร์) ตรงวันหยุดสุดสัปดาห์ จึงมีวันชดเชยตามมา
 */
export const HOLIDAYS_2569: readonly Holiday[] = [
  { date: '2026-01-01', name: 'วันขึ้นปีใหม่', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-01-02', name: 'วันหยุดพิเศษ', government: true, bank: true, type: 'พิเศษ' },
  { date: '2026-03-03', name: 'วันมาฆบูชา', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-04-06', name: 'วันจักรี', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-04-13', name: 'วันสงกรานต์', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-04-14', name: 'วันสงกรานต์', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-04-15', name: 'วันสงกรานต์', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-05-01', name: 'วันแรงงานแห่งชาติ', government: false, bank: true, type: 'ปกติ' },
  { date: '2026-05-04', name: 'วันฉัตรมงคล', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-05-13', name: 'วันพืชมงคล', government: true, bank: false, type: 'ปกติ' },
  { date: '2026-05-31', name: 'วันวิสาขบูชา', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-06-01', name: 'ชดเชยวันวิสาขบูชา', government: true, bank: true, type: 'ชดเชย' },
  { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสุทิดาฯ พระบรมราชินี', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-07-28', name: 'วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-07-29', name: 'วันอาสาฬหบูชา', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-07-30', name: 'วันเข้าพรรษา', government: true, bank: false, type: 'ปกติ' },
  { date: '2026-08-12', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-10-13', name: 'วันนวมินทรมหาราช (วันคล้ายวันสวรรคต ร.9)', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-10-23', name: 'วันปิยมหาราช', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-12-05', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันชาติ / วันพ่อแห่งชาติ', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-12-07', name: 'ชดเชยวันพ่อแห่งชาติ', government: true, bank: true, type: 'ชดเชย' },
  { date: '2026-12-10', name: 'วันรัฐธรรมนูญ', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-12-31', name: 'วันสิ้นปี', government: true, bank: true, type: 'ปกติ' },
];
```

- [ ] **Step 2: เขียน test**

สร้าง `src/tools/date/thai-holidays/logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isWeekend } from '@/lib/date';
import { HOLIDAYS_2569 } from './data';
import {
  COVERED_YEAR, listHolidays, findHoliday, isBusinessDay, businessDaysBetween, addBusinessDays,
} from './logic';

describe('ข้อมูลวันหยุด 2569', () => {
  it('รูปแบบวันที่ถูกต้อง เรียงจากน้อยไปมาก และไม่ซ้ำ', () => {
    const dates = HOLIDAYS_2569.map((h) => h.date);
    expect(new Set(dates).size).toBe(dates.length);
    expect([...dates].sort()).toEqual(dates);
    for (const h of HOLIDAYS_2569) {
      expect(h.date).toMatch(/^2026-\d{2}-\d{2}$/);
      expect(h.name.length).toBeGreaterThan(2);
      expect(h.government || h.bank).toBe(true);
    }
  });

  it('วันหยุดธนาคารที่ตรงวันทำการมี 19 วัน ตรงตามประกาศ ธปท.', () => {
    const bankWorkdayHolidays = listHolidays('bank').filter((h) => !isWeekend(h.date));
    expect(bankWorkdayHolidays).toHaveLength(19);
  });

  it('วันหยุดราชการที่ตรงวันทำการมี 20 วัน', () => {
    const govWorkdayHolidays = listHolidays('government').filter((h) => !isWeekend(h.date));
    expect(govWorkdayHolidays).toHaveLength(20);
  });

  it('ครอบคลุมเฉพาะปี 2569', () => {
    expect(COVERED_YEAR).toEqual({ be: 2569, ce: 2026 });
  });
});

describe('findHoliday / isBusinessDay', () => {
  it('วันแรงงาน 1 พ.ค. ธนาคารหยุด ราชการไม่หยุด', () => {
    expect(findHoliday('2026-05-01', 'bank')?.name).toBe('วันแรงงานแห่งชาติ');
    expect(findHoliday('2026-05-01', 'government')).toBeUndefined();
    expect(isBusinessDay('2026-05-01', 'bank')).toBe(false);
    expect(isBusinessDay('2026-05-01', 'government')).toBe(true);
  });

  it('วันพืชมงคล 13 พ.ค. ราชการหยุด ธนาคารเปิด', () => {
    expect(findHoliday('2026-05-13', 'government')?.name).toBe('วันพืชมงคล');
    expect(findHoliday('2026-05-13', 'bank')).toBeUndefined();
    expect(isBusinessDay('2026-05-13', 'bank')).toBe(true);
  });

  it('เสาร์-อาทิตย์ไม่ใช่วันทำการแม้ไม่มีวันหยุดนักขัตฤกษ์', () => {
    expect(isBusinessDay('2026-09-12', 'bank')).toBe(false); // เสาร์
    expect(isBusinessDay('2026-09-08', 'bank')).toBe(true); // อังคาร
  });

  it('วันที่นอกปี 2569 → error', () => {
    expect(() => isBusinessDay('2027-01-04', 'bank')).toThrow();
    expect(() => findHoliday('2025-12-31', 'bank')).toThrow();
  });
});

describe('businessDaysBetween', () => {
  it('ช่วงสงกรานต์ 10–17 เม.ย. มีวันทำการธนาคาร 3 วัน', () => {
    const r = businessDaysBetween('2026-04-10', '2026-04-17', 'bank');
    expect(r.totalDays).toBe(8);
    expect(r.businessDays).toBe(3); // 10 (ศ.), 16 (พฤ.), 17 (ศ.)
    expect(r.weekendDays).toBe(2);
    expect(r.holidayDays).toBe(3);
    expect(r.holidays.map((h) => h.date)).toEqual(['2026-04-13', '2026-04-14', '2026-04-15']);
  });

  it('ผลรวมย่อยเท่ากับจำนวนวันทั้งหมดเสมอ', () => {
    const r = businessDaysBetween('2026-01-01', '2026-12-31', 'government');
    expect(r.businessDays + r.weekendDays + r.holidayDays).toBe(r.totalDays);
    expect(r.totalDays).toBe(365);
  });

  it('ทั้งปี 2569 มีวันทำการธนาคาร 242 วัน และวันทำการราชการ 241 วัน', () => {
    expect(businessDaysBetween('2026-01-01', '2026-12-31', 'bank').businessDays).toBe(242);
    expect(businessDaysBetween('2026-01-01', '2026-12-31', 'government').businessDays).toBe(241);
  });

  it('สลับวันเริ่ม/วันสิ้นสุดได้ผลเท่ากัน', () => {
    expect(businessDaysBetween('2026-04-17', '2026-04-10', 'bank')).toEqual(
      businessDaysBetween('2026-04-10', '2026-04-17', 'bank'),
    );
  });

  it('วันเดียวที่เป็นวันทำการ → 1', () => {
    expect(businessDaysBetween('2026-09-08', '2026-09-08', 'bank').businessDays).toBe(1);
  });
});

describe('addBusinessDays', () => {
  it('บวกวันทำการข้ามสงกรานต์', () => {
    expect(addBusinessDays('2026-04-10', 1, 'bank')).toBe('2026-04-16');
    expect(addBusinessDays('2026-04-10', 3, 'bank')).toBe('2026-04-20');
  });

  it('0 วัน → วันเดิม', () => {
    expect(addBusinessDays('2026-04-10', 0, 'bank')).toBe('2026-04-10');
  });

  it('ค่าติดลบเดินย้อนหลัง', () => {
    expect(addBusinessDays('2026-04-16', -1, 'bank')).toBe('2026-04-10');
  });

  it('ถ้าเดินหลุดปี 2569 → error', () => {
    expect(() => addBusinessDays('2026-12-28', 10, 'bank')).toThrow();
  });
});
```

- [ ] **Step 3: รัน test ให้เห็นว่า fail**

Run: `npx vitest run src/tools/date/thai-holidays`
Expected: FAIL — `Failed to resolve import "./logic"`

- [ ] **Step 4: เขียน logic.ts**

สร้าง `src/tools/date/thai-holidays/logic.ts`:

```ts
import { addDays, daysBetweenDates, isWeekend, parseIsoDate } from '@/lib/date';
import { HOLIDAYS_2569, type Holiday } from './data';

export type { Holiday };
export { HOLIDAYS_2569 };

/** ปฏิทินที่รองรับ: ธนาคาร (ตามประกาศ ธปท.) หรือ ราชการ (ตามมติ ครม.) */
export type HolidayCalendar = 'bank' | 'government';

export const COVERED_YEAR = { be: 2569, ce: 2026 } as const;

export interface BusinessDaySpan {
  totalDays: number;
  businessDays: number;
  weekendDays: number;
  /** วันหยุดนักขัตฤกษ์ที่ตรงวันจันทร์–ศุกร์ */
  holidayDays: number;
  holidays: Holiday[];
}

function assertCovered(iso: string): void {
  parseIsoDate(iso);
  if (Number(iso.slice(0, 4)) !== COVERED_YEAR.ce) {
    throw new Error(`ขณะนี้รองรับเฉพาะวันที่ในปี พ.ศ. ${COVERED_YEAR.be} (ค.ศ. ${COVERED_YEAR.ce})`);
  }
}

export function listHolidays(cal: HolidayCalendar): Holiday[] {
  return HOLIDAYS_2569.filter((h) => (cal === 'bank' ? h.bank : h.government));
}

export function findHoliday(iso: string, cal: HolidayCalendar): Holiday | undefined {
  assertCovered(iso);
  return listHolidays(cal).find((h) => h.date === iso);
}

export function isBusinessDay(iso: string, cal: HolidayCalendar): boolean {
  assertCovered(iso);
  return !isWeekend(iso) && findHoliday(iso, cal) === undefined;
}

/** นับรวมทั้งวันเริ่มต้นและวันสิ้นสุด */
export function businessDaysBetween(startIso: string, endIso: string, cal: HolidayCalendar): BusinessDaySpan {
  assertCovered(startIso);
  assertCovered(endIso);
  const [fromIso, toIso] =
    parseIsoDate(startIso) <= parseIsoDate(endIso) ? [startIso, endIso] : [endIso, startIso];

  const totalDays = daysBetweenDates(fromIso, toIso) + 1;
  let businessDays = 0;
  let weekendDays = 0;
  const holidays: Holiday[] = [];

  for (let i = 0; i < totalDays; i++) {
    const iso = addDays(fromIso, i);
    if (isWeekend(iso)) {
      weekendDays += 1;
      continue;
    }
    const holiday = findHoliday(iso, cal);
    if (holiday) holidays.push(holiday);
    else businessDays += 1;
  }

  return { totalDays, businessDays, weekendDays, holidayDays: holidays.length, holidays };
}

/** เดินไปข้างหน้า (หรือถอยหลังถ้าติดลบ) ตามจำนวนวันทำการ */
export function addBusinessDays(iso: string, count: number, cal: HolidayCalendar): string {
  assertCovered(iso);
  if (!Number.isInteger(count)) throw new Error('จำนวนวันทำการต้องเป็นจำนวนเต็ม');
  const step = count >= 0 ? 1 : -1;
  let remaining = Math.abs(count);
  let current = iso;

  while (remaining > 0) {
    current = addDays(current, step);
    assertCovered(current);
    if (isBusinessDay(current, cal)) remaining -= 1;
  }
  return current;
}
```

- [ ] **Step 5: รัน test ให้ผ่าน**

Run: `npx vitest run src/tools/date/thai-holidays`
Expected: PASS ทุกข้อ — โดยเฉพาะข้อ "19 วัน" ซึ่งเป็นตัวตรวจว่าข้อมูลตรงกับประกาศ ธปท.
ถ้าข้อ 242/241 ไม่ผ่าน ให้เช็คก่อนว่าไฟล์ `data.ts` ถูกคัดลอกครบทุกบรรทัด (23 รายการ) ก่อนจะไปแก้ logic

- [ ] **Step 6: เขียน meta.ts**

สร้าง `src/tools/date/thai-holidays/meta.ts`:

```ts
import type { ToolMeta } from '@/tools/types';

export const thaiHolidaysMeta: ToolMeta = {
  slug: 'thai-holidays',
  name: 'วันหยุดราชการและวันหยุดธนาคาร 2569 + นับวันทำการ',
  nameEn: 'Thai Public & Bank Holidays 2026 / Business Day Counter',
  category: 'date',
  tier: 'premium',
  description:
    'ดูวันหยุดราชการและวันหยุดธนาคารปี 2569 ครบทั้งปีในที่เดียว พร้อมนับจำนวนวันทำการระหว่างสองวันที่ และคำนวณว่าอีกกี่วันทำการจะถึงวันไหน เลือกได้ว่าจะใช้ปฏิทินราชการหรือปฏิทินธนาคาร',
  keywords: ['วันหยุด 2569', 'วันหยุดธนาคาร 2569', 'วันหยุดราชการ 2569', 'นับวันทำการ', 'ปฏิทินวันหยุดปีหน้า'],
  howTo: [
    'เลือกปฏิทินที่ต้องการ: วันหยุดธนาคาร (ตามประกาศ ธปท.) หรือวันหยุดราชการ',
    'ดูรายการวันหยุดทั้งปีพร้อมวันในสัปดาห์ หรือเลื่อนลงไปที่เครื่องมือนับวันทำการ',
    'กรอกวันเริ่มและวันสิ้นสุดเพื่อนับวันทำการ หรือกรอกจำนวนวันทำการเพื่อหาว่าครบกำหนดวันไหน',
  ],
  faq: [
    { q: 'วันหยุดธนาคารกับวันหยุดราชการต่างกันอย่างไร', a: 'ไม่เหมือนกันทุกวัน เช่น วันแรงงานแห่งชาติ 1 พฤษภาคม ธนาคารหยุดแต่ราชการเปิด ส่วนวันพืชมงคลและวันเข้าพรรษา ราชการหยุดแต่ธนาคารเปิดทำการตามปกติ' },
    { q: 'ปี 2569 ธนาคารหยุดกี่วัน', a: 'ตามประกาศธนาคารแห่งประเทศไทย วันหยุดของสถาบันการเงินปี 2569 ที่ตรงกับวันทำการมี 19 วัน โดยรวมวันหยุดพิเศษวันที่ 2 มกราคม และวันหยุดชดเชยแล้ว' },
    { q: 'นับวันทำการรวมวันเริ่มต้นด้วยไหม', a: 'ตัวนับช่วงวันที่นับรวมทั้งวันเริ่มต้นและวันสิ้นสุด ส่วนโหมดบวกวันทำการจะนับจากวันถัดจากวันที่กรอก ซึ่งตรงกับวิธีนับเครดิตเทอมและกำหนดส่งเอกสารส่วนใหญ่' },
  ],
};
```

- [ ] **Step 7: เขียน Tool.tsx**

สร้าง `src/tools/date/thai-holidays/Tool.tsx`:

```tsx
import { useState } from 'react';
import { addBusinessDays, businessDaysBetween, listHolidays, type HolidayCalendar } from './logic';
import { describeDate } from '@/tools/date/thai-year-convert/logic';
import { Button, Field, Input, Select, Stat } from '@/components/ui';

export default function ThaiHolidaysTool() {
  const [cal, setCal] = useState<HolidayCalendar>('bank');
  const [start, setStart] = useState('2026-01-01');
  const [end, setEnd] = useState('2026-03-31');
  const [addFrom, setAddFrom] = useState('2026-01-05');
  const [addCount, setAddCount] = useState('30');

  const holidays = listHolidays(cal);

  let spanError = '';
  let span: ReturnType<typeof businessDaysBetween> | null = null;
  try {
    span = businessDaysBetween(start, end, cal);
  } catch (e) {
    spanError = (e as Error).message;
  }

  let addError = '';
  let dueDate = '';
  try {
    dueDate = addBusinessDays(addFrom, Math.trunc(Number(addCount) || 0), cal);
  } catch (e) {
    addError = (e as Error).message;
  }

  return (
    <div className="space-y-8">
      <Field label="ปฏิทินที่ใช้" htmlFor="cal">
        <Select id="cal" value={cal} onChange={(e) => setCal(e.target.value as HolidayCalendar)}>
          <option value="bank">วันหยุดธนาคาร (ประกาศ ธปท.)</option>
          <option value="government">วันหยุดราชการ</option>
        </Select>
      </Field>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">นับวันทำการระหว่างสองวันที่</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="วันเริ่มต้น" htmlFor="start">
            <Input id="start" type="date" min="2026-01-01" max="2026-12-31" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="วันสิ้นสุด" htmlFor="end">
            <Input id="end" type="date" min="2026-01-01" max="2026-12-31" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        {spanError && <p className="text-sm text-red-600">{spanError}</p>}
        {span && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="วันทำการ" value={`${span.businessDays} วัน`} />
            <Stat label="รวมทุกวัน" value={`${span.totalDays} วัน`} />
            <Stat label="เสาร์–อาทิตย์" value={`${span.weekendDays} วัน`} />
            <Stat label="วันหยุดนักขัตฤกษ์" value={`${span.holidayDays} วัน`} />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">อีกกี่วันทำการจะครบกำหนด</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="นับจากวันที่" htmlFor="addFrom">
            <Input id="addFrom" type="date" min="2026-01-01" max="2026-12-31" value={addFrom} onChange={(e) => setAddFrom(e.target.value)} />
          </Field>
          <Field label="จำนวนวันทำการ" htmlFor="addCount" hint="ใส่เลขติดลบเพื่อนับย้อนหลัง">
            <Input id="addCount" inputMode="numeric" value={addCount} onChange={(e) => setAddCount(e.target.value)} />
          </Field>
          <div className="self-end">
            {addError ? (
              <p className="text-sm text-red-600">{addError}</p>
            ) : (
              <Stat label="ครบกำหนด" value={describeDate(dueDate).fullThai} />
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {cal === 'bank' ? 'วันหยุดธนาคาร' : 'วันหยุดราชการ'} ปี 2569 ({holidays.length} รายการ)
          </h2>
          <Button
            variant="secondary"
            onClick={() => {
              const rows = holidays.map((h) => `${describeDate(h.date).shortThai},${h.name},${h.type}`);
              navigator.clipboard.writeText(['วันที่,ชื่อวันหยุด,ประเภท', ...rows].join('\n'));
            }}
          >
            คัดลอกเป็น CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">วันที่</th>
                <th className="px-3 py-2">วัน</th>
                <th className="px-3 py-2">ชื่อวันหยุด</th>
                <th className="px-3 py-2">ประเภท</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => {
                const info = describeDate(h.date);
                const weekend = info.weekdayIndex === 0 || info.weekdayIndex === 6;
                return (
                  <tr key={h.date} className="border-t border-slate-100">
                    <td className="px-3 py-2 whitespace-nowrap">{info.shortThai}</td>
                    <td className={`px-3 py-2 whitespace-nowrap ${weekend ? 'text-slate-400' : ''}`}>{info.weekdayName}</td>
                    <td className="px-3 py-2">{h.name}</td>
                    <td className="px-3 py-2 text-slate-500">{h.type}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          วันที่แสดงเป็นสีจางคือวันหยุดที่ตรงกับเสาร์-อาทิตย์อยู่แล้ว ข้อมูลอ้างอิงประกาศธนาคารแห่งประเทศไทยและมติคณะรัฐมนตรี
          หากมีประกาศวันหยุดพิเศษเพิ่มเติมระหว่างปี ตัวเลขอาจเปลี่ยนแปลงได้
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 8: เขียนไฟล์ข้อมูลฉบับตรวจสอบแล้ว และลบไฟล์ร่าง**

สร้าง `docs/data/thai-holidays-2569.md`:

```markdown
# วันหยุด พ.ศ. 2569 — ข้อมูลที่ใช้ในเครื่องมือ `thai-holidays`

**Source of truth ของโค้ดคือ `src/tools/date/thai-holidays/data.ts`** ไฟล์นี้เก็บที่มาและเหตุผลของข้อมูลนั้น

ที่มา: ประกาศธนาคารแห่งประเทศไทย เรื่องวันหยุดของสถาบันการเงินประจำปี 2569 ตามที่รายงานโดย
- https://www.pptvhd36.com/wealth/trick-trend/254884 (ระบุวันหยุดธนาคาร 19 วัน พร้อมรายวัน)
- https://www.thaipbs.or.th/news/content/500481 (วันหยุดราชการ + วันหยุดธนาคาร)

ทั้งสองแหล่งให้รายการวันตรงกันทุกวัน จำนวนวันหยุดธนาคารที่ตรงวันทำการ = 19 วัน ซึ่ง `logic.test.ts` ตรวจไว้เป็น assertion

## ต่างจากไฟล์ร่างเดิม (`thai-holidays-2569-DRAFT.md`) สองจุด
1. ตัด "16 ต.ค. วันหยุดพิเศษธนาคาร" ออก — ไม่มีในประกาศ และเป็นสาเหตุที่ร่างเดิมนับได้ไม่ตรง 19 วัน
2. แก้ชื่อ 13 ต.ค. เป็น "วันนวมินทรมหาราช" ตามชื่อทางการ

## จุดที่ต้องระวัง
- **1 พ.ค. วันแรงงานแห่งชาติ** — วันหยุดธนาคารและภาคเอกชน **ไม่ใช่วันหยุดราชการ** (เว็บรวมข่าวบางแห่งเหมารวมไว้ในตารางวันหยุดราชการ) โค้ดใช้ `government: false, bank: true`
- **13 พ.ค. วันพืชมงคล** และ **30 ก.ค. วันเข้าพรรษา** — ราชการหยุด ธนาคารเปิด
- **31 พ.ค. (อาทิตย์)** และ **5 ธ.ค. (เสาร์)** ตรงวันหยุดสุดสัปดาห์ จึงมีวันชดเชย 1 มิ.ย. และ 7 ธ.ค.
- ถ้ารัฐบาลประกาศวันหยุดพิเศษเพิ่มระหว่างปี ต้องเพิ่มแถวใน `data.ts` และแก้ตัวเลข 19/20/242/241 ใน `logic.test.ts` ให้ตรงกัน

## การขยายไปปีถัดไป
`logic.ts` ผูกกับปีเดียวผ่าน `COVERED_YEAR` และ `assertCovered()` เมื่อจะเพิ่มปี 2570 ให้เปลี่ยน `HOLIDAYS_2569` เป็นแมปปี → รายการ แล้วให้ `assertCovered` ตรวจจากคีย์ของแมปแทน
```

แล้วลบไฟล์ร่าง:

```bash
git rm docs/data/thai-holidays-2569-DRAFT.md
```

- [ ] **Step 9: ลงทะเบียน**

`src/tools/registry.ts`: `import { thaiHolidaysMeta } from './date/thai-holidays/meta';` แล้วใส่ `thaiHolidaysMeta` ต่อท้าย `thaiYearConvertMeta` ใน array `tools`

`src/tools/loaders.ts`: `'thai-holidays': () => import('./date/thai-holidays/Tool'),`

- [ ] **Step 10: ทดสอบและ commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: ผ่านทั้งหมด

```bash
git add src/tools/date/thai-holidays docs/data/thai-holidays-2569.md src/tools/registry.ts src/tools/loaders.ts
git commit -m "feat(tool): thai-holidays — วันหยุดราชการ/ธนาคาร 2569 และนับวันทำการ

ยืนยันข้อมูลกับการรายงานประกาศ ธปท. (19 วันหยุดธนาคาร) แล้ว
ตัดวันหยุดพิเศษ 16 ต.ค. ที่ไม่มีจริงออกจากร่างเดิม

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: เครื่องมือ "สร้าง QR ทั่วไป / WiFi / vCard" (`qr-generator`, free)

ใช้ `qrcode` ที่ติดตั้งไว้แล้วตั้งแต่ Phase 1 (เครื่องมือ `promptpay-qr` ใช้อยู่) — **ไม่ต้องเพิ่ม dependency**

**Files:**
- Create: `src/tools/qr/qr-generator/logic.ts`, `meta.ts`, `Tool.tsx`
- Test: `src/tools/qr/qr-generator/logic.test.ts`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Consumes: `QRCode.toDataURL` จาก `qrcode` (ใน Tool.tsx เท่านั้น — pattern เดียวกับ `src/tools/qr/promptpay-qr/Tool.tsx`)
- Produces: `normalizeUrl(raw): string`, `buildWifiPayload(input: WifiInput): string`, `buildVCardPayload(input: VCardInput): string`, `buildQrPayload(input: QrInput): string`, types `WifiInput`, `VCardInput`, `QrInput`

- [ ] **Step 1: เขียน test**

สร้าง `src/tools/qr/qr-generator/logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeUrl, buildWifiPayload, buildVCardPayload, buildQrPayload } from './logic';

describe('normalizeUrl', () => {
  it('เติม https:// ให้อัตโนมัติเมื่อไม่มี scheme', () => {
    expect(normalizeUrl('toolsiam.com')).toBe('https://toolsiam.com');
    expect(normalizeUrl('  toolsiam.com/t/qr-generator ')).toBe('https://toolsiam.com/t/qr-generator');
  });

  it('ไม่แตะ scheme ที่มีอยู่แล้ว', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    expect(normalizeUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
  });

  it('ค่าว่าง → error', () => {
    expect(() => normalizeUrl('   ')).toThrow();
  });
});

describe('buildWifiPayload', () => {
  it('รูปแบบมาตรฐาน WIFI:', () => {
    expect(buildWifiPayload({ ssid: 'ToolSiam', password: 'secret123', encryption: 'WPA' }))
      .toBe('WIFI:T:WPA;S:ToolSiam;P:secret123;;');
  });

  it('เครือข่ายไม่มีรหัสผ่านไม่ต้องมีฟิลด์ P', () => {
    expect(buildWifiPayload({ ssid: 'Free WiFi', encryption: 'nopass' }))
      .toBe('WIFI:T:nopass;S:Free WiFi;;');
  });

  it('เครือข่ายซ่อนชื่อเพิ่ม H:true', () => {
    expect(buildWifiPayload({ ssid: 'Hidden', password: 'p', encryption: 'WPA', hidden: true }))
      .toBe('WIFI:T:WPA;S:Hidden;P:p;H:true;;');
  });

  it('escape อักขระพิเศษ \\ ; , : "', () => {
    expect(buildWifiPayload({ ssid: 'Cafe;1', password: 'a:b,c"d\\e', encryption: 'WPA' }))
      .toBe('WIFI:T:WPA;S:Cafe\\;1;P:a\\:b\\,c\\"d\\\\e;;');
  });

  it('ไม่มี SSID หรือมีรหัสผ่านว่างทั้งที่เลือกเข้ารหัส → error', () => {
    expect(() => buildWifiPayload({ ssid: '  ', password: 'x', encryption: 'WPA' })).toThrow();
    expect(() => buildWifiPayload({ ssid: 'Net', password: '', encryption: 'WPA' })).toThrow();
  });
});

describe('buildVCardPayload', () => {
  it('สร้าง vCard 3.0 ที่มีชื่อและเบอร์', () => {
    const v = buildVCardPayload({ firstName: 'สมชาย', lastName: 'ใจดี', phone: '0812345678' });
    const lines = v.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCARD');
    expect(lines[1]).toBe('VERSION:3.0');
    expect(lines).toContain('N:ใจดี;สมชาย;;;');
    expect(lines).toContain('FN:สมชาย ใจดี');
    expect(lines).toContain('TEL;TYPE=CELL:0812345678');
    expect(lines[lines.length - 1]).toBe('END:VCARD');
  });

  it('ใส่เฉพาะฟิลด์ที่กรอก', () => {
    const v = buildVCardPayload({ firstName: 'Ann' });
    expect(v).not.toContain('TEL');
    expect(v).not.toContain('EMAIL');
    expect(v).toContain('FN:Ann');
  });

  it('เว็บไซต์ถูกเติม https:// และ escape เครื่องหมาย ;', () => {
    const v = buildVCardPayload({ firstName: 'A', org: 'ToolSiam; Co', website: 'toolsiam.com' });
    expect(v).toContain('ORG:ToolSiam\\; Co');
    expect(v).toContain('URL:https://toolsiam.com');
  });

  it('ไม่มีทั้งชื่อและนามสกุล → error', () => {
    expect(() => buildVCardPayload({ firstName: ' ', lastName: '' })).toThrow();
  });
});

describe('buildQrPayload', () => {
  it('ข้อความธรรมดาส่งผ่านตรง ๆ', () => {
    expect(buildQrPayload({ kind: 'text', text: 'สวัสดี ToolSiam' })).toBe('สวัสดี ToolSiam');
  });

  it('โหมด url เรียก normalizeUrl', () => {
    expect(buildQrPayload({ kind: 'url', url: 'toolsiam.com' })).toBe('https://toolsiam.com');
  });

  it('โหมด wifi และ vcard ส่งต่อให้ตัวสร้างที่ถูกต้อง', () => {
    expect(buildQrPayload({ kind: 'wifi', wifi: { ssid: 'N', encryption: 'nopass' } })).toBe('WIFI:T:nopass;S:N;;');
    expect(buildQrPayload({ kind: 'vcard', vcard: { firstName: 'A' } })).toContain('BEGIN:VCARD');
  });

  it('ข้อความว่าง → error', () => {
    expect(() => buildQrPayload({ kind: 'text', text: '   ' })).toThrow();
  });
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `npx vitest run src/tools/qr/qr-generator`
Expected: FAIL — `Failed to resolve import "./logic"`

- [ ] **Step 3: เขียน logic.ts**

สร้าง `src/tools/qr/qr-generator/logic.ts`:

```ts
export type WifiEncryption = 'WPA' | 'WEP' | 'nopass';

export interface WifiInput {
  ssid: string;
  password?: string;
  encryption: WifiEncryption;
  /** เครือข่ายที่ซ่อนชื่อ */
  hidden?: boolean;
}

export interface VCardInput {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  org?: string;
  title?: string;
  website?: string;
  note?: string;
}

export type QrInput =
  | { kind: 'text'; text: string }
  | { kind: 'url'; url: string }
  | { kind: 'wifi'; wifi: WifiInput }
  | { kind: 'vcard'; vcard: VCardInput };

export function normalizeUrl(raw: string): string {
  const url = raw.trim();
  if (!url) throw new Error('กรุณากรอกลิงก์');
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

/** escape ตามสเปก MECARD/WIFI: อักขระ \ ; , : " ต้องนำหน้าด้วย backslash */
function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

export function buildWifiPayload(input: WifiInput): string {
  const ssid = input.ssid.trim();
  if (!ssid) throw new Error('กรุณากรอกชื่อเครือข่าย (SSID)');

  const parts = [`T:${input.encryption}`, `S:${escapeWifi(ssid)}`];
  if (input.encryption !== 'nopass') {
    const password = input.password ?? '';
    if (!password) throw new Error('กรุณากรอกรหัสผ่าน หรือเลือก "ไม่มีรหัสผ่าน"');
    parts.push(`P:${escapeWifi(password)}`);
  }
  if (input.hidden) parts.push('H:true');
  return `WIFI:${parts.join(';')};;`;
}

/** escape ตามสเปก vCard: \ ; , และขึ้นบรรทัดใหม่ */
function escapeVCard(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export function buildVCardPayload(input: VCardInput): string {
  const first = (input.firstName ?? '').trim();
  const last = (input.lastName ?? '').trim();
  if (!first && !last) throw new Error('กรุณากรอกชื่อหรือนามสกุลอย่างน้อยหนึ่งช่อง');

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCard(last)};${escapeVCard(first)};;;`,
    `FN:${escapeVCard([first, last].filter(Boolean).join(' '))}`,
  ];

  const push = (key: string, value: string | undefined) => {
    const v = (value ?? '').trim();
    if (v) lines.push(`${key}:${escapeVCard(v)}`);
  };

  push('ORG', input.org);
  push('TITLE', input.title);
  push('TEL;TYPE=CELL', input.phone);
  push('EMAIL', input.email);
  if ((input.website ?? '').trim()) lines.push(`URL:${escapeVCard(normalizeUrl(input.website!))}`);
  push('NOTE', input.note);

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export function buildQrPayload(input: QrInput): string {
  switch (input.kind) {
    case 'text': {
      const text = input.text.trim();
      if (!text) throw new Error('กรุณากรอกข้อความ');
      return text;
    }
    case 'url':
      return normalizeUrl(input.url);
    case 'wifi':
      return buildWifiPayload(input.wifi);
    case 'vcard':
      return buildVCardPayload(input.vcard);
  }
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `npx vitest run src/tools/qr/qr-generator`
Expected: PASS ทุกข้อ

- [ ] **Step 5: เขียน meta.ts**

สร้าง `src/tools/qr/qr-generator/meta.ts`:

```ts
import type { ToolMeta } from '@/tools/types';

export const qrGeneratorMeta: ToolMeta = {
  slug: 'qr-generator',
  name: 'สร้าง QR Code ข้อความ ลิงก์ WiFi และ vCard',
  nameEn: 'QR Code Generator (Text / URL / WiFi / vCard)',
  category: 'qr',
  tier: 'free',
  description:
    'สร้าง QR Code ฟรีจากข้อความ ลิงก์เว็บไซต์ รหัส WiFi หรือนามบัตร vCard ดาวน์โหลดเป็นไฟล์ PNG ความละเอียดสูงได้ทันที ทุกอย่างสร้างในเบราว์เซอร์ ข้อมูลไม่ถูกส่งออกไปไหน',
  keywords: ['สร้าง qr code', 'qr code wifi', 'qr code นามบัตร', 'สร้างคิวอาร์โค้ดฟรี', 'qr code ลิงก์'],
  howTo: [
    'เลือกประเภท QR ที่ต้องการ: ข้อความ ลิงก์ WiFi หรือ vCard',
    'กรอกข้อมูลในช่องที่ปรากฏ QR จะสร้างใหม่ทันทีทุกครั้งที่พิมพ์',
    'กด "ดาวน์โหลด PNG" เพื่อบันทึกรูป หรือกดคัดลอกข้อมูลดิบไปใช้ต่อ',
  ],
  faq: [
    { q: 'QR WiFi ใช้อย่างไร', a: 'สแกนด้วยกล้องมือถือแล้วเครื่องจะถามว่าต้องการเชื่อมต่อเครือข่ายนี้หรือไม่ รองรับทั้ง iPhone และ Android รุ่นใหม่ เหมาะกับร้านกาแฟหรือออฟฟิศที่ไม่อยากบอกรหัสผ่านทีละคน' },
    { q: 'ข้อมูลที่กรอกถูกส่งขึ้นเซิร์ฟเวอร์ไหม', a: 'ไม่ QR ถูกสร้างด้วย JavaScript ในเบราว์เซอร์ของคุณทั้งหมด รหัส WiFi และข้อมูลนามบัตรจึงไม่ถูกส่งออกจากเครื่อง' },
    { q: 'QR ที่สร้างมีวันหมดอายุไหม', a: 'ไม่มี QR ที่ได้เป็นแบบคงที่ (static) ข้อมูลฝังอยู่ในตัวรูปโดยตรง ใช้ได้ตลอดไปตราบใดที่ข้อมูลข้างในยังถูกต้อง' },
  ],
};
```

- [ ] **Step 6: เขียน Tool.tsx**

สร้าง `src/tools/qr/qr-generator/Tool.tsx`:

```tsx
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildQrPayload, type QrInput, type WifiEncryption } from './logic';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';

type Kind = QrInput['kind'];

export default function QrGeneratorTool() {
  const [kind, setKind] = useState<Kind>('text');
  const [text, setText] = useState('สวัสดี ToolSiam');
  const [url, setUrl] = useState('toolsiam.com');
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [encryption, setEncryption] = useState<WifiEncryption>('WPA');
  const [hidden, setHidden] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');

  let payload = '';
  let payloadError = '';
  try {
    payload = buildQrPayload(
      kind === 'text'
        ? { kind, text }
        : kind === 'url'
          ? { kind, url }
          : kind === 'wifi'
            ? { kind, wifi: { ssid, password, encryption, hidden } }
            : { kind, vcard: { firstName, lastName, phone, email, org } },
    );
  } catch (e) {
    payloadError = (e as Error).message;
  }

  useEffect(() => {
    if (!payload) {
      setDataUrl('');
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(payload, { width: 512, margin: 2, errorCorrectionLevel: 'M' })
      .then((u) => {
        if (cancelled) return;
        setDataUrl(u);
        setError('');
      })
      .catch(() => {
        if (cancelled) return;
        setDataUrl('');
        setError('ข้อมูลยาวเกินกว่าที่ QR รองรับ กรุณาลดความยาวลง');
      });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Field label="ประเภท QR" htmlFor="kind">
          <Select id="kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="text">ข้อความ</option>
            <option value="url">ลิงก์เว็บไซต์</option>
            <option value="wifi">WiFi</option>
            <option value="vcard">นามบัตร (vCard)</option>
          </Select>
        </Field>

        {kind === 'text' && (
          <Field label="ข้อความ" htmlFor="text">
            <Textarea id="text" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        )}

        {kind === 'url' && (
          <Field label="ลิงก์" htmlFor="url" hint="ไม่ต้องพิมพ์ https:// ก็ได้">
            <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
        )}

        {kind === 'wifi' && (
          <>
            <Field label="ชื่อเครือข่าย (SSID)" htmlFor="ssid">
              <Input id="ssid" value={ssid} onChange={(e) => setSsid(e.target.value)} />
            </Field>
            <Field label="ระบบเข้ารหัส" htmlFor="enc">
              <Select id="enc" value={encryption} onChange={(e) => setEncryption(e.target.value as WifiEncryption)}>
                <option value="WPA">WPA / WPA2 / WPA3</option>
                <option value="WEP">WEP</option>
                <option value="nopass">ไม่มีรหัสผ่าน</option>
              </Select>
            </Field>
            {encryption !== 'nopass' && (
              <Field label="รหัสผ่าน" htmlFor="pw">
                <Input id="pw" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="size-4" />
              เครือข่ายซ่อนชื่อ (hidden SSID)
            </label>
          </>
        )}

        {kind === 'vcard' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ชื่อ" htmlFor="fn">
              <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field label="นามสกุล" htmlFor="ln">
              <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
            <Field label="เบอร์โทร" htmlFor="tel">
              <Input id="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="อีเมล" htmlFor="mail">
              <Input id="mail" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="บริษัท/หน่วยงาน" htmlFor="org">
              <Input id="org" value={org} onChange={(e) => setOrg(e.target.value)} />
            </Field>
          </div>
        )}

        {(payloadError || error) && <p className="text-sm text-red-600">{payloadError || error}</p>}
      </div>

      <div className="flex flex-col items-center gap-3">
        {dataUrl ? (
          <>
            <img src={dataUrl} alt="QR Code" width={320} height={320} className="rounded-lg border border-slate-200 bg-white" />
            <div className="flex flex-wrap justify-center gap-2">
              <a href={dataUrl} download={`toolsiam-qr-${kind}.png`} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                ดาวน์โหลด PNG
              </a>
              <Button variant="secondary" onClick={() => navigator.clipboard.writeText(payload)}>
                คัดลอกข้อมูลดิบ
              </Button>
            </div>
          </>
        ) : (
          <div className="flex h-80 w-80 items-center justify-center rounded-lg border border-dashed border-slate-300 text-center text-sm text-slate-400">
            กรอกข้อมูลทางซ้ายเพื่อสร้าง QR
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: ลงทะเบียน**

`src/tools/registry.ts`: `import { qrGeneratorMeta } from './qr/qr-generator/meta';` แล้วใส่ `qrGeneratorMeta` ต่อท้าย `promptpayQrMeta` ใน array `tools`

`src/tools/loaders.ts`: `'qr-generator': () => import('./qr/qr-generator/Tool'),`

- [ ] **Step 8: ทดสอบและ commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: ผ่านทั้งหมด

```bash
git add src/tools/qr/qr-generator src/tools/registry.ts src/tools/loaders.ts
git commit -m "feat(tool): qr-generator — สร้าง QR ข้อความ ลิงก์ WiFi และ vCard

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: เครื่องมือ "อ่าน QR จากรูป" (`qr-reader`, free)

Task เดียวในเฟสนี้ที่เพิ่ม dependency — `jsqr@1.4.0` (มี `.d.ts` ในตัว) `logic.ts` เก็บเฉพาะส่วนที่ pure คือการตีความข้อความที่อ่านได้ ส่วนการถอดรหัสภาพอยู่ใน `Tool.tsx` เพราะต้องใช้ canvas

**Files:**
- Create: `src/tools/qr/qr-reader/logic.ts`, `meta.ts`, `Tool.tsx`
- Test: `src/tools/qr/qr-reader/logic.test.ts`
- Modify: `package.json`, `package-lock.json`, `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Consumes: `jsQR(data: Uint8ClampedArray, width: number, height: number)` จาก `jsqr` (ใน Tool.tsx เท่านั้น)
- Produces: `QrKind`, `QrParsed`, `classifyQrText(raw: string): QrParsed`

- [ ] **Step 1: ติดตั้ง dependency**

Run: `npm install jsqr@1.4.0`
Expected: `package.json` มี `"jsqr": "^1.4.0"` ใน `dependencies` และ `package-lock.json` เปลี่ยน

- [ ] **Step 2: เขียน test**

สร้าง `src/tools/qr/qr-reader/logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { classifyQrText } from './logic';

describe('classifyQrText', () => {
  it('ลิงก์เว็บ', () => {
    const r = classifyQrText('https://toolsiam.com/t/qr-reader');
    expect(r.kind).toBe('url');
    expect(r.label).toBe('ลิงก์เว็บไซต์');
    expect(r.fields).toEqual([{ label: 'ลิงก์', value: 'https://toolsiam.com/t/qr-reader' }]);
  });

  it('WiFi พร้อม unescape อักขระพิเศษ', () => {
    const r = classifyQrText('WIFI:T:WPA;S:Cafe\\;1;P:a\\:b;H:true;;');
    expect(r.kind).toBe('wifi');
    expect(r.fields).toEqual([
      { label: 'ชื่อเครือข่าย', value: 'Cafe;1' },
      { label: 'รหัสผ่าน', value: 'a:b' },
      { label: 'ระบบเข้ารหัส', value: 'WPA' },
      { label: 'เครือข่ายซ่อนชื่อ', value: 'ใช่' },
    ]);
  });

  it('WiFi ที่ไม่มีรหัสผ่าน', () => {
    const r = classifyQrText('WIFI:T:nopass;S:Free;;');
    expect(r.kind).toBe('wifi');
    expect(r.fields).toContainEqual({ label: 'รหัสผ่าน', value: '(ไม่มี)' });
  });

  it('vCard ดึงชื่อ เบอร์ อีเมล', () => {
    const raw = ['BEGIN:VCARD', 'VERSION:3.0', 'N:ใจดี;สมชาย;;;', 'FN:สมชาย ใจดี', 'TEL;TYPE=CELL:0812345678', 'EMAIL:somchai@example.com', 'END:VCARD'].join('\r\n');
    const r = classifyQrText(raw);
    expect(r.kind).toBe('vcard');
    expect(r.fields).toContainEqual({ label: 'ชื่อ', value: 'สมชาย ใจดี' });
    expect(r.fields).toContainEqual({ label: 'เบอร์โทร', value: '0812345678' });
    expect(r.fields).toContainEqual({ label: 'อีเมล', value: 'somchai@example.com' });
  });

  it('QR PromptPay (EMVCo)', () => {
    const r = classifyQrText('00020101021129370016A000000677010111011300660000000005802TH53037646304A1B2');
    expect(r.kind).toBe('promptpay');
    expect(r.label).toBe('QR PromptPay');
  });

  it('เบอร์โทรและอีเมล', () => {
    expect(classifyQrText('tel:0812345678').kind).toBe('tel');
    expect(classifyQrText('mailto:hi@toolsiam.com').fields[0].value).toBe('hi@toolsiam.com');
  });

  it('ข้อความทั่วไป', () => {
    const r = classifyQrText('สวัสดี ToolSiam');
    expect(r.kind).toBe('text');
    expect(r.fields[0].value).toBe('สวัสดี ToolSiam');
  });

  it('เก็บข้อความดิบไว้เสมอ', () => {
    expect(classifyQrText('tel:02-000-0000').raw).toBe('tel:02-000-0000');
  });
});
```

- [ ] **Step 3: รัน test ให้เห็นว่า fail**

Run: `npx vitest run src/tools/qr/qr-reader`
Expected: FAIL — `Failed to resolve import "./logic"`

- [ ] **Step 4: เขียน logic.ts**

สร้าง `src/tools/qr/qr-reader/logic.ts`:

```ts
export type QrKind = 'url' | 'wifi' | 'vcard' | 'promptpay' | 'tel' | 'email' | 'text';

export interface QrField {
  label: string;
  value: string;
}

export interface QrParsed {
  kind: QrKind;
  /** ชื่อประเภทภาษาไทยสำหรับแสดงผล */
  label: string;
  fields: QrField[];
  raw: string;
}

/** ย้อน escape ของสเปก WIFI: (\; \, \: \" \\) */
function unescapeWifi(value: string): string {
  return value.replace(/\\(.)/g, '$1');
}

/** ตัดสตริง WIFI: เป็นคู่ key:value โดยไม่ตัดตรง \; ที่ถูก escape ไว้ */
function splitWifiFields(body: string): string[] {
  const out: string[] = [];
  let current = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '\\') {
      current += ch + (body[i + 1] ?? '');
      i += 1;
    } else if (ch === ';') {
      if (current) out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) out.push(current);
  return out;
}

function parseWifi(raw: string): QrField[] {
  const map = new Map<string, string>();
  for (const part of splitWifiFields(raw.slice(5))) {
    const idx = part.indexOf(':');
    if (idx > 0) map.set(part.slice(0, idx).toUpperCase(), unescapeWifi(part.slice(idx + 1)));
  }
  const encryption = map.get('T') ?? 'nopass';
  return [
    { label: 'ชื่อเครือข่าย', value: map.get('S') ?? '' },
    { label: 'รหัสผ่าน', value: encryption === 'nopass' ? '(ไม่มี)' : (map.get('P') ?? '(ไม่มี)') },
    { label: 'ระบบเข้ารหัส', value: encryption },
    { label: 'เครือข่ายซ่อนชื่อ', value: map.get('H') === 'true' ? 'ใช่' : 'ไม่ใช่' },
  ];
}

function unescapeVCard(value: string): string {
  return value.replace(/\\n/g, '\n').replace(/\\([\\;,])/g, '$1');
}

function parseVCard(raw: string): QrField[] {
  const wanted: { prefix: RegExp; label: string }[] = [
    { prefix: /^FN:/i, label: 'ชื่อ' },
    { prefix: /^ORG:/i, label: 'บริษัท/หน่วยงาน' },
    { prefix: /^TITLE:/i, label: 'ตำแหน่ง' },
    { prefix: /^TEL[^:]*:/i, label: 'เบอร์โทร' },
    { prefix: /^EMAIL[^:]*:/i, label: 'อีเมล' },
    { prefix: /^URL:/i, label: 'เว็บไซต์' },
    { prefix: /^NOTE:/i, label: 'บันทึก' },
  ];
  const fields: QrField[] = [];
  for (const line of raw.split(/\r?\n/)) {
    for (const w of wanted) {
      if (w.prefix.test(line)) {
        fields.push({ label: w.label, value: unescapeVCard(line.replace(w.prefix, '')).trim() });
        break;
      }
    }
  }
  return fields;
}

export function classifyQrText(raw: string): QrParsed {
  const text = raw.trim();

  if (/^WIFI:/i.test(text)) {
    return { kind: 'wifi', label: 'เครือข่าย WiFi', fields: parseWifi(text), raw };
  }
  if (/^BEGIN:VCARD/i.test(text)) {
    return { kind: 'vcard', label: 'นามบัตร (vCard)', fields: parseVCard(text), raw };
  }
  // EMVCo payload ของ PromptPay: ขึ้นต้นด้วย 0002 และมี Application ID ของ PromptPay
  if (/^0002/.test(text) && text.includes('A000000677010111')) {
    return {
      kind: 'promptpay',
      label: 'QR PromptPay',
      fields: [
        { label: 'รูปแบบ', value: 'EMVCo PromptPay' },
        { label: 'ข้อมูลดิบ', value: text },
      ],
      raw,
    };
  }
  if (/^tel:/i.test(text)) {
    return { kind: 'tel', label: 'เบอร์โทรศัพท์', fields: [{ label: 'เบอร์โทร', value: text.slice(4) }], raw };
  }
  if (/^mailto:/i.test(text)) {
    return { kind: 'email', label: 'อีเมล', fields: [{ label: 'อีเมล', value: text.slice(7) }], raw };
  }
  if (/^https?:\/\//i.test(text)) {
    return { kind: 'url', label: 'ลิงก์เว็บไซต์', fields: [{ label: 'ลิงก์', value: text }], raw };
  }
  return { kind: 'text', label: 'ข้อความ', fields: [{ label: 'ข้อความ', value: text }], raw };
}
```

- [ ] **Step 5: รัน test ให้ผ่าน**

Run: `npx vitest run src/tools/qr/qr-reader`
Expected: PASS ทุกข้อ

- [ ] **Step 6: เขียน meta.ts**

สร้าง `src/tools/qr/qr-reader/meta.ts`:

```ts
import type { ToolMeta } from '@/tools/types';

export const qrReaderMeta: ToolMeta = {
  slug: 'qr-reader',
  name: 'อ่าน QR Code จากรูปภาพ',
  nameEn: 'QR Code Reader from Image',
  category: 'qr',
  tier: 'free',
  description:
    'อัปโหลดหรือลากรูปที่มี QR Code เข้ามาเพื่ออ่านข้อมูลข้างใน รองรับลิงก์ ข้อความ รหัส WiFi นามบัตร vCard และ QR PromptPay โดยถอดรหัสในเบราว์เซอร์ ไม่มีการอัปโหลดรูปขึ้นเซิร์ฟเวอร์',
  keywords: ['อ่าน qr code จากรูป', 'สแกน qr จากภาพ', 'ถอดรหัส qr', 'เช็ค qr code ปลอดภัยไหม', 'qr reader ออนไลน์'],
  howTo: [
    'ลากรูปที่มี QR Code มาวาง หรือกดเลือกไฟล์จากเครื่อง',
    'รอสักครู่ให้ระบบถอดรหัส แล้วดูข้อมูลที่อ่านได้พร้อมประเภทที่ตรวจพบ',
    'กดคัดลอกข้อความ หรือกดเปิดลิงก์เมื่อตรวจสอบแล้วว่าปลอดภัย',
  ],
  faq: [
    { q: 'รูปถูกอัปโหลดขึ้นเซิร์ฟเวอร์ไหม', a: 'ไม่ รูปถูกวาดลงบน canvas และถอดรหัสด้วย JavaScript ในเครื่องของคุณเอง ไฟล์ไม่เคยถูกส่งออกจากเบราว์เซอร์' },
    { q: 'ทำไมบางรูปอ่านไม่ออก', a: 'มักเกิดจากรูปเบลอ แสงสะท้อน QR เล็กเกินไป หรือถูกครอบตัดจนขาดมุมระบุตำแหน่ง ลองถ่ายใหม่ให้ QR อยู่กลางภาพ คมชัด และมีขอบขาวรอบด้าน' },
    { q: 'เครื่องมือนี้ช่วยตรวจ QR หลอกลวงได้ไหม', a: 'ช่วยได้ระดับหนึ่ง เพราะแสดงลิงก์เต็มให้เห็นก่อนกด ทำให้ตรวจชื่อโดเมนได้ว่าเป็นเว็บจริงหรือไม่ แต่ไม่ได้ตรวจสอบว่าปลายทางอันตรายหรือไม่ ควรพิจารณาก่อนเปิดทุกครั้ง' },
  ],
};
```

- [ ] **Step 7: เขียน Tool.tsx**

สร้าง `src/tools/qr/qr-reader/Tool.tsx`:

```tsx
import { useRef, useState } from 'react';
import jsQR from 'jsqr';
import { classifyQrText, type QrParsed } from './logic';
import { Button } from '@/components/ui';

async function decodeFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  bitmap.close();
  return jsQR(image.data, image.width, image.height)?.data ?? null;
}

export default function QrReaderTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState('');
  const [parsed, setParsed] = useState<QrParsed | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }
    setBusy(true);
    setError('');
    setParsed(null);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    try {
      const text = await decodeFile(file);
      if (text === null) setError('อ่าน QR จากรูปนี้ไม่สำเร็จ ลองใช้รูปที่ชัดขึ้นหรือครอบตัดให้เห็น QR เต็ม ๆ');
      else setParsed(classifyQrText(text));
    } catch {
      setError('เปิดไฟล์รูปไม่สำเร็จ กรุณาลองไฟล์อื่น');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 hover:border-brand-600"
      >
        <span className="text-2xl">🖼️</span>
        <span>ลากรูปที่มี QR มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      {busy && <p className="text-sm text-slate-500">กำลังอ่าน QR…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {preview && (
        <img src={preview} alt="รูปที่อัปโหลด" className="mx-auto max-h-64 rounded-lg border border-slate-200" />
      )}

      {parsed && (
        <div className="space-y-3 rounded-lg border border-brand-600/20 bg-brand-50 p-4">
          <div className="text-xs font-medium text-brand-700">ตรวจพบ: {parsed.label}</div>
          <dl className="grid gap-2 sm:grid-cols-2">
            {parsed.fields.map((f) => (
              <div key={f.label}>
                <dt className="text-xs text-slate-500">{f.label}</dt>
                <dd className="break-all text-sm font-medium">{f.value || '—'}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(parsed.raw)}>
              คัดลอกข้อความดิบ
            </Button>
            {parsed.kind === 'url' && (
              <a
                href={parsed.fields[0].value}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                เปิดลิงก์ในแท็บใหม่
              </a>
            )}
          </div>
          <p className="text-xs text-slate-500">
            ตรวจชื่อโดเมนให้แน่ใจก่อนเปิดลิงก์ทุกครั้ง QR ปลอมมักใช้โดเมนที่สะกดใกล้เคียงของจริง
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: ลงทะเบียน**

`src/tools/registry.ts`: `import { qrReaderMeta } from './qr/qr-reader/meta';` แล้วใส่ `qrReaderMeta` ต่อท้าย `qrGeneratorMeta` ใน array `tools`

`src/tools/loaders.ts`: `'qr-reader': () => import('./qr/qr-reader/Tool'),`

- [ ] **Step 9: ทดสอบและ commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: ผ่านทั้งหมด — ถ้า typecheck บ่นว่าไม่พบ types ของ `jsqr` ให้ยืนยันว่า `node_modules/jsqr/dist/index.d.ts` มีอยู่จริง (jsqr แถม types มาในแพ็กเกจ ไม่ต้องลง `@types/jsqr` ซึ่งไม่มีอยู่จริงบน npm)

```bash
git add package.json package-lock.json src/tools/qr/qr-reader src/tools/registry.ts src/tools/loaders.ts
git commit -m "feat(tool): qr-reader — อ่าน QR จากรูปภาพด้วย jsQR

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: ตรวจในเบราว์เซอร์ + deploy

**Files:**
- Modify: ไม่มี (เว้นแต่พบบั๊กจากการตรวจ)

**Interfaces:**
- Consumes: เครื่องมือทั้ง 5 ตัวจาก Task 1–5 ที่ลงทะเบียนใน registry แล้ว

- [ ] **Step 1: ตรวจ HTML ที่ build ออกมาว่ามีเนื้อหา SEO โดยไม่ต้องรัน JS**

Run:
```bash
npm run build
grep -c "คำถามที่พบบ่อย" dist/client/t/age-days.html dist/client/t/thai-year-convert.html dist/client/t/thai-holidays.html dist/client/t/qr-generator.html dist/client/t/qr-reader.html
grep -o "FAQPage" dist/client/t/thai-holidays.html | head -1
grep -c "loc>" dist/client/sitemap-0.xml
```
Expected: ทุกไฟล์เจอ "คำถามที่พบบ่อย" อย่างน้อย 1 ครั้ง, เจอ `FAQPage`, และจำนวน `<loc>` เพิ่มขึ้นจากเดิม 5 รายการ (12 เครื่องมือ → 17 เครื่องมือ)

- [ ] **Step 2: ทดสอบ 5 เครื่องมือใหม่ใน dev server**

Run: `npm run dev` แล้วเปิดทีละหน้า (ใช้ Browser pane ผ่าน `.claude/launch.json` ที่มีอยู่แล้ว)
- `/t/age-days` — โหมด "คำนวณอายุ": เปลี่ยนวันเกิดแล้วตัวเลขอัปเดต และ hint บอก พ.ศ. ถูก; สลับเป็นโหมด "นับวันระหว่างสองวันที่" แล้วกรอกวันสิ้นสุดก่อนวันเริ่มต้น → ต้องได้ผลเท่ากันไม่ error
- `/t/thai-year-convert` — พิมพ์ปีในช่อง พ.ศ. แล้วช่อง ค.ศ. อัปเดต และกลับกัน; กด "คัดลอกแบบเต็ม" แล้วปุ่มขึ้น "คัดลอกแล้ว ✓"
- `/t/thai-holidays` — สลับปฏิทินธนาคาร/ราชการ แล้วจำนวนแถวเปลี่ยน (ธนาคาร 21 แถว vs ราชการ 22 แถว); ใส่ช่วง 10–17 เม.ย. แล้ววันทำการ = 3; ใส่จำนวนวันทำการติดลบแล้วได้วันย้อนหลัง
- `/t/qr-generator` — สลับครบทั้ง 4 ประเภท QR ต้องเปลี่ยนทุกครั้ง; โหมด WiFi ที่ยังไม่กรอก SSID ต้องขึ้นข้อความ error ไม่ใช่ QR ค้าง; กดดาวน์โหลดได้ไฟล์ PNG
- `/t/qr-reader` — เอา PNG ที่ดาวน์โหลดจาก `/t/qr-generator` (ทั้งแบบ WiFi และแบบลิงก์) มาลากวาง → ต้องอ่านค่าได้ตรงกับที่กรอกไว้ รวมถึงกรณี SSID ที่มีอักขระ `;`
- `/c/date` และ `/c/qr` — เครื่องมือใหม่โผล่ครบ และ `/c/date` ไม่ใช่หน้าว่างอีกต่อไป
- `/tools` — ค้นหาคำว่า "วันหยุด", "wifi", "อายุ" แล้วเจอเครื่องมือที่ถูกต้อง; การ์ด `thai-holidays` ต้องมีป้าย "พรีเมียม"

Expected: ไม่มี error ใน console และทุกข้อเป็นไปตามที่ระบุ

- [ ] **Step 3: Deploy**

Run: `npm run deploy`
Expected: deploy สำเร็จ และแสดง `toolsiam.com (custom domain)`

- [ ] **Step 4: ตรวจ production**

Run:
```bash
for p in /t/age-days /t/thai-year-convert /t/thai-holidays /t/qr-generator /t/qr-reader /c/date /c/qr; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' "https://toolsiam.com$p")  $p"
done
```
Expected: `200` ทุกบรรทัด

- [ ] **Step 5: ตรวจว่าไม่มีไฟล์ค้าง**

Run: `git status --short`
Expected: ว่าง — งานทั้งหมด commit ไปแล้วราย Task

---

## Self-review (ทำแล้ว)

**1. Spec coverage** — spec หัวข้อ 4 หมวด "วันที่/เวลา" มี 3 แถว → แผนนี้ทำครบทั้ง 3 (Task 1 คำนวณอายุ+นับวัน, Task 2 แปลง พ.ศ.↔ค.ศ.+วันในสัปดาห์, Task 3 วันหยุดราชการ/ธนาคาร 2569+นับวันทำการ ตั้ง tier `premium` ตาม spec และเก็บข้อมูลใน `data.ts` ตามหมายเหตุ "ข้อมูลอยู่ใน D1/JSON อัปเดตรายปี" — MVP ใช้ไฟล์ในโค้ดเพราะหน้า tool ไม่แตะ D1 ตาม spec หัวข้อ 11) ✓ หมวด QR มี 3 แถว มีแล้ว 1 (promptpay-qr จาก Phase 1) → แผนนี้เติมอีก 2 ครบหมวด ✓ หมวดที่เหลือ (รูป/PDF/dev/web/RTGS/AdSlot) อยู่ในแผน 4c–4d โดยตั้งใจ ✓

**2. Placeholder scan** — ไม่มี TBD/TODO/"เหมือน Task N"; ทุก step ที่ต้องเขียนโค้ดมี code block เต็ม ทุก test มี assertion จริงพร้อมค่าที่คำนวณและตรวจสอบมาแล้ว (13,265 วัน, 249 วัน, day-of-year 251, weekday index ของ 2026-09-08 = 2 / 2026-05-31 = 0 / 2026-12-05 = 6, วันหยุดธนาคาร 19 วัน, วันทำการธนาคารทั้งปี 242 วัน) ✓

**3. Type consistency** — helper ใน `src/lib/date.ts` (`parseIsoDate`, `toIsoDate`, `daysBetweenDates`, `addDays`, `weekdayIndex`, `isWeekend`, `daysInMonth`, `isLeapYear`) ถูก import ด้วยชื่อเดียวกันทุกที่ใน Task 1–3 ✓ `DiffParts`/`AgeResult`/`DateSpan`, `ThaiDateInfo`/`FormatOptions`, `Holiday`/`HolidayCalendar`/`BusinessDaySpan`, `WifiInput`/`VCardInput`/`QrInput`, `QrKind`/`QrField`/`QrParsed` — ชื่อ field ใน test ตรงกับ interface ใน logic ทุกตัว ✓ ชื่อ export ของ meta ที่ใส่ใน registry (`ageDaysMeta`, `thaiYearConvertMeta`, `thaiHolidaysMeta`, `qrGeneratorMeta`, `qrReaderMeta`) ตรงกับที่ประกาศในแต่ละ `meta.ts` และคีย์ใน `loaders.ts` ตรงกับ `slug` ทุกตัว (มี `registry.test.ts` บังคับอยู่แล้ว) ✓ `Tool.tsx` ใช้เฉพาะ component ที่มีจริงใน `src/components/ui.tsx` (`Button`, `Field`, `Input`, `Select`, `Textarea`, `Stat`, `ResultBox`) ✓

**ความเสี่ยงที่รู้ตัว:**
- **ข้อมูลวันหยุด** ยืนยันจากการรายงานประกาศ ธปท. โดย PPTV และ Thai PBS (ตรงกันทั้งสองแหล่ง และจำนวน 19 วันตรงกับที่ประกาศระบุ) **ไม่ได้อ่านจากไฟล์ประกาศของ ธปท. โดยตรง** เพราะหน้า bot.or.th เรนเดอร์ด้วย JavaScript ทั้งหมด — ถ้าต้องการความมั่นใจสูงสุด ให้เปิด https://www.bot.or.th/th/financial-institutions-holiday.html ใน Browser pane ระหว่าง Task 3 แล้วเทียบทีละวัน; assertion "19 วัน" ใน test จะจับได้ทันทีถ้าข้อมูลถูกแก้ผิด
- **1 พ.ค. เป็นวันหยุดราชการหรือไม่** — แหล่งข่าวรวมบางแห่งจัดไว้ในตารางวันหยุดราชการด้วย แผนนี้เลือก `government: false` ตามหลักที่ว่าวันแรงงานเป็นวันหยุดของภาคเอกชนและสถาบันการเงิน ถ้าต้องแก้ทีหลัง ให้แก้ 1 บรรทัดใน `data.ts` และตัวเลข 20/241 ใน `logic.test.ts`
- **`createImageBitmap` ใน `qr-reader`** รองรับทุกเบราว์เซอร์ปัจจุบัน แต่ Safari รุ่นเก่า (< 15) ไม่รองรับ — ถ้าเจอปัญหาใน Task 6 ให้ fallback เป็น `new Image()` + `onload` แล้ววาดลง canvas เหมือนกัน
