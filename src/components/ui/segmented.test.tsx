// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './segmented';

const formats = [
  { value: 'image/jpeg', label: 'JPG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/webp', label: 'WebP' },
];

describe('SegmentedControl', () => {
  it('ประกาศเป็นกลุ่มตัวเลือกเดียวพร้อมชื่อกลุ่ม และติ๊กเฉพาะตัวที่เลือก', () => {
    render(
      <SegmentedControl
        name="format"
        legend="ชนิดไฟล์ผลลัพธ์"
        value="image/png"
        options={formats}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('group', { name: 'ชนิดไฟล์ผลลัพธ์' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(radios.every((radio) => radio.getAttribute('name') === 'format')).toBe(true);
    expect(radios.filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(1);
    expect(screen.getByRole('radio', { name: 'PNG' })).toBeChecked();
  });

  it('ส่งค่าที่เลือกออกไปเมื่อกดตัวเลือกอื่น', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        name="format"
        legend="ชนิดไฟล์ผลลัพธ์"
        value="image/jpeg"
        options={formats}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'WebP' }));
    expect(onChange).toHaveBeenCalledWith('image/webp');
  });

  it('ไม่ส่งค่าซ้ำเมื่อกดตัวที่เลือกอยู่แล้ว', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        name="format"
        legend="ชนิดไฟล์ผลลัพธ์"
        value="image/jpeg"
        options={formats}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'JPG' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ปิดทุกตัวเลือกเมื่อ disabled', () => {
    render(
      <SegmentedControl
        name="format"
        legend="ชนิดไฟล์ผลลัพธ์"
        value="image/jpeg"
        options={formats}
        disabled
        onChange={vi.fn()}
      />,
    );
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
  });

  it('แสดงคำอธิบายใต้กลุ่มและผูกเข้ากับกลุ่มด้วย aria-describedby', () => {
    render(
      <SegmentedControl
        name="format"
        legend="ชนิดไฟล์ผลลัพธ์"
        hint="JPG เล็กที่สุด WebP เก็บความโปร่งใส"
        value="image/jpeg"
        options={formats}
        onChange={vi.fn()}
      />,
    );
    const group = screen.getByRole('group', { name: 'ชนิดไฟล์ผลลัพธ์' });
    expect(group.getAttribute('aria-describedby')).toBe('format-hint');
    expect(screen.getByText('JPG เล็กที่สุด WebP เก็บความโปร่งใส')).toHaveAttribute('id', 'format-hint');
  });

  it('ปล่อยคลาสพื้นหลังชุดเดียว และแยกตัวที่เลือกด้วยพื้นหลัง ไม่ใช่แค่น้ำหนักตัวอักษร', () => {
    // บทเรียนเดิม: เรียงคลาสใน className ไม่ได้ตัดสินว่าสีไหนชนะ ลำดับใน stylesheet ต่างหาก
    render(
      <SegmentedControl
        name="format"
        legend="ชนิดไฟล์ผลลัพธ์"
        value="image/png"
        options={formats}
        onChange={vi.fn()}
      />,
    );
    const backgroundOf = (radio: HTMLElement) => {
      const painted = radio.nextElementSibling as HTMLElement;
      const found = painted.className.split(/\s+/).filter((name) => /^bg-/.test(name));
      expect(found).toHaveLength(1);
      return found[0];
    };
    const [jpg, png] = screen.getAllByRole('radio');
    expect(backgroundOf(png)).not.toBe(backgroundOf(jpg));
    // ธีมมืดกลับค่าของ surface กับ slate-100 จนเม็ดที่เลือกจมหายไป จึงต้องเป็นสี action
    expect(backgroundOf(png)).toBe('bg-action');
  });
});
