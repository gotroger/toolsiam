import type { ToolMeta } from '@/tools/types';
import { getToolUrl } from '@/lib/routes';
import ToolIcon from './ToolIcon';
import { categoryLabels, toolPresentation } from './tool-presentation';
import { formatUseCount } from '@/lib/usage';

type TileTool = Pick<ToolMeta, 'slug' | 'name' | 'description' | 'category'>;
interface Props {
  tool: TileTool;
  featured?: boolean;
  /**
   * ยอดใช้งานที่ผ่านเกณฑ์แล้ว (usage.ts `displayCount`) — ส่งมาเมื่อ React ถือข้อมูลอยู่ (ToolSearch)
   * `undefined` = การ์ด static ให้ src/scripts/usage-counts.ts เติมเอง · `null` = React คุมอยู่แต่ยังไม่ถึงเกณฑ์
   */
  useCount?: number | null;
  /** อยู่ในรายการโปรดของผู้ใช้ — แสดงดาวเล็ก ๆ บนการ์ด */
  favorite?: boolean;
}
export default function ToolCard({ tool, featured = false, useCount, favorite = false }: Props) {
  const copy = toolPresentation(tool);
  const managed = useCount !== undefined;
  return (
    <a
      href={getToolUrl(tool.slug)}
      className={`tool-tile${featured ? ' tool-tile-featured' : ''}`}
      data-category={tool.category}
      aria-label={`เปิด${tool.name}${favorite ? ' (อยู่ในรายการโปรด)' : ''}`}
    >
      <div className="tool-tile-top">
        <span className="tool-icon">
          <ToolIcon category={tool.category} slug={tool.slug} />
        </span>
        {/* หมวดกับยอดใช้งานซ้อนกันในคอลัมน์ที่เตี้ยกว่าไอคอน 48px — ตัวเลขมาทีหลังได้โดยการ์ดไม่สูงขึ้น */}
        <span className="tile-meta">
          <span className="tile-category">
            {featured ? 'แนะนำให้ลอง' : tool.category && categoryLabels[tool.category]}
          </span>
          {!featured && (
            <span className="tile-usage" data-usage-slug={tool.slug} data-usage-managed={managed ? '' : undefined}>
              {useCount ? formatUseCount(useCount) : null}
            </span>
          )}
        </span>
        {favorite && (
          // ชื่อที่ screen reader อ่านมาจาก aria-label ของลิงก์ (มีคำว่ารายการโปรดอยู่แล้ว) ดาวจึงซ่อนไว้
          <span className="tile-favorite" title="อยู่ในรายการโปรด" aria-hidden="true">
            ★
          </span>
        )}
        <span className="tile-arrow" aria-hidden="true">
          ↗
        </span>
      </div>
      <div className="tool-tile-copy">
        <h3>{copy.name}</h3>
        <p>{copy.description}</p>
      </div>
      {featured && (
        <>
          <span className="tile-launch">
            เริ่มคำนวณ <span aria-hidden="true">→</span>
          </span>
          <div className="tax-visual" aria-hidden="true">
            <div className="tax-paper">
              <span>ภาษีเงินได้</span>
              <strong>฿</strong>
              <i />
              <i />
              <div>รายได้ − ค่าลดหย่อน</div>
            </div>
            <span className="tax-stamp">✓</span>
          </div>
        </>
      )}
    </a>
  );
}
export function ToolCardSkeleton() {
  return (
    <div aria-hidden="true" className="tool-tile tile-skeleton">
      <div className="tool-icon" />
      <div className="mt-5 h-5 w-3/4 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-full rounded bg-slate-100" />
    </div>
  );
}
