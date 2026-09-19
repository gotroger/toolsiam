import { useId, useMemo, useState } from 'react';
import { DREAM_ENTRIES, DREAM_GROUPS } from '@/content/dream/entries';
import { luckyNumbersFor } from '@/content/dream/lucky-numbers';
import { SearchField } from '@/components/ui/search-field';
import LuckyBalls from '@/components/dream/LuckyBalls';
import { getDreamEntryUrl } from '@/lib/routes';

/**
 * ค้นหาและกรองความฝัน — แสดงเป็นการ์ดสั้น ๆ ที่กวาดตาได้ ไม่ใช่รายการย่อหน้ายาวแบบบทความ
 *
 * ค้นแบบ substring ธรรมดา ไม่โหลด fuse.js เพิ่มบนหน้านี้ เพราะรายการมีแค่หลักสิบ
 * และผู้ใช้พิมพ์คำไทยตรง ๆ อย่าง "งู" "ฟันหลุด" ซึ่ง substring จับได้อยู่แล้ว
 * render ครบทุกใบตั้งแต่ฝั่ง server — ลิงก์ไปทุกเรื่องจึงอยู่ใน HTML เสมอ ไม่ต้องรอ JS
 */
const groupLabel: Record<string, string> = Object.fromEntries(DREAM_GROUPS.map((g) => [g.id, g.label]));

export default function DreamSearch() {
  const id = useId();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const q = query.trim().toLowerCase();

  const matched = useMemo(
    () =>
      DREAM_ENTRIES.filter(
        (e) =>
          (group === null || e.group === group) &&
          (q === '' || [e.title, e.keywords.join(' '), groupLabel[e.group] ?? ''].join(' ').toLowerCase().includes(q)),
      ),
    [q, group],
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
        {DREAM_GROUPS.map((g) => (
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
          ยังไม่มีเรื่องนี้ในตำรา ลองใช้คำที่สั้นลง เช่น พิมพ์ว่า “งู” แทน “ฝันเห็นงูตัวใหญ่”
        </p>
      ) : (
        <ul className="dream-grid mt-3">
          {matched.map((e) => {
            const lucky = luckyNumbersFor(e.slug);
            return (
              <li key={e.slug}>
                <a href={getDreamEntryUrl(e.slug)} className="dream-card">
                  <span className="dream-card-top">
                    <span className="dream-card-group">{groupLabel[e.group]}</span>
                    {lucky && <LuckyBalls numbers={lucky} />}
                  </span>
                  <span className="dream-card-title">{e.title}</span>
                  <span className="dream-card-snippet">{e.meaning}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
