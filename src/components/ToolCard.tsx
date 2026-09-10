import type { ToolMeta } from '@/tools/types';
import { getToolUrl } from '@/lib/routes';
import ToolIcon from './ToolIcon';
import { categoryLabels, toolPresentation } from './tool-presentation';

type TileTool = Pick<ToolMeta, 'slug' | 'name' | 'description' | 'category'>;
export default function ToolCard({ tool, featured = false }: { tool: TileTool; featured?: boolean }) {
  const copy = toolPresentation(tool);
  return (
    <a
      href={getToolUrl(tool.slug)}
      className={`tool-tile${featured ? ' tool-tile-featured' : ''}`}
      data-category={tool.category}
      aria-label={`เปิด${tool.name}`}
    >
      <div className="tool-tile-top">
        <span className="tool-icon">
          <ToolIcon category={tool.category} slug={tool.slug} />
        </span>
        <span className="tile-category">
          {featured ? 'แนะนำให้ลอง' : tool.category && categoryLabels[tool.category]}
        </span>
        <span className="tile-arrow" aria-hidden="true">
          ↗
        </span>
      </div>
      <div className="tool-tile-copy">
        <h3>{copy.name}</h3>
        <p>{copy.description}</p>
      </div>
      {/* ลายน้ำไอคอนของเครื่องมือ ทำให้การ์ดแต่ละใบมีลวดลายต่างกันโดยไม่ต้องมีไฟล์ภาพ */}
      {!featured && (
        <span className="tile-watermark" aria-hidden="true">
          <ToolIcon category={tool.category} slug={tool.slug} />
        </span>
      )}
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
