import { useId, useMemo, useState } from 'react';
import { SearchField } from '@/components/ui/search-field';
import LuckyBalls from '@/components/dream/LuckyBalls';
import ErrorBoundary from '@/components/ErrorBoundary';
import type { LuckyNumbers } from '@/content/dream/lucky-numbers';
import { getDreamEntryUrl } from '@/lib/routes';

/**
 * ค้นหาและกรองความฝัน — แสดงเป็นการ์ดสั้น ๆ ที่กวาดตาได้ ไม่ใช่รายการย่อหน้ายาวแบบบทความ
 *
 * รับข้อมูลเป็น prop แบบย่อจาก src/pages/dream/index.astro — **ห้าม import DREAM_ENTRIES ตรง ๆ**
 * เพราะจะลากบริบทและคำแนะนำของทุกเรื่อง (~70 KB) เข้า bundle ของ island ทั้งที่การ์ดใช้แค่ชื่อกับความหมายย่อ
 *
 * ค้นแบบ substring ธรรมดา ไม่โหลด fuse.js เพิ่มบนหน้านี้ เพราะรายการมีแค่หลักสิบ
 * render ครบทุกใบตั้งแต่ฝั่ง server — ลิงก์ไปทุกเรื่องจึงอยู่ใน HTML เสมอ ไม่ต้องรอ JS
 */
export interface DreamCardData {
  slug: string;
  title: string;
  keywords: string[];
  group: string;
  meaning: string;
  lucky?: LuckyNumbers;
}

export interface DreamGroup {
  id: string;
  label: string;
}

/** คำนำหน้าที่คนพิมพ์ติดมาแต่ไม่ได้บอกว่าฝันถึงอะไร — เรียงยาวไปสั้น ให้ "ฝันเห็น" ถูกตัดก่อน "ฝัน" */
const DREAM_PREFIXES = ['ฝันเห็น', 'ฝันว่า', 'ฝัน'];

/** ตัดช่องว่าง ตัวพิมพ์ใหญ่ และคำนำหน้า "ฝัน…" ออก */
export function normalizeDreamQuery(raw: string): string {
  let q = raw.trim().toLowerCase();
  for (let changed = true; changed;) {
    changed = false;
    for (const prefix of DREAM_PREFIXES) {
      if (q.startsWith(prefix)) {
        q = q.slice(prefix.length).trim();
        changed = true;
        break;
      }
    }
  }
  return q;
}

/**
 * แยกคำ — ภาษาไทยไม่เว้นวรรคระหว่างคำ จึงใช้ตัวตัดคำของเบราว์เซอร์ (Intl.Segmenter)
 * เบราว์เซอร์เก่าที่ไม่มีตัวนี้ได้แค่คำที่คั่นด้วยช่องว่าง ซึ่งก็ยังค้นแบบทั้งวลีได้เหมือนเดิม
 * ตัดคำที่ยาวตัวอักษรเดียวทิ้ง เพราะแทบจะ match ได้ทุกเรื่อง
 */
function words(q: string): string[] {
  const parts =
    typeof Intl !== 'undefined' && 'Segmenter' in Intl
      ? Array.from(new Intl.Segmenter('th', { granularity: 'word' }).segment(q))
          .filter((s) => s.isWordLike)
          .map((s) => s.segment)
      : q.split(/\s+/);
  return [...new Set(parts.map((w) => w.trim()).filter((w) => w.length >= 2 && !DREAM_PREFIXES.includes(w)))];
}

/**
 * เรื่องที่ตรงกับคำค้น
 *
 * 1. ทั้งวลี (หลังตัด "ฝันเห็น") เป็น substring → คืนทุกเรื่องที่ตรง ตามลำดับเดิม
 * 2. ไม่เจอเลย → แยกคำ แล้วคืนเฉพาะเรื่องที่ตรงจำนวนคำมากที่สุด
 *    "ฝันเห็นงูตัวใหญ่" → งู / ตัว / ใหญ่ — เรื่องงูตรงทั้ง "งู" และ "ใหญ่" จึงชนะเรื่องที่ตรงแค่ "ตัว"
 */
export function searchDreams<T extends DreamCardData>(
  entries: readonly T[],
  rawQuery: string,
  groupLabel: Readonly<Record<string, string>> = {},
): T[] {
  const q = normalizeDreamQuery(rawQuery);
  if (q === '') return [...entries];

  const haystack = (e: T) => [e.title, e.keywords.join(' '), groupLabel[e.group] ?? ''].join(' ').toLowerCase();
  const whole = entries.filter((e) => haystack(e).includes(q));
  if (whole.length > 0) return whole;

  const terms = words(q);
  if (terms.length === 0) return [];
  const scored = entries.map((e) => {
    const text = haystack(e);
    return { e, score: terms.filter((t) => text.includes(t)).length };
  });
  const best = Math.max(...scored.map((s) => s.score));
  return best === 0 ? [] : scored.filter((s) => s.score === best).map((s) => s.e);
}

interface Props {
  entries: DreamCardData[];
  groups: DreamGroup[];
}

function DreamSearchInner({ entries, groups }: Props) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const groupLabel = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g.label])), [groups]);

  const matched = useMemo(
    () =>
      searchDreams(
        entries.filter((e) => group === null || e.group === group),
        query,
        groupLabel,
      ),
    [entries, query, group, groupLabel],
  );

  return (
    <div>
      <SearchField
        id={id}
        label="ค้นหาความฝัน"
        value={query}
        placeholder="พิมพ์สิ่งที่ฝันเห็น เช่น งู ฟันหลุด น้ำ"
        onValueChange={setQuery}
        aria-describedby={`${id}-count`}
      />
      <div className="category-pills mt-4" role="group" aria-label="กรองตามหมวดความฝัน">
        <button type="button" className="category-pill" aria-pressed={group === null} onClick={() => setGroup(null)}>
          ทั้งหมด
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            className="category-pill"
            aria-pressed={group === g.id}
            onClick={() => setGroup(group === g.id ? null : g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
      <p id={`${id}-count`} aria-live="polite" className="mt-4 text-sm text-slate-600">
        พบ {matched.length} เรื่อง
      </p>
      {matched.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          ยังไม่มีเรื่องนี้ในตำรา ลองพิมพ์เฉพาะสิ่งที่ฝันเห็น เช่น “งู” “ฟันหลุด” หรือ “น้ำท่วม”
        </p>
      ) : (
        <ul className="dream-grid mt-3">
          {matched.map((e) => (
            <li key={e.slug}>
              <a href={getDreamEntryUrl(e.slug)} className="dream-card">
                <span className="dream-card-top">
                  <span className="dream-card-group">{groupLabel[e.group]}</span>
                  {e.lucky && <LuckyBalls numbers={e.lucky} />}
                </span>
                <span className="dream-card-title">{e.title}</span>
                <span className="dream-card-snippet">{e.meaning}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DreamSearch(props: Props) {
  return (
    <ErrorBoundary name="dream-search">
      <DreamSearchInner {...props} />
    </ErrorBoundary>
  );
}
