import { useEffect } from 'react';
import { Button } from '@/components/ui';
import { loadFavorites, useFavorites } from '@/lib/favorites-client';
import { getToolsUrl, getToolUrl } from '@/lib/routes';
import type { ToolMeta } from '@/tools/types';

export type FavoriteTool = Pick<ToolMeta, 'slug' | 'name'>;

/**
 * รายการโปรดในหน้าบัญชี — ใช้ store ตัวเดียวกับปุ่มดาว (favorites-client.ts)
 *
 * `tools` มาจากหน้า account.astro ตอน build (ชื่อเครื่องมือเท่านั้น) เพื่อไม่ต้องลาก registry ทั้งก้อนเข้า bundle
 * slug ที่ไม่อยู่ใน `tools` (เครื่องมือที่ปลดระวางไปแล้ว) ข้ามไปเงียบ ๆ
 */
export function FavoritesList({ tools }: { tools: readonly FavoriteTool[] }) {
  const fav = useFavorites();
  const byName = new Map(tools.map((t) => [t.slug, t]));
  const items = fav.slugs.map((slug) => byName.get(slug)).filter((t): t is FavoriteTool => !!t);

  // ลิงก์ "รายการโปรด" ในเมนูบัญชีชี้ /account#favorites แต่ส่วนนี้เกิดหลัง hydrate + โหลดรายการ
  // เบราว์เซอร์จึงเลื่อนหา anchor ไม่เจอเอง — เลื่อนให้ครั้งเดียวเมื่อพร้อม
  const ready = fav.status === 'ready';
  useEffect(() => {
    if (ready && window.location.hash === '#favorites') document.getElementById('favorites')?.scrollIntoView();
  }, [ready]);

  return (
    <section id="favorites" aria-labelledby="favorites-heading" className="scroll-mt-24 space-y-3">
      <h2 id="favorites-heading" className="text-lg font-medium tracking-tight text-slate-900">
        รายการโปรด
      </h2>
      {fav.status === 'error' ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <p>โหลดรายการโปรดไม่สำเร็จ</p>
          <Button variant="secondary" onClick={() => void loadFavorites()}>
            ลองใหม่
          </Button>
        </div>
      ) : fav.status !== 'ready' ? (
        <p className="text-sm text-slate-500" role="status">
          กำลังโหลดรายการโปรด…
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600">
          ยังไม่มีรายการโปรด — กดปุ่ม <span aria-hidden="true">☆</span> รายการโปรด ในหน้าเครื่องมือที่ใช้บ่อย
          แล้วเปิดกลับมาได้จากตรงนี้ หรือจาก{' '}
          <a className="text-brand-700 underline" href={getToolsUrl()}>
            หน้าเครื่องมือทั้งหมด
          </a>
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
          {items.map((tool) => {
            const busy = fav.pending.includes(tool.slug);
            return (
              <li key={tool.slug} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <a className="min-w-0 truncate text-brand-700 hover:underline" href={getToolUrl(tool.slug)}>
                  <span className="mr-2 text-amber-700" aria-hidden="true">
                    ★
                  </span>
                  {tool.name}
                </a>
                <Button
                  variant="secondary"
                  aria-label={`นำออก: ${tool.name}`}
                  disabled={busy}
                  onClick={() => void fav.setFavorite(tool.slug, false)}
                >
                  นำออก
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <p role="status" className="text-sm text-red-700">
        {fav.error}
      </p>
    </section>
  );
}
