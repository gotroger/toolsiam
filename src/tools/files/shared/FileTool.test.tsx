// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FileTool from './FileTool';
import { __setPlanForTests } from '@/lib/plan-client';
import { PLAN_LIMITS, mb } from '@/lib/plan-limits';
const workers: FakeWorker[] = [];
const latest = () => workers[workers.length - 1];
class FakeWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    workers.push(this);
  }
}
beforeEach(() => {
  // ค่าเริ่มต้นของเทสต์ = ผู้ใช้ไม่ล็อกอิน (ไม่มี hint cookie → ไม่ยิง /api/me)
  __setPlanForTests({ status: 'anonymous' });
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
    callback();
    return 1;
  });
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:result'), revokeObjectURL: vi.fn() }));
});
afterEach(() => vi.unstubAllGlobals());
const file = (name = 'a.pdf') => new File(['pdf'], name, { type: 'application/pdf' });
function upload(files: File[]) {
  fireEvent.change(screen.getByLabelText(/เลือกไฟล์/), { target: { files } });
}
describe('file tool lifecycle', () => {
  it('preserves valid files, supports ordering and removal, and refuses empty submission', () => {
    render(<FileTool id="pdf-merge" />);
    fireEvent.click(screen.getByRole('button', { name: 'รวม PDF' }));
    expect(screen.getByRole('alert')).toHaveTextContent('อย่างน้อย 2');
    upload([file(), file('b.pdf'), file('wrong.exe')]);
    expect(screen.getByRole('alert')).toHaveTextContent('ชนิดไฟล์ไม่รองรับ');
    fireEvent.click(screen.getByRole('button', { name: 'เลื่อน b.pdf ขึ้น' }));
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('b.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'นำ b.pdf ออกจากรายการ' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });
  it('cancels worker, ignores late results and can retry', async () => {
    render(<FileTool id="pdf-rotate" />);
    upload([file()]);
    fireEvent.click(screen.getByRole('button', { name: 'หมุน PDF' }));
    expect(screen.getByRole('button', { name: 'หมุน PDF' })).toBeDisabled();
    const old = latest();
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }));
    old.onmessage?.({ data: { output: { blob: new Blob(['pdf']), name: 'old.pdf', summary: 'old' } } });
    await waitFor(() => expect(screen.queryByRole('link', { name: /ดาวน์โหลด/ })).not.toBeInTheDocument());
    expect(old.terminate).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'หมุน PDF' }));
    latest().onmessage?.({ data: { output: { blob: new Blob(['pdf']), name: 'new.pdf', summary: 'new' } } });
    expect(await screen.findByRole('link', { name: 'ดาวน์โหลด new.pdf' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('มุมหมุนตามเข็มนาฬิกา'), { target: { value: '180' } });
    expect(screen.queryByRole('link', { name: /ดาวน์โหลด/ })).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:result');
  });
  it('shows conversion errors, preserves file and terminates on unmount', async () => {
    const { unmount } = render(<FileTool id="pdf-rotate" />);
    upload([file()]);
    fireEvent.click(screen.getByRole('button', { name: 'หมุน PDF' }));
    latest().onmessage?.({ data: { error: 'ไฟล์เสียหาย' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('ไฟล์เสียหาย');
    expect(screen.getByRole('listitem')).toHaveTextContent('a.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'หมุน PDF' }));
    unmount();
    expect(latest().terminate).toHaveBeenCalled();
  });
});

/** ไฟล์ขนาดตามต้องการโดยไม่ต้องจองหน่วยความจำจริง — FileTool อ่านแค่ .size */
function sized(name: string, bytes: number) {
  const file = new File(['x'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
}
const { free, premium } = PLAN_LIMITS;

describe('ขีดจำกัดตามแพลนและข้อเสนอพรีเมียม', () => {
  it('ไม่ล็อกอิน: ไฟล์เกินฟรีแต่พรีเมียมรับไหว → ข้อเสนอพร้อมลิงก์เข้าสู่ระบบ ไม่ใช่ข้อความผิดพลาด', () => {
    render(<FileTool id="pdf-merge" />);
    expect(screen.getByText(/ไฟล์ละไม่เกิน 15 MB/)).toBeInTheDocument();
    upload([sized('big.pdf', mb(free.perFileMb.pdf) + 1)]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('big.pdf: เกินขีดจำกัดแบบฟรี')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'เข้าสู่ระบบด้วย Google' })).toHaveAttribute(
      'href',
      expect.stringContaining('/api/auth/google/start?next='),
    );
    expect(screen.getByRole('link', { name: 'ดูรายละเอียดพรีเมียม' })).toHaveAttribute('href', '/premium');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('ล็อกอินแบบฟรี: ลิงก์ในข้อเสนอพาไปหน้าบัญชี', () => {
    __setPlanForTests({
      status: 'signedIn',
      plan: 'free',
      user: { displayName: 'A', email: 'a@b.c', avatarUrl: null },
    });
    render(<FileTool id="pdf-merge" />);
    upload([sized('big.pdf', mb(free.perFileMb.pdf) + 1)]);
    expect(screen.getByRole('link', { name: 'สมัครพรีเมียม 19 บาท' })).toHaveAttribute('href', '/account');
  });

  it('เกินพรีเมียมด้วย → ข้อความผิดพลาดธรรมดา ไม่มีข้อเสนอ (ทุกแพลน)', () => {
    render(<FileTool id="pdf-merge" />);
    upload([sized('huge.pdf', mb(premium.perFileMb.pdf) + 1)]);
    expect(screen.getByRole('alert')).toHaveTextContent('huge.pdf: ขนาดไม่เกิน 15 MB');
    expect(screen.queryByText(/เกินขีดจำกัดแบบฟรี/)).not.toBeInTheDocument();
  });

  it('พรีเมียม: รับไฟล์ที่เกินฟรี และ hint แสดงตัวเลขของพรีเมียม · เกินพรีเมียมบอกตัวเลขพรีเมียม', () => {
    __setPlanForTests({
      status: 'signedIn',
      plan: 'premium',
      premiumUntil: 9e9,
      user: { displayName: 'A', email: 'a@b.c', avatarUrl: null },
    });
    render(<FileTool id="pdf-merge" />);
    expect(screen.getByText(/พรีเมียม · PDF · ไฟล์ละไม่เกิน 60 MB/)).toBeInTheDocument();
    upload([sized('big.pdf', mb(free.perFileMb.pdf) + 1)]);
    expect(screen.getByRole('listitem')).toHaveTextContent('big.pdf');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    upload([sized('huge.pdf', mb(premium.perFileMb.pdf) + 1)]);
    expect(screen.getByRole('alert')).toHaveTextContent('ขนาดไม่เกิน 60 MB');
  });

  it('ระบบสมาชิกปิด (off) → ขีดจำกัดฟรีแบบไม่มีข้อเสนอ เหมือนเว็บไม่มีระบบสมาชิก', () => {
    __setPlanForTests({ status: 'off' });
    render(<FileTool id="pdf-merge" />);
    upload([sized('big.pdf', mb(free.perFileMb.pdf) + 1)]);
    expect(screen.getByRole('alert')).toHaveTextContent('ขนาดไม่เกิน 15 MB');
    expect(screen.queryByText(/เกินขีดจำกัดแบบฟรี/)).not.toBeInTheDocument();
  });

  it('worker แจ้งชนเพดานหน้าที่พรีเมียมรับไหว → ข้อเสนอ · ส่ง limits ไปกับงานเสมอ', async () => {
    render(<FileTool id="pdf-rotate" />);
    upload([file()]);
    fireEvent.click(screen.getByRole('button', { name: 'หมุน PDF' }));
    expect(latest().postMessage).toHaveBeenCalledWith(expect.objectContaining({ limits: free }));
    latest().onmessage?.({ data: { error: 'รองรับรวมไม่เกิน 150 หน้า', limit: { kind: 'pages', value: 300 } } });
    expect(await screen.findByText('เกินขีดจำกัดแบบฟรี')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // เกินพรีเมียมด้วย → ข้อความจาก worker ตรง ๆ
    fireEvent.click(screen.getByRole('button', { name: 'หมุน PDF' }));
    latest().onmessage?.({
      data: { error: 'รองรับรวมไม่เกิน 150 หน้า', limit: { kind: 'pages', value: premium.pages + 1 } },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('150 หน้า');
  });
});
