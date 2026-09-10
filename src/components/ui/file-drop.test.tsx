// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileDrop, SelectedFiles } from './file-drop';

const pdf = (name = 'a.pdf') => new File(['pdf'], name, { type: 'application/pdf' });
const png = (name = 'a.png') => new File(['png'], name, { type: 'image/png' });

/** สร้าง event ลากวางพร้อม dataTransfer เพราะ jsdom ไม่ได้ใส่มาให้เอง */
function drop(zone: HTMLElement, files: File[]) {
  fireEvent.drop(zone, { dataTransfer: { files, types: ['Files'] } });
}
function dragEnter(zone: HTMLElement) {
  fireEvent.dragEnter(zone, { dataTransfer: { files: [], types: ['Files'] } });
}

beforeEach(() => {
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:thumb'), revokeObjectURL: vi.fn() }));
});
afterEach(() => vi.unstubAllGlobals());

describe('FileDrop', () => {
  it('ส่งไฟล์ออกทั้งทางช่องเลือกไฟล์และทางการลากวาง', () => {
    const onFiles = vi.fn();
    render(<FileDrop id="f" label="เลือกไฟล์" accept=".pdf" onFiles={onFiles} />);

    fireEvent.change(screen.getByLabelText('เลือกไฟล์'), { target: { files: [pdf()] } });
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(Array.from(onFiles.mock.calls[0][0] as FileList)[0].name).toBe('a.pdf');

    drop(screen.getByTestId('file-drop-zone'), [pdf('b.pdf')]);
    expect(onFiles).toHaveBeenCalledTimes(2);
    expect(Array.from(onFiles.mock.calls[1][0] as FileList)[0].name).toBe('b.pdf');
  });

  it('คงช่องเลือกไฟล์ให้คีย์บอร์ดโฟกัสได้ ไม่ซ่อนด้วย display:none', () => {
    render(<FileDrop id="f" label="เลือกไฟล์" accept=".pdf" onFiles={vi.fn()} />);
    const input = screen.getByLabelText('เลือกไฟล์');
    input.focus();
    expect(input).toHaveFocus();
  });

  it('ผูก hint เข้ากับช่องด้วย aria-describedby และประกาศสถานะผิดพลาด', () => {
    const { rerender } = render(
      <FileDrop id="f" label="เลือกไฟล์" accept=".pdf" hint="PDF · ไม่เกิน 15 MB" onFiles={vi.fn()} />,
    );
    const input = screen.getByLabelText('เลือกไฟล์');
    expect(input.getAttribute('aria-describedby')).toContain('f-hint');
    expect(screen.getByText('PDF · ไม่เกิน 15 MB')).toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-invalid');

    rerender(<FileDrop id="f" label="เลือกไฟล์" accept=".pdf" hint="PDF · ไม่เกิน 15 MB" invalid onFiles={vi.fn()} />);
    expect(screen.getByLabelText('เลือกไฟล์')).toHaveAttribute('aria-invalid', 'true');
  });

  it('เน้นกรอบขณะลากไฟล์เข้ามา และคืนสภาพเมื่อลากออกหรือวางเสร็จ', () => {
    render(<FileDrop id="f" label="เลือกไฟล์" accept=".pdf" onFiles={vi.fn()} />);
    const zone = screen.getByTestId('file-drop-zone');
    expect(zone).toHaveAttribute('data-dragging', 'false');

    dragEnter(zone);
    expect(zone).toHaveAttribute('data-dragging', 'true');

    fireEvent.dragLeave(zone);
    expect(zone).toHaveAttribute('data-dragging', 'false');

    dragEnter(zone);
    drop(zone, [pdf()]);
    expect(zone).toHaveAttribute('data-dragging', 'false');
  });

  it('ไม่หลุดสถานะลากเมื่อเมาส์ผ่าน element ลูกภายในกรอบ', () => {
    render(<FileDrop id="f" label="เลือกไฟล์" accept=".pdf" onFiles={vi.fn()} />);
    const zone = screen.getByTestId('file-drop-zone');
    dragEnter(zone); // เข้ากรอบ
    dragEnter(zone); // เข้า element ลูก
    fireEvent.dragLeave(zone); // ออกจาก element ลูก แต่ยังอยู่ในกรอบ
    expect(zone).toHaveAttribute('data-dragging', 'true');
  });

  it('ปิดรับไฟล์ทั้งการวางและการเน้นกรอบเมื่อ disabled', () => {
    const onFiles = vi.fn();
    render(<FileDrop id="f" label="เลือกไฟล์" accept=".pdf" disabled onFiles={onFiles} />);
    const zone = screen.getByTestId('file-drop-zone');

    dragEnter(zone);
    expect(zone).toHaveAttribute('data-dragging', 'false');
    drop(zone, [pdf()]);
    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByLabelText('เลือกไฟล์')).toBeDisabled();
  });

  it('ปล่อยคลาสสีขอบออกมาชุดเดียวในทุกสถานะ', () => {
    // เรียงคลาสใน className ไม่ได้ตัดสินว่าสีไหนชนะ — ลำดับใน stylesheet ที่ Tailwind สร้างต่างหาก
    // ถ้าปล่อย border-slate-300 กับ border-red-400 ออกมาพร้อมกัน สถานะผิดพลาดจะไม่ขึ้นสีแดง
    const borderClasses = () =>
      (screen.getByTestId('file-drop-zone').querySelector('div')?.className ?? '')
        .split(/\s+/)
        .filter((name) => /^border-(?!2$|dashed$)/.test(name));

    for (const props of [{}, { invalid: true }, { disabled: true }, { disabled: true, invalid: true }]) {
      const view = render(<FileDrop id="f" label="เลือกไฟล์" accept=".pdf" onFiles={vi.fn()} {...props} />);
      expect(borderClasses()).toHaveLength(1);
      view.unmount();
    }

    render(<FileDrop id="f" label="เลือกไฟล์" accept=".pdf" invalid onFiles={vi.fn()} />);
    expect(borderClasses()).toEqual(['border-red-400']);
  });

  it('ไม่เรียก onFiles เมื่อวางสิ่งที่ไม่ใช่ไฟล์ เช่น ข้อความที่ลากมา', () => {
    const onFiles = vi.fn();
    render(<FileDrop id="f" label="เลือกไฟล์" accept=".pdf" onFiles={onFiles} />);
    drop(screen.getByTestId('file-drop-zone'), []);
    expect(onFiles).not.toHaveBeenCalled();
  });
});

