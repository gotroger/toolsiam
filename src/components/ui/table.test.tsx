// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from './table';

interface Row {
  period: number;
  payment: string;
}
const rows: Row[] = [
  { period: 1, payment: '11,355.78' },
  { period: 2, payment: '11,355.78' },
];

function Harness() {
  return (
    <DataTable
      caption="ตารางผ่อนชำระรายงวด"
      rows={rows}
      rowKey={(r) => String(r.period)}
      columns={[
        { key: 'period', header: 'งวด', render: (r) => r.period },
        { key: 'payment', header: 'ค่างวด', align: 'right', render: (r) => r.payment },
      ]}
    />
  );
}

describe('DataTable', () => {
  it('เข้าถึงพื้นที่เลื่อนตารางด้วยปุ่ม Tab ได้', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    expect(screen.getByRole('region', { name: 'ตารางผ่อนชำระรายงวด' })).toHaveFocus();
  });
  it('มี caption ให้ screen reader รู้ว่าตารางนี้คืออะไร (ซ่อนจากสายตา)', () => {
    render(<Harness />);
    expect(screen.getByRole('table')).toHaveAccessibleName('ตารางผ่อนชำระรายงวด');
    expect(screen.getByText('ตารางผ่อนชำระรายงวด')).toHaveClass('sr-only');
  });

  it('หัวตารางเป็น th scope="col" ไม่ใช่ td ตัวหนา', () => {
    render(<Harness />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(2);
    headers.forEach((h) => expect(h).toHaveAttribute('scope', 'col'));
  });

  it('คอลัมน์ตัวเลขชิดขวาและใช้ tabular-nums ให้หลักตรงกันทุกแถว', () => {
    render(<Harness />);
    const cell = screen.getAllByRole('cell').find((c) => c.textContent === '11,355.78')!;
    expect(cell).toHaveClass('text-right', 'tabular-nums');
  });

  it('เลื่อนแนวนอนในกล่องตัวเอง ไม่ทำให้ทั้งหน้าเลื่อน', () => {
    render(<Harness />);
    const wrapper = screen.getByRole('table').parentElement!;
    expect(wrapper).toHaveClass('overflow-x-auto');
    // ต้องมีความกว้างขั้นต่ำ ไม่งั้นตารางจะบีบจนอ่านไม่ออกแทนที่จะเลื่อน
    expect(screen.getByRole('table').className).toMatch(/min-w-/);
  });

  it('render ครบทุกแถว', () => {
    render(<Harness />);
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1); // +1 = แถวหัวตาราง
  });
});
