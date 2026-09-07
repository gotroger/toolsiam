import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { tools, categories, type ToolMeta, type CategoryId } from '@/tools/registry';
import { Input, Select } from '@/components/ui';

const fuse = new Fuse(tools, {
  keys: [
    { name: 'name', weight: 3 },
    { name: 'keywords', weight: 2 },
    { name: 'nameEn', weight: 1 },
    { name: 'description', weight: 1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
});

type TierFilter = 'all' | 'free' | 'premium';

export default function ToolSearch({ initialCategory }: { initialCategory?: CategoryId }) {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState<TierFilter>('all');
  const [category, setCategory] = useState<CategoryId | 'all'>(initialCategory ?? 'all');

  const results: ToolMeta[] = useMemo(() => {
    const base = q.trim() ? fuse.search(q.trim()).map((r) => r.item) : tools;
    return base.filter((t) => (tier === 'all' || t.tier === tier) && (category === 'all' || t.category === category));
  }, [q, tier, category]);

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input type="search" placeholder="ค้นหาเครื่องมือ เช่น ภาษี, บาทถ้วน, QR" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหาเครื่องมือ" />
        <Select value={category} onChange={(e) => setCategory(e.target.value as CategoryId | 'all')} aria-label="หมวดหมู่">
          <option value="all">ทุกหมวด</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </Select>
        <Select value={tier} onChange={(e) => setTier(e.target.value as TierFilter)} aria-label="ประเภท">
          <option value="all">ฟรี + พรีเมียม</option>
          <option value="free">เฉพาะฟรี</option>
          <option value="premium">เฉพาะพรีเมียม</option>
        </Select>
      </div>

      <p className="mt-3 text-sm text-slate-500">พบ {results.length} เครื่องมือ</p>

      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((t) => {
          const cat = categories.find((c) => c.id === t.category)!;
          return (
            <li key={t.slug}>
              <a href={`/t/${t.slug}`} className="block h-full rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-600 hover:shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug">{t.name}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${t.tier === 'premium' ? 'bg-amber-100 text-amber-800' : 'bg-brand-50 text-brand-700'}`}>
                    {t.tier === 'premium' ? 'พรีเมียม' : 'ฟรี'}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{t.description}</p>
                <div className="mt-2 text-xs text-slate-400">{cat.icon} {cat.name}</div>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
