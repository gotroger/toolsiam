// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SpinWheelTool from '../spin-wheel/Tool';
import RandomPickerTool from '../random-picker/Tool';
import PasswordGeneratorTool from '../password-generator/Tool';
import RandomNumberTool from '../random-number/Tool';
import { ROLL_STEPS } from './roll';

/** jsdom ไม่มี matchMedia — ตั้งค่า prefers-reduced-motion ได้ตามเทสต์ */
function mockReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

const status = () => screen.getByRole('status');

describe('ช่องประกาศผลของหมวดสุ่ม', () => {
  afterEach(() => vi.useRealTimers());

  describe('ไม่มีจังหวะลุ้น (ลดการเคลื่อนไหว)', () => {
    beforeEach(() => mockReducedMotion(true));

    it('วงล้อเกิน 20 รายการ: หมุนได้โดยไม่ error และผู้ชนะมาจาก 20 รายการแรกที่เห็น', () => {
      render(<SpinWheelTool />);
      const names = Array.from({ length: 25 }, (_, i) => `ช่อง${i + 1}`);
      fireEvent.change(screen.getByLabelText('รายการในวงล้อ'), { target: { value: names.join('\n') } });
      // ช่องประกาศต้องอยู่ใน DOM ตั้งแต่ก่อนหมุน ไม่ใช่โผล่มาพร้อมผล
      expect(status()).toHaveTextContent('');

      for (let i = 0; i < 10; i++) {
        fireEvent.click(screen.getByRole('button', { name: 'หมุนวงล้อ' }));
        expect(screen.queryByRole('alert')).toBeNull();
        const winner = /ผลการหมุน ช่อง(\d+)/.exec(status().textContent ?? '');
        expect(winner).not.toBeNull();
        expect(Number(winner![1])).toBeLessThanOrEqual(20);
      }
    });

    it('รหัสผ่าน: ประกาศว่าสร้างแล้ว แต่ไม่อ่านตัวรหัสออกเสียง', () => {
      render(<PasswordGeneratorTool />);
      fireEvent.click(screen.getByRole('button', { name: 'สร้างรหัสผ่าน' }));
      expect(status()).toHaveTextContent('สร้างรหัสผ่านแล้ว');
      const shown = document.querySelector('.font-mono')?.textContent ?? '';
      expect(shown.length).toBeGreaterThan(0);
      expect(status().textContent).not.toContain(shown);
    });
  });

  describe('มีจังหวะลุ้น', () => {
    beforeEach(() => {
      mockReducedMotion(false);
      vi.useFakeTimers();
    });

    it('สุ่มชื่อ: ระหว่างลุ้นไม่ประกาศค่าหลอก กล่องผลเป็น aria-busy และจบด้วยผลจริงครั้งเดียว', () => {
      render(<RandomPickerTool />);
      fireEvent.change(screen.getByLabelText('รายชื่อหรือรายการ'), { target: { value: 'ก\nข\nค\nง' } });
      fireEvent.click(screen.getByRole('button', { name: 'สุ่มเลย' }));

      expect(status()).toHaveTextContent('');
      const box = document.querySelector('.result-box')!;
      expect(box).toHaveAttribute('aria-busy', 'true');
      expect(box).not.toHaveAttribute('aria-live');

      act(() => {
        vi.advanceTimersByTime(ROLL_STEPS.reduce((a, b) => a + b, 0) + 50);
      });
      expect(status().textContent).toMatch(/^ผู้โชคดี 1\. [กขคง]$/);
      expect(box).toHaveAttribute('aria-busy', 'false');
    });

    it('สุ่มเลข: ค่าต่ำสุดติดลบใช้ได้ และช่องรับเครื่องหมายลบบนมือถือได้', () => {
      render(<RandomNumberTool />);
      const min = screen.getByLabelText('ค่าต่ำสุด');
      expect(min).toHaveAttribute('inputmode', 'text');
      fireEvent.change(min, { target: { value: '-10' } });
      fireEvent.change(screen.getByLabelText('ค่าสูงสุด'), { target: { value: '−5' } });
      fireEvent.click(screen.getByRole('button', { name: 'สุ่มเลย' }));
      act(() => {
        vi.advanceTimersByTime(ROLL_STEPS.reduce((a, b) => a + b, 0) + 50);
      });
      expect(screen.queryByRole('alert')).toBeNull();
      const got = Number(/ได้เลข (-?\d+)/.exec(status().textContent ?? '')?.[1]);
      expect(got).toBeGreaterThanOrEqual(-10);
      expect(got).toBeLessThanOrEqual(-5);
    });
  });
});
