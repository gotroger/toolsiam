// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FileTool from './FileTool';
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
