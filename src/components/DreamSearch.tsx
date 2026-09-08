import { DREAM_ENTRIES, DREAM_GROUPS, type DreamEntry } from '@/content/dream/entries';
import { SearchableList } from '@/components/ui';
import { getDreamEntryUrl } from '@/lib/routes';

/**
 * ค้นหาความฝัน — ใช้ `SearchableList` ที่ Phase 0C วางไว้แล้ว
 *
 * ค้นแบบ substring ธรรมดา ไม่โหลด fuse.js เพิ่มบนหน้านี้ เพราะรายการมีแค่หลักสิบ
 * และผู้ใช้พิมพ์คำไทยตรง ๆ อย่าง "งู" "ฟันหลุด" ซึ่ง substring จับได้อยู่แล้ว
 */
const groupLabel = Object.fromEntries(DREAM_GROUPS.map((g) => [g.id, g.label]));

export default function DreamSearch() {
  return (
    <SearchableList<DreamEntry>
      items={DREAM_ENTRIES}
      label="ค้นหาความฝัน"
      placeholder="พิมพ์สิ่งที่ฝันเห็น เช่น งู ฟันหลุด น้ำ"
      emptyMessage="ยังไม่มีเรื่องนี้ในตำรา ลองใช้คำที่สั้นลง เช่น พิมพ์ว่า “งู” แทน “ฝันเห็นงูตัวใหญ่”"
      search={(e) => [e.title, e.keywords.join(' '), groupLabel[e.group] ?? ''].join(' ')}
      itemKey={(e) => e.slug}
      renderItem={(e) => (
        <a
          href={getDreamEntryUrl(e.slug)}
          className="block rounded-[10px] border border-slate-200 bg-surface p-3 transition-colors duration-150 hover:border-brand-600/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          <span className="font-medium text-slate-900">{e.title}</span>
          <span className="ml-2 text-xs text-slate-500">{groupLabel[e.group]}</span>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{e.meaning}</p>
        </a>
      )}
    />
  );
}
