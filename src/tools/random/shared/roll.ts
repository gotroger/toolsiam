import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/**
 * ระยะห่างระหว่างเฟรมของจังหวะลุ้น รวม 1.78 วินาที
 *
 * ต้อง **ถ่างขึ้นเรื่อย ๆ** ไม่ใช่เท่ากันทุกเฟรม เพราะค่าที่กะพริบถี่สม่ำเสมอแล้วหยุดห้วน ๆ
 * ให้ความรู้สึกว่าโปรแกรมค้างแล้วเด้งคำตอบมา ไม่ใช่วงล้อที่กำลังชะลอจนหยุด
 * ซึ่งความรู้สึกหลังคือสิ่งเดียวที่ทำให้การรอมีค่า
 */
export const ROLL_STEPS = [60, 60, 65, 70, 75, 85, 95, 110, 125, 150, 175, 200, 235, 275];

/**
 * ผลที่มากกว่านี้ข้ามจังหวะลุ้นไปแสดงทันที
 *
 * ไม่ใช่เรื่องความเร็วของเครื่อง แต่เพราะไม่มีใครดูเลขพันตัวรัวพร้อมกันแล้วรู้สึกลุ้น —
 * มันกลายเป็นหน้าจอกะพริบที่ต้องรอเฉย ๆ การลุ้นมีค่าเมื่อมีผลไม่กี่ตัวให้จ้อง
 */
export const ROLL_LIMIT = 20;

/** รายชื่อยาวกว่านี้ไม่ต้องสลับให้ดูทุกเฟรม การ์ดกระโดดทั้งจอจนอ่านไม่ทัน */
export const GROUP_ROLL_LIMIT = 60;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

export interface RollSequence<T> {
  /** ค่าที่ควรแสดงตอนนี้ — ระหว่างลุ้นเป็นค่าหลอก พอจบคือค่าจริง */
  shown: T | null;
  rolling: boolean;
  /** ไม่ส่ง preview = แสดงผลทันทีโดยไม่มีจังหวะลุ้น */
  play: (final: T, preview?: (step: number) => T) => void;
  clear: () => void;
}

/**
 * เล่นค่าหลอกเป็นจังหวะแล้วจบด้วยค่าจริง
 *
 * ค่าจริงถูกตัดสินและส่งเข้ามาก่อนเสมอ ตัวนี้ทำหน้าที่นำเสนออย่างเดียว —
 * กติกาเดียวกับวงล้อ ถ้าให้แอนิเมชันเป็นคนตัดสินผล ผลจะเพี้ยนทันทีที่จังหวะถูกขัด
 */
export function useRollSequence<T>(): RollSequence<T> {
  const [shown, setShown] = useState<T | null>(null);
  const [rolling, setRolling] = useState(false);
  const timer = useRef<number | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => () => window.clearTimeout(timer.current ?? undefined), []);

  function play(final: T, preview?: (step: number) => T) {
    window.clearTimeout(timer.current ?? undefined);
    timer.current = null;

    if (reduced || !preview) {
      setShown(final);
      setRolling(false);
      return;
    }

    setRolling(true);
    setShown(preview(0));

    let step = 0;
    const tick = () => {
      step += 1;
      if (step >= ROLL_STEPS.length) {
        timer.current = null;
        setShown(final);
        setRolling(false);
        return;
      }
      setShown(preview(step));
      timer.current = window.setTimeout(tick, ROLL_STEPS[step]);
    };
    timer.current = window.setTimeout(tick, ROLL_STEPS[0]);
  }

  function clear() {
    window.clearTimeout(timer.current ?? undefined);
    timer.current = null;
    setShown(null);
    setRolling(false);
  }

  return { shown, rolling, play, clear };
}
