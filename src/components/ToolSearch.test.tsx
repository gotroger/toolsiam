// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToolSearch from './ToolSearch';
import { getActiveCategories, getVisibleTools } from '@/tools/registry';
import { toDiscoveryTool } from './tool-presentation';

const props = { tools: getVisibleTools().map(toDiscoveryTool), categories: getActiveCategories() };
beforeEach(() => window.history.replaceState(null, '', '/tools'));

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
