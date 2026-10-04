// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToolSearch from './ToolSearch';
import { getActiveCategories, getVisibleTools } from '@/tools/registry';
import { toDiscoveryTool } from './tool-presentation';
import { __setUsageSummaryForTests } from '@/lib/usage-client';
import { __setPlanForTests } from '@/lib/plan-client';
import { __setFavoritesForTests } from '@/lib/favorites-client';
import { POPULAR_SORT_MIN_TOOLS, USE_DISPLAY_THRESHOLD, type UsageSummary } from '@/lib/usage';

const props = { tools: getVisibleTools().map(toDiscoveryTool), categories: getActiveCategories() };
beforeEach(() => {
  window.history.replaceState(null, '', '/tools');
  // ไม่ยิงเครือข่ายจริง: ไม่มีข้อมูลยอดใช้งาน และไม่ได้ล็อกอิน
  __setUsageSummaryForTests(null);
  __setPlanForTests({ status: 'anonymous' });
  __setFavoritesForTests(null);
});

it('restores query/category from URL and clears with focus recovery', async () => {
  window.history.replaceState(null, '', '/tools?q=เงินเดือน&category=finance');
  const user = userEvent.setup();
  render(<ToolSearch {...props} />);
  const search = screen.getByRole('searchbox');
  expect(search).toHaveValue('เงินเดือน');
  expect(screen.getByRole('button', { name: 'การเงิน' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('link', { name: /เปิดคำนวณเงินเดือนสุทธิ/ })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'ล้างคำค้น' }));
  expect(search).toHaveValue('');
  expect(search).toHaveFocus();
  expect(window.location.search).toBe('?category=finance');
});

it('matches categories, keywords and vertical destinations', async () => {
  const user = userEvent.setup();
  render(<ToolSearch {...props} mode="command" />);
  await user.type(screen.getByRole('searchbox'), 'ทำนายฝัน');
  expect(screen.getByRole('link', { name: 'ทำนายฝัน' })).toHaveAttribute('href', '/dream');
  await user.click(screen.getByRole('button', { name: 'ล้างคำค้น' }));
  await user.type(screen.getByRole('searchbox'), 'ภงด.91');
  expect(screen.getByRole('link', { name: /คำนวณภาษีเงินได้/ })).toHaveAttribute('href', '/tools/thai-income-tax');
});

it('supports ArrowDown into results and Escape back to search', async () => {
  const user = userEvent.setup();
  render(<ToolSearch {...props} mode="command" />);
  const input = screen.getByRole('searchbox');
  await user.type(input, 'QR');
  await user.keyboard('{ArrowDown}');
  expect(document.activeElement?.tagName).toBe('A');
  await user.keyboard('{Escape}');
  expect(input).toHaveFocus();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(input).not.toHaveAttribute('aria-controls');
});

it('shows actionable empty state and restores all results', async () => {
  const user = userEvent.setup();
  render(<ToolSearch {...props} />);
  await user.type(screen.getByRole('searchbox'), 'zzzzzzzzzzzz');
  expect(screen.getByRole('heading', { name: 'ไม่พบเครื่องมือที่ตรงกับคำค้น' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'ล้างตัวกรอง' }));
  expect(screen.getAllByRole('link', { name: /^เปิด/ })).toHaveLength(props.tools.length);
});

it('updates category history and restores on popstate', async () => {
  const user = userEvent.setup();
  render(<ToolSearch {...props} />);
  await user.click(screen.getByRole('button', { name: 'QR / PromptPay' }));
  expect(window.location.search).toBe('?category=qr');
  expect(screen.getAllByRole('link', { name: /^เปิด/ })).toHaveLength(3);
  window.history.replaceState(null, '', '/tools?category=land');
  fireEvent.popState(window);
  expect(screen.getByRole('button', { name: 'ที่ดิน' })).toHaveAttribute('aria-pressed', 'true');
});

it('does not submit or persist an incomplete IME composition', () => {
  render(<ToolSearch {...props} mode="command" />);
  const input = screen.getByRole('searchbox');
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: 'ภาษี' } });
  expect(fireEvent.submit(screen.getByRole('search'))).toBe(false);
  fireEvent.compositionEnd(input, { data: 'ภาษี' });
  expect(within(screen.getByRole('search')).getByRole('searchbox')).toHaveValue('ภาษี');
});

