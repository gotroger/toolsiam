// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { Alert, Disclaimer, EmptyState, ResultBox, Stat } from './feedback';
import { Button } from './button';

describe('Alert', () => {
  it('tone="danger" ประกาศเป็น role="alert" ให้ screen reader อ่านทันที', () => {
    render(<Alert tone="danger" title="เครื่องมือนี้ทำงานผิดพลาด">ลองโหลดหน้าใหม่</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('เครื่องมือนี้ทำงานผิดพลาด');
    expect(alert).toHaveTextContent('ลองโหลดหน้าใหม่');
  });

  it('tone="note" ไม่ขัดจังหวะ — เป็นข้อมูลที่ควรรู้ ไม่ใช่สิ่งที่พังไปแล้ว', () => {
    render(<Alert>อ่านประกอบ</Alert>);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('อ่านประกอบ')).toBeInTheDocument();
  });

  it('สองโทนใช้ไอคอนคนละรูปทรง ไม่ได้ต่างกันแค่สี (A6)', () => {
    const { container: note } = render(<Alert>ก</Alert>);
    const { container: danger } = render(<Alert tone="danger">ข</Alert>);
    const d = (c: HTMLElement) => c.querySelector('svg path')!.getAttribute('d');
    expect(d(note)).not.toBe(d(danger));
  });
});

describe('Disclaimer', () => {
  it('เป็น Alert โทน note — คำเตือนของทั้งเว็บมาจากกล่องเดียวกัน', () => {
    render(<Disclaimer>เพื่อความบันเทิงเท่านั้น</Disclaimer>);
    expect(screen.getByText('เพื่อความบันเทิงเท่านั้น')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('ResultBox', () => {
  it('ประกาศค่าที่เปลี่ยนผ่าน aria-live — ทุกเครื่องมือคำนวณสดขณะพิมพ์ (A5)', () => {
    const { container } = render(<ResultBox label="รับสุทธิ">28,500.00 บาท</ResultBox>);
    const live = container.querySelector('[aria-live="polite"]')!;
    expect(live).toHaveTextContent('รับสุทธิ');
    expect(live).toHaveTextContent('28,500.00 บาท');
  });
});

describe('EmptyState', () => {
  it('ต้องมีทางออกเสมอ ไม่ใช่บอกว่าไม่เจอแล้วปล่อยค้าง', () => {
    render(
      <EmptyState
        title="ไม่พบเครื่องมือ"
        description="ลองคำค้นอื่น"
        action={<Button>ล้างตัวกรอง</Button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'ไม่พบเครื่องมือ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ล้างตัวกรอง' })).toBeInTheDocument();
  });
});

describe('Stat', () => {
  it('แสดงป้ายกำกับคู่กับค่าเสมอ', () => {
    render(<Stat label="อายุงาน" value="3 ปี" />);
    expect(screen.getByText('อายุงาน')).toBeInTheDocument();
    expect(screen.getByText('3 ปี')).toBeInTheDocument();
  });
});
