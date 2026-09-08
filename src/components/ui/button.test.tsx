// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, CopyButton } from './button';
import { COPY_FAILED_MESSAGE } from '@/lib/clipboard';

describe('Button', () => {
  it('เป็น type="button" โดยปริยาย — กดในฟอร์มแล้วต้องไม่ submit หน้าทิ้ง', () => {
    render(<Button>บันทึก</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('กดไม่ได้ตอน disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button disabled onClick={onClick}>บันทึก</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('CopyButton', () => {
  /**
   * navigator.clipboard เป็น getter อย่างเดียวใน jsdom กำหนดทับตรง ๆ ไม่ได้
   * และ userEvent.setup() ก็ติดตั้ง stub ของตัวเองทับอีกที — ต้องเรียกฟังก์ชันนี้
   * "หลัง" setup() เสมอ ไม่งั้นจะได้ stub ของ user-event ที่สำเร็จเสมอแทน
   */
  function mockClipboard(impl: () => Promise<void>) {
    const writeText = vi.fn(impl);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    return writeText;
  }

  it('คัดลอกแล้วบอกผลทั้งบนจอและผ่าน aria-live สำหรับ screen reader', async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard(() => Promise.resolve());
    render(<CopyButton text="0812345678" />);

    await user.click(screen.getByRole('button', { name: 'คัดลอก' }));
    expect(writeText).toHaveBeenCalledWith('0812345678');
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('คัดลอกแล้ว'));
    expect(screen.getByText('คัดลอกแล้ว', { selector: '.sr-only' })).toBeInTheDocument();
  });

  it('คัดลอกไม่สำเร็จต้องบอกให้คัดลอกเอง ไม่ใช่เงียบ', async () => {
    const user = userEvent.setup();
    mockClipboard(() => Promise.reject(new Error('denied')));
    render(<CopyButton text="0812345678" />);

    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(COPY_FAILED_MESSAGE));
  });

  it('กดไม่ได้เมื่อยังไม่มีอะไรให้คัดลอก', () => {
    render(<CopyButton text="" />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