it('restores an explicit all-category selection on a category route', () => {
  window.history.replaceState(null, '', '/categories/finance?category=all');
  render(<ToolSearch {...props} initialCategory="finance" />);
  expect(screen.getByRole('button', { name: /^ทั้งหมด/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getAllByRole('link', { name: /^เปิด/ })).toHaveLength(props.tools.length);
});

describe('ยอดนิยมและรายการโปรด', () => {
  const slugs = props.tools.map((t) => t.slug);
  /** เครื่องมือตัวท้าย ๆ ของ registry ได้ยอดสูงสุด — เรียงแล้วต้องขึ้นมาก่อน */
  function busySummary(): UsageSummary {
    const tools: UsageSummary['tools'] = {};
    slugs.slice(-POPULAR_SORT_MIN_TOOLS).forEach((slug, i) => {
      tools[slug] = { total: USE_DISPLAY_THRESHOLD + i, recent: 10 + i };
    });
    return { generatedAt: 'x', tools };
  }
  const cardOrder = () => screen.getAllByRole('link', { name: /^เปิด/ }).map((a) => a.getAttribute('href'));

  it('ข้อมูลยังน้อย → ไม่มีตัวเลือกเรียงและไม่มีตัวเลขบนการ์ด แม้ URL ขอ ?sort=popular', () => {
    window.history.replaceState(null, '', '/tools?sort=popular');
    render(<ToolSearch {...props} />);
    expect(screen.queryByRole('radio', { name: 'ยอดนิยม' })).not.toBeInTheDocument();
    expect(cardOrder()[0]).toBe(`/tools/${slugs[0]}`);
    expect(screen.queryByText(/ใช้ไปแล้ว/)).not.toBeInTheDocument();
  });

  it('ข้อมูลพอ → เรียงยอดนิยมได้ จำใน URL และ restore ได้', async () => {
    __setUsageSummaryForTests(busySummary());
    const user = userEvent.setup();
    const { unmount } = render(<ToolSearch {...props} />);
    expect(cardOrder()[0]).toBe(`/tools/${slugs[0]}`);
    expect(
      screen.getByText(`ใช้ไปแล้ว ${USE_DISPLAY_THRESHOLD + POPULAR_SORT_MIN_TOOLS - 1} ครั้ง`),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'ยอดนิยม' }));
    expect(window.location.search).toBe('?sort=popular');
    expect(cardOrder()[0]).toBe(`/tools/${slugs.at(-1)}`);
    unmount();
    render(<ToolSearch {...props} />);
    expect(screen.getByRole('radio', { name: 'ยอดนิยม' })).toBeChecked();
    expect(cardOrder()[0]).toBe(`/tools/${slugs.at(-1)}`);
  });

  it('ล็อกอินและมีรายการโปรด → มีตัวกรองรายการโปรด และการ์ดมีดาว', async () => {
    __setPlanForTests({ status: 'signedIn', user: { displayName: 'ก', email: 'e', avatarUrl: null } });
    __setFavoritesForTests({ status: 'ready', slugs: ['baht-text', 'age-days'] });
    const user = userEvent.setup();
    render(<ToolSearch {...props} />);
    await user.click(screen.getByRole('button', { name: /รายการโปรด/ }));
    expect(window.location.search).toBe('?category=favorites');
    expect(cardOrder().sort()).toEqual(['/tools/age-days', '/tools/baht-text']);
    expect(screen.getAllByRole('link', { name: /อยู่ในรายการโปรด/ })).toHaveLength(2);
  });

  it('?category=favorites แต่ไม่ได้ล็อกอิน → แสดงทั้งหมดเงียบ ๆ', () => {
    window.history.replaceState(null, '', '/tools?category=favorites');
    render(<ToolSearch {...props} />);
    expect(screen.queryByRole('button', { name: /รายการโปรด/ })).not.toBeInTheDocument();
    expect(cardOrder()).toHaveLength(slugs.length);
  });

  it('โหมด command (หน้าแรก) ไม่ถามยอดใช้งานหรือรายการโปรด', () => {
    __setUsageSummaryForTests(null, false);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<ToolSearch {...props} mode="command" />);
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
