// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Engine, EngineHooks, EngineJob, EngineOutput } from './types';
import VideoTool from './VideoTool';

const engines: FakeEngine[] = [];
class FakeEngine implements Engine {
  /** hooks ของรอบล่าสุด — engine อยู่ข้ามรอบ แต่ callback ต้องมากับแต่ละ run */
  hooks: EngineHooks | undefined;
  job: EngineJob | null = null;
  resolve!: (o: EngineOutput) => void;
  reject!: (e: Error) => void;
  terminate = vi.fn(() => this.reject?.(new Error('cancelled')));
  constructor() {
    engines.push(this);
  }
  run = (job: EngineJob, hooks: EngineHooks) =>
    new Promise<EngineOutput>((resolve, reject) => {
      this.hooks = hooks;
      this.job = job;
      this.resolve = resolve;
      this.reject = reject;
    });
}
vi.mock('./engine', () => ({ createEngine: () => new FakeEngine() }));
const latest = () => engines[engines.length - 1];
const output = (name: string, mime = 'audio/mpeg'): EngineOutput => ({ bytes: new Uint8Array([1, 2]), name, mime });

beforeEach(() => {
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }));
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
    cb();
    return 1;
  });
  Object.defineProperty(File.prototype, 'arrayBuffer', {
    value: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
    configurable: true,
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  engines.length = 0;
});

const video = (name = 'clip.mp4') => new File(['xx'], name, { type: 'video/mp4' });
const upload = (f: File) => fireEvent.change(screen.getByLabelText(/เลือกไฟล์/), { target: { files: [f] } });

describe('VideoTool', () => {
  it('ปฏิเสธเมื่อไม่มีไฟล์ นามสกุลผิด และเวลาเริ่มไม่น้อยกว่าจบ', () => {
    render(<VideoTool id="video-trim" />);
    fireEvent.click(screen.getByRole('button', { name: 'ตัดคลิป' }));
    expect(screen.getByRole('alert')).toHaveTextContent('กรุณาเลือกไฟล์');
    upload(video('a.avi'));
    expect(screen.getByRole('alert')).toHaveTextContent('ชนิดไฟล์ไม่รองรับ');
    upload(video());
    fireEvent.change(screen.getByLabelText('เวลาเริ่ม'), { target: { value: '0:10' } });
    fireEvent.change(screen.getByLabelText('เวลาจบ'), { target: { value: '0:05' } });
    fireEvent.click(screen.getByRole('button', { name: 'ตัดคลิป' }));
    expect(screen.getByRole('alert')).toHaveTextContent('เวลาเริ่ม');
    expect(engines).toHaveLength(0);
  });

  it('ส่งงานให้ engine แสดง progress และผลลัพธ์', async () => {
    render(<VideoTool id="video-to-mp3" />);
    upload(video('song.mp4'));
    fireEvent.click(screen.getByRole('button', { name: 'แปลงเป็น MP3' }));
    await waitFor(() => expect(latest().job).not.toBeNull());
    expect(latest().job!.args).toContain('libmp3lame');
    expect(latest().job!.input.name).toBe('in.mp4');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'แปลงเป็น MP3' })).toBeDisabled();
    latest().resolve(output('out.mp3'));
    const link = await screen.findByRole('link', { name: 'ดาวน์โหลด song.mp3' });
    expect(link).toHaveAttribute('href', 'blob:x');
    expect(link).toHaveAttribute('download', 'song.mp3');
  });

  it('ใช้ engine ตัวเดิมรอบที่สอง → progress ยังขยับ (ไม่ค้าง 0% จาก callback ของรอบแรก)', async () => {
    render(<VideoTool id="video-trim" />);
    upload(video());
    fireEvent.change(screen.getByLabelText('เวลาจบ'), { target: { value: '0:10' } });
    for (const round of [1, 2]) {
      fireEvent.click(screen.getByRole('button', { name: 'ตัดคลิป' }));
      await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0'));
      expect(engines).toHaveLength(1);
      latest().hooks!.onProgress(5);
      await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50'));
      latest().resolve(output(`r${round}.mp4`, 'video/mp4'));
      await screen.findByRole('link', { name: /ดาวน์โหลด/ });
    }
  });

  it('ยกเลิกแล้วผลลัพธ์เก่าไม่โผล่ และลองใหม่ได้ด้วย engine ตัวใหม่', async () => {
    render(<VideoTool id="video-to-mp3" />);
    upload(video());
    fireEvent.click(screen.getByRole('button', { name: 'แปลงเป็น MP3' }));
    await waitFor(() => expect(latest().job).not.toBeNull());
    const old = latest();
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }));
    expect(old.terminate).toHaveBeenCalled();
    old.resolve(output('old.mp3'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'แปลงเป็น MP3' })).toBeEnabled());
    expect(screen.queryByRole('link', { name: /ดาวน์โหลด/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'แปลงเป็น MP3' }));
    await waitFor(() => expect(engines).toHaveLength(2));
    latest().resolve(output('new.mp3'));
    expect(await screen.findByRole('link', { name: /ดาวน์โหลด/ })).toBeInTheDocument();
  });

  it('แสดง error ภาษาไทยจาก engine เก็บไฟล์ไว้ และ terminate เมื่อ unmount', async () => {
    const { unmount } = render(<VideoTool id="video-compress" />);
    upload(video());
    fireEvent.click(screen.getByRole('button', { name: 'ลดขนาดวิดีโอ' }));
    await waitFor(() => expect(latest().job).not.toBeNull());
    latest().reject(new Error('ไฟล์เสียหาย'));
    expect(await screen.findByRole('alert')).toHaveTextContent('ไฟล์เสียหาย');
    expect(screen.getByRole('listitem')).toHaveTextContent('clip.mp4');
    fireEvent.click(screen.getByRole('button', { name: 'ลดขนาดวิดีโอ' }));
    await waitFor(() => expect(engines).toHaveLength(2));
    unmount();
    expect(latest().terminate).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('GIF เกิน 15 วินาทีถูกปฏิเสธก่อนถึง engine', () => {
    render(<VideoTool id="video-to-gif" />);
    upload(video());
    fireEvent.change(screen.getByLabelText('เวลาเริ่ม'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('ระยะเวลา'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'สร้าง GIF' }));
    expect(screen.getByRole('alert')).toHaveTextContent('15 วินาที');
    expect(engines).toHaveLength(0);
  });

  it('เปลี่ยนค่าหลังได้ผลลัพธ์ → ล้างผลลัพธ์และคืน object URL', async () => {
    render(<VideoTool id="video-to-mp3" />);
    upload(video());
    fireEvent.click(screen.getByRole('button', { name: 'แปลงเป็น MP3' }));
    await waitFor(() => expect(latest().job).not.toBeNull());
    latest().resolve(output('a.mp3'));
    await screen.findByRole('link', { name: /ดาวน์โหลด/ });
    fireEvent.click(screen.getByLabelText('320 kbps'));
    expect(screen.queryByRole('link', { name: /ดาวน์โหลด/ })).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });
});
