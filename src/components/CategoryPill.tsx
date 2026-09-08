import type { CategoryId } from '@/tools/types';
import ToolIcon from './ToolIcon';
import { categoryLabels } from './tool-presentation';

type Props = { category?: CategoryId; active?: boolean; count?: number } & (
  { href: string; onClick?: never } | { href?: never; onClick: () => void }
);
export default function CategoryPill({ category, active = false, count, href, onClick }: Props) {
  const content = (
    <>
      {category && <ToolIcon category={category} />}
      <span>{category ? categoryLabels[category] : 'ทั้งหมด'}</span>
      {count !== undefined && <span className="pill-count">{count}</span>}
    </>
  );
  return href ? (
    <a className="category-pill" data-category={category} href={href} aria-current={active ? 'page' : undefined}>
      {content}
    </a>
  ) : (
    <button type="button" className="category-pill" data-category={category} aria-pressed={active} onClick={onClick}>
      {content}
    </button>
  );
}
