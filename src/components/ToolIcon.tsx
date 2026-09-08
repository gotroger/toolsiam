import { CATEGORY_ICON_PATHS } from '@/lib/category-icons.mjs';
import type { CategoryId } from '@/tools/types';
const paths: Record<string, string> = {
  'thai-income-tax': 'M6 3h9l4 4v14H6V3Zm8 0v5h5M9 12h7M9 16h5',
  'electricity-bill': 'm13 2-9 12h7l-1 8 10-13h-8l1-7Z',
  'net-salary': 'M3 7h18v13H3V7Zm0 0 14-4v4M16 12h5v4h-5v-4Z',
  'car-loan': 'm5 9 2-5h10l2 5M3 10h18v8H3v-8Zm2 8v3m14-3v3M6 13h2m8 0h2',
  'home-loan': 'm3 10 9-7 9 7M5 9v12h14V9M10 21v-8h4v8',
  'severance-pay': 'M3 7h18v14H3V7Zm5 0V3h8v4M3 12h18M10 12v3h4v-3',
  'ot-calculator': 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 4v6h5',
};
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
      <path d={(slug && paths[slug]) || CATEGORY_ICON_PATHS[category ?? 'daily']} />
    </svg>
  );
}
