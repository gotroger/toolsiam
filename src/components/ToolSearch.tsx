import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { getBrowsableCategories, getVisibleTools, type ToolMeta, type CategoryId } from '@/tools/registry';
import { Input, Select } from '@/components/ui';
import ToolCard from '@/components/ToolCard';
import { cardGrid, cardGridItem } from '@/components/grids';

const visibleTools = getVisibleTools();
const browsableCategories = getBrowsableCategories();

const fuse = new Fuse(visibleTools, {
  keys: [
    { name: 'name', weight: 3 },
    { name: 'keywords', weight: 2 },
    { name: 'nameEn', weight: 1 },
    { name: 'description', weight: 1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
});

export default function ToolSearch({ initialCategory }: { initialCategory?: CategoryId }) {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<CategoryId | 'all'>(initialCategory ?? 'all');

  const results: ToolMeta[] = useMemo(() => {
    const base = q.trim() ? fuse.search(q.trim()).map((r) => r.item) : visibleTools;
    return base.filter((t) => category === 'all' || t.category === category);
  }, [q, category]);

  const isFiltered = q.trim() !== '' || category !== (initialCategory ?? 'all');

  function resetFilters() {
    setQ('');
    setCategory(initialCategory ?? 'all');
  }

  return (
    <div>
      <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
        <Input type="search" placeholder="ค้นหาเครื่องมือ เช่น ภาษี, บาทถ้วน, QR" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหาเครื่องมือ" />
        <Select value={category} onChange={(e) => setCategory(e.target.value as CategoryId | 'all')} aria-label="หมวดหมู่">
          <option value="all">ทุกหมวด</option>
          {browsableCategories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </Select>
      </div>

      <p className="mt-4 text-sm text-slate-500" role="status" aria-live="polite">พบ {results.length} เครื่องมือ</p>

      {results.length === 0 ? (
        <EmptyState query={q} onReset={resetFilters} />
      ) : (
        <ul className={`mt-4 ${cardGrid}`}>
          {results.map((t) => (
            <li key={t.slug} className={cardGridItem}>
              <ToolCard tool={t} />
            </li>
          ))}
        </ul>
      )}

      {isFiltered && results.length > 0 && (
        <button
          type="button"
          onClick={resetFilters}
          className="mt-2 rounded-lg px-2 py-1 text-sm text-brand-700 underline underline-offset-4 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          ล้างตัวกรอง
        </button>
      )}
    </div>
  );
}

function EmptyState({ query, onReset }: { query: string; onReset: () => void }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl" aria-hidden="true">🔍</div>
      <h2 className="mt-4 font-semibold text-slate-900">ไม่พบเครื่องมือที่ตรงกับที่ค้นหา</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
        {query.trim() ? <>ลองใช้คำค้นอื่น เช่น “ภาษี” “บาทถ้วน” “QR” หรือล้างตัวกรองเพื่อดูทั้งหมด</> : <>ลองล้างตัวกรองเพื่อดูเครื่องมือทั้งหมด</>}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 rounded-[11px] bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
      >
        ล้างตัวกรอง
      </button>
    </div>
  );
}
