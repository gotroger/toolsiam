// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineHooks, OcrEngine, OcrLanguage } from './types';
import ImageToTextTool from './Tool';

type Answer = { text: string; confidence: number };
const engines: FakeEngine[] = [];
class FakeEngine implements OcrEngine {
  calls: OcrLanguage[] = [];
  resolve!: (answer: Answer) => void;
  reject!: (error: Error) => void;
  terminate = vi.fn(() => this.reject?.(new Error('cancelled')));
  constructor(public hooks: EngineHooks) {
    engines.push(this);
  }
  recognize = (_image: Blob | HTMLCanvasElement, language: OcrLanguage) =>
    new Promise<Answer>((resolve, reject) => {
      this.calls.push(language);
      this.resolve = resolve;
      this.reject = reject;
    });
}
vi.mock('./engine', () => ({ createEngine: (hooks: EngineHooks) => new FakeEngine(hooks) }));
// jsdom ไม่มี createImageBitmap — ส่ง Blob เดิมต่อ ยกเว้นไฟล์ชื่อ broken
vi.mock('./image', async (original) => ({
  ...(await original<typeof import('./image')>()),
  prepareImage: vi.fn(async (file: File) => {
    if (file.name.startsWith('broken')) throw new Error('เปิดรูปไม่สำเร็จ ไฟล์อาจเสียหาย');
    return file;
  }),
}));

const latest = () => engines[engines.length - 1]!;
const image = (name = 'slip.jpg') => new File(['xx'], name, { type: 'image/jpeg' });
const upload = (...files: File[]) => fireEvent.change(screen.getByLabelText(/เลือกรูป/), { target: { files } });
const start = () => fireEvent.click(screen.getByRole('button', { name: 'อ่านข้อความจากรูป' }));
const answer = async (text: string, confidence = 92) => {
  await waitFor(() => expect(latest().calls.length).toBeGreaterThan(0));
  const count = latest().calls.length;
  latest().resolve({ text, confidence });
  return count;
};
const box = () => screen.getByLabelText(/ข้อความที่อ่านได้/) as HTMLTextAreaElement;

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
    cb();
    return 1;
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  engines.length = 0;
});

describe('ImageToTextTool', () => {
  it('ปฏิเสธเมื่อไม่มีรูปหรือชนิดไฟล์ผิด โดยไม่สร้าง engine', () => {
    render(<ImageToTextTool />);
    start();
    expect(screen.getByRole('alert')).toHaveTextContent('กรุณาเลือกรูป');
    upload(new File(['x'], 'doc.pdf', { type: 'application/pdf' }));
    expect(screen.getByRole('alert')).toHaveTextContent('doc.pdf');
    expect(engines).toHaveLength(0);
  });

  it('อ่านรูป แสดงข้อความที่จัดช่องว่างแล้ว และสลับกลับเป็นผลดิบได้โดยไม่อ่านใหม่', async () => {
    render(<ImageToTextTool />);
    upload(image());
    start();
    await answer('ยอด เงิน 500 บาท\n');
    await waitFor(() => expect(box().value).toBe('ยอดเงิน 500 บาท'));
    expect(screen.getByText(/ความมั่นใจ 92%/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('อ่านเสร็จ 1 จาก 1 รูป');
    fireEvent.click(screen.getByLabelText(/จัดช่องว่างภาษาไทย/));
    expect(box().value).toBe('ยอด เงิน 500 บาท');
    expect(latest().calls).toHaveLength(1);
  });

  it('ส่งภาษาที่เลือกให้ engine และแก้ข้อความในกล่องได้', async () => {
    render(<ImageToTextTool />);
    upload(image());
    fireEvent.click(screen.getByLabelText('อังกฤษ'));
    start();
    await answer('Helo');
    expect(latest().calls).toEqual(['eng']);
    await waitFor(() => expect(box().value).toBe('Helo'));
    fireEvent.change(box(), { target: { value: 'Hello' } });
    expect(box().value).toBe('Hello');
  });

  it('รูปเสียหนึ่งรูปไม่ทำให้ทั้งชุดล้ม', async () => {
    render(<ImageToTextTool />);
    upload(image('a.jpg'), image('broken.jpg'), image('c.jpg'));
    start();
    await answer('หนึ่ง');
    await waitFor(() => expect(latest().calls).toHaveLength(2));
    latest().resolve({ text: 'สาม', confidence: 40 });
    await waitFor(() => expect(box().value).toBe('--- a.jpg ---\nหนึ่ง\n\n--- c.jpg ---\nสาม'));
    expect(screen.getByText(/broken.jpg — เปิดรูปไม่สำเร็จ/)).toBeInTheDocument();
    expect(screen.getByText('บางรูปอ่านได้ไม่ชัด')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('อ่านเสร็จ 2 จาก 3 รูป');
  });

  it('ยกเลิกกลางชุด เก็บผลของรูปที่เสร็จแล้ว และอ่านใหม่ได้ด้วย engine ตัวใหม่', async () => {
    render(<ImageToTextTool />);
    upload(image('a.jpg'), image('b.jpg'));
    start();
    await answer('หนึ่ง');
    await waitFor(() => expect(latest().calls).toHaveLength(2));
    const first = latest();
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }));
    expect(first.terminate).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('ยกเลิกแล้ว');
    expect(box().value).toContain('หนึ่ง');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    start();
    await waitFor(() => expect(engines).toHaveLength(2));
  });

  it('โหลดตัวอ่านข้อความไม่สำเร็จ → แจ้ง error และหยุดทั้งชุด', async () => {
    render(<ImageToTextTool />);
    upload(image('a.jpg'), image('b.jpg'));
    start();
    await waitFor(() => expect(latest().calls).toHaveLength(1));
    latest().reject(new Error('โหลดตัวอ่านข้อความไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('โหลดตัวอ่านข้อความไม่สำเร็จ'));
    expect(latest().calls).toHaveLength(1);
  });

  it('ไม่พบข้อความในรูปเดียว → แจ้งให้ลองรูปที่ชัดขึ้น', async () => {
    render(<ImageToTextTool />);
    upload(image());
    start();
    await answer('  \n');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('อ่านข้อความไม่ได้เลย'));
  });

  it('ผ่าน axe ทั้งก่อนและหลังมีผลลัพธ์', async () => {
    const { container } = render(<ImageToTextTool />);
    expect((await axe.run(container)).violations).toEqual([]);
    upload(image());
    start();
    await answer('สวัสดี');
    await waitFor(() => expect(box().value).toBe('สวัสดี'));
    expect((await axe.run(container)).violations).toEqual([]);
  });
});
