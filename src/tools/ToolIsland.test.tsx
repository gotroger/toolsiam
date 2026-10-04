// @vitest-environment jsdom
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import ToolIsland from './ToolIsland';

const { load, record } = vi.hoisted(() => ({ load: vi.fn(), record: vi.fn() }));
vi.mock('./loaders', () => ({ toolLoaders: { test: load } }));
vi.mock('@/lib/usage-client', () => ({ recordUsage: record }));

function Calculator() {
  const [value, setValue] = useState('0');
  return (
    <>
      <input aria-label="จำนวน" value={value} onChange={(e) => setValue(e.target.value)} />
      <output aria-label="ผลลัพธ์">{Number(value) * 2}</output>
    </>
  );
}

beforeEach(() => {
  load.mockReset();
  record.mockReset();
});

it('server HTML cannot accept input before calculator handlers are ready', () => {
  const html = renderToString(<ToolIsland slug="test" />);
  expect(html).toContain('กำลังโหลดเครื่องมือ');
  expect(html).not.toContain('<input');
  expect(load).not.toHaveBeenCalled();
});

it('a slow module keeps the loading state, then its first input updates the result', async () => {
  let finish!: (value: { default: typeof Calculator }) => void;
  load.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<ToolIsland slug="test" />);
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลดเครื่องมือ');
  await act(async () => finish({ default: Calculator }));
  fireEvent.change(await screen.findByRole('textbox', { name: 'จำนวน' }), { target: { value: '300000' } });
  expect(screen.getByLabelText('ผลลัพธ์')).toHaveTextContent('600000');
});

it('นับ view เมื่อเครื่องมือพร้อม และนับ use ครั้งเดียวเมื่อผู้ใช้ลงมือครั้งแรก', async () => {
  load.mockResolvedValue({ default: Calculator });
  render(<ToolIsland slug="test" />);
  const input = await screen.findByRole('textbox', { name: 'จำนวน' });
  expect(record.mock.calls).toEqual([['test', 'view']]);
  // คลิกพื้นที่ว่าง (ไม่ใช่ตัวควบคุม) ไม่นับ
  fireEvent.click(screen.getByLabelText('ผลลัพธ์'));
  expect(record).toHaveBeenCalledTimes(1);
  fireEvent.change(input, { target: { value: '5' } });
  fireEvent.change(input, { target: { value: '6' } });
  fireEvent.click(input);
  expect(record.mock.calls).toEqual([
    ['test', 'view'],
    ['test', 'use'],
  ]);
});

it('server HTML ไม่ยิงตัวนับ', () => {
  renderToString(<ToolIsland slug="test" />);
  expect(record).not.toHaveBeenCalled();
});
