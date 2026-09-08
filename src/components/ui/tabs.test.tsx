// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TabPanel, Tabs } from './tabs';

const TABS = [
  { id: 'unit', label: 'จากหน่วยไฟ' },
  { id: 'appliance', label: 'จากเครื่องใช้ไฟฟ้า' },
  { id: 'bill', label: 'จากใบแจ้งหนี้' },
];

function Harness() {
  const [value, setValue] = useState('unit');
  return (
    <>
      <Tabs tabs={TABS} value={value} onChange={setValue} label="วิธีคำนวณ" idPrefix="t" />
      {TABS.map((t) => (
        <TabPanel key={t.id} id={t.id} idPrefix="t" active={value === t.id}>
          เนื้อหาของ {t.label}
        </TabPanel>
      ))}
    </>
  );
}

describe('Tabs (WAI-ARIA)', () => {
  it('ผูก tab กับ panel ด้วย aria-controls / aria-labelledby ที่ชี้ถึงกันจริง', () => {
    render(<Harness />);
    const tab = screen.getByRole('tab', { name: 'จากหน่วยไฟ' });
    const panel = screen.getByRole('tabpanel');
    expect(tab).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', tab.id);
  });

  it('ใช้ roving tabindex — มีแท็บเดียวเท่านั้นที่ Tab เข้าถึงได้', () => {
    render(<Harness />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.filter((t) => t.getAttribute('tabindex') === '0')).toHaveLength(1);
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
  });

  it('ลูกศรขวา/ซ้ายเลื่อนแท็บและย้ายโฟกัสตามไปด้วย', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole('tab', { name: 'จากหน่วยไฟ' }).focus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'จากเครื่องใช้ไฟฟ้า' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'จากเครื่องใช้ไฟฟ้า' })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'จากหน่วยไฟ' })).toHaveFocus();
  });

  it('ลูกศรวนรอบจากตัวแรกไปตัวสุดท้าย', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole('tab', { name: 'จากหน่วยไฟ' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'จากใบแจ้งหนี้' })).toHaveFocus();
  });

  it('Home / End ไปแท็บแรกและแท็บสุดท้าย', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole('tab', { name: 'จากหน่วยไฟ' }).focus();

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'จากใบแจ้งหนี้' })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'จากหน่วยไฟ' })).toHaveFocus();
  });

  it('แสดง panel ของแท็บที่เลือกเท่านั้น', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('จากหน่วยไฟ');

    await user.click(screen.getByRole('tab', { name: 'จากใบแจ้งหนี้' }));
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('จากใบแจ้งหนี้');
  });

  it('tablist มีชื่อกำกับ ไม่ปล่อยให้ screen reader อ่านว่า "tab list" เฉย ๆ', () => {
    render(<Harness />);
    expect(screen.getByRole('tablist')).toHaveAccessibleName('วิธีคำนวณ');
  });
});