describe('SelectedFiles', () => {
  it('แสดงรูปตัวอย่างของไฟล์รูป และไอคอนนามสกุลของไฟล์อื่น', () => {
    render(<SelectedFiles files={[png('รูป.png'), pdf('เอกสาร.pdf')]} onRemove={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'ตัวอย่าง รูป.png' })).toHaveAttribute('src', 'blob:thumb');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('คืนหน่วยความจำของรูปตัวอย่างเมื่อไฟล์ถูกนำออกและเมื่อถอด component', () => {
    const image = png();
    const { rerender, unmount } = render(<SelectedFiles files={[image]} onRemove={vi.fn()} />);
    rerender(<SelectedFiles files={[]} onRemove={vi.fn()} />);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:thumb');

    vi.mocked(URL.revokeObjectURL).mockClear();
    rerender(<SelectedFiles files={[image]} onRemove={vi.fn()} />);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:thumb');
  });

  it('ไม่สร้างรูปตัวอย่างซ้ำเมื่อ render ใหม่ด้วยไฟล์เดิม', () => {
    const image = png();
    const { rerender } = render(<SelectedFiles files={[image]} onRemove={vi.fn()} />);
    rerender(<SelectedFiles files={[image]} onRemove={vi.fn()} />);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('แสดงปุ่มจัดลำดับเฉพาะเมื่อส่ง onMove และปิดปุ่มที่หัวและท้ายรายการ', () => {
    const onMove = vi.fn();
    const files = [pdf('a.pdf'), pdf('b.pdf')];
    const { rerender } = render(<SelectedFiles files={files} onRemove={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /เลื่อน/ })).not.toBeInTheDocument();

    rerender(<SelectedFiles files={files} onRemove={vi.fn()} onMove={onMove} />);
    expect(screen.getByRole('button', { name: 'เลื่อน a.pdf ขึ้น' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'เลื่อน b.pdf ลง' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'เลื่อน a.pdf ลง' }));
    expect(onMove).toHaveBeenCalledWith(0, 1);
  });

  it('นำไฟล์ที่ระบุออกจากรายการ', () => {
    const onRemove = vi.fn();
    render(<SelectedFiles files={[pdf('a.pdf'), pdf('b.pdf')]} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: 'นำ b.pdf ออกจากรายการ' }));
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('ไม่แสดงอะไรเลยเมื่อยังไม่มีไฟล์', () => {
    const { container } = render(<SelectedFiles files={[]} onRemove={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
