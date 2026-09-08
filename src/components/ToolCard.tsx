import type { ToolMeta } from '@/tools/types';
import { categories } from '@/tools/categories';
import { getToolUrl } from '@/lib/routes';
import { COVER_HEIGHT, COVER_WIDTH, resolveCover } from '@/tools/covers';

/**
 * การ์ดเครื่องมือใช้ร่วมกันทั้งหน้า static (Astro) และหน้าค้นหา (React island)
 * ไม่มี state จึง render เป็น HTML ล้วนได้โดยไม่ต้อง hydrate
 *
 * โครงเดียวกันทุกใบ: ภาพ 16:9 → ชื่อ → คำอธิบาย → หมวดหมู่ (ชิดล่างเสมอ)
 * ไม่มีป้ายสถานะราคา — ทุกเครื่องมือใช้ฟรี ป้ายจึงไม่ให้ข้อมูลอะไร (§20 M5)
 */
export default function ToolCard({ tool }: { tool: ToolMeta }) {
  const cat = categories.find((c) => c.id === tool.category);
  const cover = resolveCover(tool);

  return (
    <a
      href={getToolUrl(tool.slug)}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_0_rgb(16_24_40/0.04)] transition duration-200 ease-out hover:-translate-y-[3px] hover:border-brand-500/50 hover:shadow-[0_8px_24px_-8px_rgb(5_150_105/0.18),0_2px_6px_-2px_rgb(16_24_40/0.06)] focus-visible:-translate-y-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {/* จองพื้นที่ 16:9 ไว้ล่วงหน้า + พื้นหลังไล่สีทำหน้าที่เป็น skeleton ระหว่างภาพยังไม่มา */}
      <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-slate-100 bg-gradient-to-br from-brand-50 to-emerald-100">
        <img
          src={cover.src}
          alt={cover.alt}
          width={COVER_WIDTH}
          height={COVER_HEIGHT}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-[0.9375rem] font-medium leading-snug text-slate-900 transition-colors duration-150 group-hover:text-brand-700">
          {tool.name}
        </h3>

        <p className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-slate-500">{tool.description}</p>

        {cat && (
          <div className="mt-auto pt-3 text-xs text-slate-400">
            {cat.name}
          </div>
        )}
      </div>
    </a>
  );
}

/** โครงการ์ดระหว่างรอข้อมูล/ภาพ ใช้สัดส่วนเดียวกับการ์ดจริงเพื่อไม่ให้เกิด layout shift */
export function ToolCardSkeleton() {
  return (
    <div aria-hidden="true" className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="aspect-[16/9] w-full animate-pulse bg-gradient-to-br from-brand-50 to-emerald-100" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
