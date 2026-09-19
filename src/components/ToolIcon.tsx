import { CATEGORY_ICON_PATHS } from '@/lib/category-icons.mjs';
import type { CategoryId } from '@/tools/types';
import { TOOL_GLYPHS } from './tool-glyphs';
export default function ToolIcon({
  category,
  slug,
  className = '',
}: {
  category: CategoryId | null;
  slug?: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={(slug && TOOL_GLYPHS[slug]) || CATEGORY_ICON_PATHS[category ?? 'daily']} />
    </svg>
  );
}
