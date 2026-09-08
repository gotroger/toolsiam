// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Checkbox, ErrorText, Field, NumberInput, describedBy } from './form';

describe('describedBy', () => {
  it('คืน undefined เมื่อไม่มีทั้ง hint และ error — จะได้ไม่ตั้ง aria-describedby ที่ชี้ไปยัง id ที่ไม่มีอยู่', () => {
    expect(describedBy('x', {})).toBeUndefined();
  });

  it('ต่อ id ของ hint และ error ตามที่มีจริงเท่านั้น', () => {
    expect(describedBy('x', { hint: 'ก' })).toBe('x-hint');
    expect(describedBy('x', { error: 'ข' })).toBe('x-error');
    expect(describedBy('x', { hint: 'ก', error: 'ข' })).toBe('x-hint x-error');
  });
});

describe('NumberInput', () => {
  function Harness(props: { hint?: string; error?: string }) {
    const [v, setV] = useState('');
    return <NumberInput id="amount" label="จำนวนเงิน" mode="decimal" value={v} onValueChange={setV} {...props} />;
  }

  it('เป็น type="text" พร้อม inputMode — ไม่ใช่ type="number" ที่เลื่อนจอแล้วค่าเปลี่ยนบนมือถือ', () => {
    render(<Harness />);
    const input = screen.getByLabelText('จำนวนเงิน');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('inputmode', 'decimal');
  });

  it('ผูก hint และ error เข้า aria-describedby ให้เอง และตั้ง aria-invalid เมื่อมี error', () => {
    render(<Harness hint="กรอกเป็นบาท" error="ต้องเป็นตัวเลข" />);
    const input = screen.getByLabelText('จำนวนเงิน');
    expect(input).toHaveAttribute('aria-describedby', 'amount-hint amount-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    // id ที่อ้างถึงต้องมีอยู่จริงในหน้า ไม่อย่างนั้น screen reader อ่านไม่เจอ
    expect(document.getElementById('amount-hint')).toHaveTextContent('กรอกเป็นบาท');
    expect(document.getElementById('amount-error')).toHaveTextContent('ต้องเป็นตัวเลข');
  });

  it('ไม่ตั้ง aria-invalid เมื่อยังไม่มี error', () => {
    render(<Harness />);
    expect(screen.getByLabelText('จำนวนเงิน')).not.toHaveAttribute('aria-invalid');
  });

  it('ส่งค่าที่พิมพ์ออกมาดิบ ๆ ไม่ตัดคอมมาทิ้งเหมือน type="number"', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText('จำนวนเงิน');
    await user.type(input, '1,250.50');
    expect(input).toHaveValue('1,250.50');
  });
});

describe('ErrorText', () => {
  it('มีคำว่า "ข้อผิดพลาด" กำกับเสมอ — ไม่สื่อด้วยสีแดงอย่างเดียว (A6)', () => {
    render(<ErrorText>กรอกไม่ครบ</ErrorText>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('ข้อผิดพลาด:');
    expect(alert).toHaveTextContent('กรอกไม่ครบ');
  });
});

describe('Field', () => {
  it('ผูก label เข้ากับ input ผ่าน htmlFor', async () => {
    const user = userEvent.setup();
    render(
      <Field label="ชื่อร้าน" htmlFor="shop">
        <input id="shop" />
      </Field>,
    );
    await user.click(screen.getByText('ชื่อร้าน'));
    expect(screen.getByLabelText('ชื่อร้าน')).toHaveFocus();
  });
});

describe('Checkbox', () => {
  function Harness() {
    const [on, setOn] = useState(false);
    return <Checkbox label="ส่งประกันสังคม" checked={on} onChange={(e) => setOn(e.target.checked)} />;
  }

  it('กดที่ข้อความก็ติ๊กได้ เพราะ input ถูกห่อไว้ใน label', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByRole('checkbox', { name: 'ส่งประกันสังคม' });
    expect(box).not.toBeChecked();
    await user.click(screen.getByText('ส่งประกันสังคม'));
    expect(box).toBeChecked();
  });

  it('ใช้ accent-brand-600 ไม่ใช่ text-brand-600 ที่ไม่มีผลกับ checkbox ดิบ', () => {
    render(<Harness />);
    expect(screen.getByRole('checkbox')).toHaveClass('accent-brand-600');
  });
});
