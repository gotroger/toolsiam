import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import type { CategoryId, CategoryMeta } from '@/tools/types';
import { Button, EmptyState } from '@/components/ui';
import { SearchField } from '@/components/ui/search-field';
import ToolCard from './ToolCard';
import ToolIcon from './ToolIcon';
import CategoryPill from './CategoryPill';
import { categoryLabels, toolPresentation, type DiscoveryTool } from './tool-presentation';
import { getCategoryUrl, getToolsUrl, getToolUrl } from '@/lib/routes';

type SearchCategory = Pick<CategoryMeta, 'id' | 'name' | 'nameEn' | 'description' | 'landingPath'>;
interface Props {
  tools: DiscoveryTool[];
  categories: SearchCategory[];
  initialCategory?: CategoryId;
  mode?: 'catalog' | 'command';
}

export default function ToolSearch({ tools, categories, initialCategory, mode = 'catalog' }: Props) {
  const command = mode === 'command';
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<CategoryId | 'all'>(initialCategory ?? 'all');
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const resultsId = useId();
  const fuse = useMemo(
    () =>
      new Fuse(
        tools.map((tool) => ({
          ...tool,
          categoryName: categories.find((c) => c.id === tool.category)?.name ?? '',
          categoryLabel: tool.category ? categoryLabels[tool.category] : '',
        })),
        {
          keys: [
            { name: 'name', weight: 3 },
            { name: 'keywords', weight: 2 },
            'nameEn',
            'description',
            'categoryName',
            'categoryLabel',
          ],
          threshold: 0.35,
          ignoreLocation: true,
        },
      ),
    [tools, categories],
  );

  useEffect(() => {
    if (command) return;
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      setQ(params.get('q') ?? '');
      const id = params.get('category');
      setCategory(
        id === 'all' || categories.some((c) => c.id === id && !c.landingPath)
          ? (id as CategoryId)
          : (initialCategory ?? 'all'),
      );
      if (params.get('focus') === 'search') root.current?.querySelector('input')?.focus();
    };
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [command, categories, initialCategory]);

  function persist(query: string, selected: CategoryId | 'all', push = false) {
    if (command) return;
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    if (selected !== (initialCategory ?? 'all')) url.searchParams.set('category', selected);
    else url.searchParams.delete('category');
    url.searchParams.delete('focus');
    if (push) window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  }
  function changeQuery(value: string) {
    setQ(value);
    setOpen(true);
    if (!composing) persist(value, category);
  }
  function reset() {
    setQ('');
    setCategory(initialCategory ?? 'all');
    persist('', initialCategory ?? 'all');
    root.current?.querySelector('input')?.focus();
  }

  const query = q.trim();
  const results = useMemo(
    () =>
      (query ? fuse.search(query).map((r) => r.item) : tools).filter(
        (t) => category === 'all' || t.category === category,
      ),
    [query, fuse, tools, category],
  );
  const categoryMatches = query
    ? categories.filter((c) =>
        `${c.name} ${c.nameEn} ${categoryLabels[c.id]} ${c.description}`.toLowerCase().includes(query.toLowerCase()),
      )
    : [];
  const showResults = !command || (query !== '' && open);

  return (
    <div
      ref={root}
      className={command ? 'command-search' : 'catalog-search'}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || composing) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          root.current?.querySelector('input')?.focus();
          setOpen(false);
        }
        if (command && event.key === 'ArrowDown' && event.target instanceof HTMLInputElement && showResults) {
          event.preventDefault();
          root.current?.querySelector<HTMLAnchorElement>('.command-results a')?.focus();
        }
      }}
    >
      <form
        role="search"
        action={getToolsUrl()}
        noValidate
        onSubmit={(event) => {
          if (composing) {
            event.preventDefault();
            return;
          }
          if (!command) {
            event.preventDefault();
            persist(q, category, true);
          }
        }}
      >
        <SearchField
          name="q"
          data-tool-search
          value={q}
          onValueChange={changeQuery}
          label="ค้นหาเครื่องมือ"
          placeholder="ค้นหาเครื่องมือ หมวดหมู่ หรือสิ่งที่อยากทำ…"
          command
          onFocus={() => setOpen(true)}
          aria-controls={showResults ? resultsId : undefined}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(event) => {
            setComposing(false);
            persist(event.currentTarget.value, category);
          }}
        />
      </form>
      {!command && (
        <div className="category-pills mt-5" aria-label="กรองหมวดหมู่">
          <CategoryPill
            active={category === 'all'}
            count={tools.length}
            onClick={() => {
              setCategory('all');
              persist(q, 'all', true);
            }}
          />
          {categories
            .filter((c) => !c.landingPath)
            .map((c) => (
              <CategoryPill
                key={c.id}
                category={c.id}
                active={category === c.id}
                onClick={() => {
                  setCategory(c.id);
                  persist(q, c.id, true);
                }}
              />
            ))}
        </div>
      )}
      {showResults && (
        <div id={resultsId} className={command ? 'command-results' : 'catalog-results'}>
          {!command && <h2 className="sr-only">ผลการค้นหาเครื่องมือ</h2>}
          <p className="search-count" role="status">
            พบ {results.length} เครื่องมือ{categoryMatches.length > 0 && ` · ${categoryMatches.length} หมวดหมู่`}
          </p>
          {categoryMatches.length > 0 && (
            <div className="category-pills mb-4">
              {categoryMatches.map((c) => (
                <CategoryPill key={c.id} category={c.id} href={getCategoryUrl(c)} />
              ))}
            </div>
          )}
          {results.length === 0 && categoryMatches.length === 0 ? (
            <EmptyState
              title="ไม่พบเครื่องมือที่ตรงกับคำค้น"
              description="ลองคำสั้น ๆ เช่น ภาษี เงินเดือน หรือ QR"
              action={<Button onClick={reset}>ล้างตัวกรอง</Button>}
            />
          ) : command ? (
            <>
              <ul>
                {results.slice(0, 6).map((tool) => (
                  <li key={tool.slug}>
                    <a href={getToolUrl(tool.slug)} className="command-result" data-category={tool.category}>
                      <span className="tool-icon">
                        <ToolIcon category={tool.category} slug={tool.slug} />
                      </span>
                      <span>
                        <strong>{toolPresentation(tool).name}</strong>
                        <small>{toolPresentation(tool).description}</small>
                      </span>
                      <span className="ml-auto" aria-hidden="true">
                        ↗
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              {results.length > 0 && (
                <a className="all-results" href={`${getToolsUrl()}?q=${encodeURIComponent(q)}`}>
                  ดูผลการค้นหาทั้งหมด <span aria-hidden="true">→</span>
                </a>
              )}
            </>
          ) : (
            <ul className="card-grid">
              {results.map((tool) => (
                <li key={tool.slug} className="min-w-0">
                  <ToolCard tool={tool} />
                </li>
              ))}
            </ul>
          )}
          {!command && (query || category !== (initialCategory ?? 'all')) && results.length > 0 && (
            <Button className="mt-4" variant="secondary" onClick={reset}>
              ล้างตัวกรอง
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
