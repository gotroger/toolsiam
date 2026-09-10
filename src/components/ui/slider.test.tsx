// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from './slider';

describe('Slider', () => {
  it('ผูก label เข้ากับรางเลื่อน และแสดงค่าปัจจุบันเป็นป้ายตัวเลข', () => {
    render(
      <Slider
        id="quality"
        label="คุณภาพรูป"
        value="60"
        min={10}
        max={100}
        step={5}
        suffix="%"
        onValueChange={vi.fn()}
      />,
    );
    const slider = screen.getByRole('slider', { name: 'คุณภาพรูป' });
    expect(slider).toHaveValue('60');
    expect(slider).toHaveAttribute('aria-valuetext', '60%');
    expect(screen.getByTestId('slider-value')).toHaveTextContent('60%');
  });

  it('ส่งค่าที่ลากออกไปเป็นสตริง', () => {
    const onValueChange = vi.fn();
    render(
      <Slider id="quality" label="คุณภาพรูป" value="60" min={10} max={100} step={5} onValueChange={onValueChange} />,
    );
    fireEvent.change(screen.getByRole('slider'), { target: { value: '85' } });
    expect(onValueChange).toHaveBeenCalledWith('85');
  });

  it('ส่งขอบเขตและระยะก้าวลงไปที่ input จริง เพื่อให้ลูกศรและ Home/End ทำงานเอง', () => {
    render(<Slider id="quality" label="คุณภาพรูป" value="60" min={10} max={100} step={5} onValueChange={vi.fn()} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '10');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('step', '5');
  });

  it('คำนวณสัดส่วนที่ระบายสีจากค่าปัจจุบันเทียบกับขอบเขต', () => {
    const { rerender } = render(
      <Slider id="q" label="คุณภาพ" value="10" min={10} max={100} step={5} onValueChange={vi.fn()} />,
    );
    const fill = () => screen.getByRole('slider').style.getPropertyValue('--slider-fill');
    expect(fill()).toBe('0%');

    rerender(<Slider id="q" label="คุณภาพ" value="100" min={10} max={100} step={5} onValueChange={vi.fn()} />);
    expect(fill()).toBe('100%');

    rerender(<Slider id="q" label="คุณภาพ" value="55" min={10} max={100} step={5} onValueChange={vi.fn()} />);
    expect(fill()).toBe('50%');
  });

  it('ไม่ปล่อยสัดส่วนหลุดขอบเขตเมื่อค่าที่ได้รับอยู่นอกช่วงหรืออ่านเป็นตัวเลขไม่ได้', () => {
    const { rerender } = render(
      <Slider id="q" label="คุณภาพ" value="999" min={10} max={100} step={5} onValueChange={vi.fn()} />,
    );
    const fill = () => screen.getByRole('slider').style.getPropertyValue('--slider-fill');
    expect(fill()).toBe('100%');

    rerender(<Slider id="q" label="คุณภาพ" value="-40" min={10} max={100} step={5} onValueChange={vi.fn()} />);
    expect(fill()).toBe('0%');

    rerender(<Slider id="q" label="คุณภาพ" value="" min={10} max={100} step={5} onValueChange={vi.fn()} />);
    expect(fill()).toBe('0%');
  });

  it('ปิดรางเลื่อนและหรี่ป้ายตัวเลขเมื่อ disabled', () => {
    render(<Slider id="q" label="คุณภาพ" value="60" min={10} max={100} step={5} disabled onValueChange={vi.fn()} />);
    expect(screen.getByRole('slider')).toBeDisabled();
  });
});
