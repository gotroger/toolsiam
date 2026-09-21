import { useState } from 'react';
import { resolveDraw, type Rng } from '@/lib/random';

export interface DrawState<T> {
  seedInput: string;
  setSeedInput: (value: string) => void;
  /** ผลของการสุ่มครั้งล่าสุด — null แปลว่ายังไม่เคยกดสุ่ม */
  result: T | null;
  /** seed ที่ใช้กับผลข้างบน ต้องแสดงคู่กันเสมอ */
  usedSeed: string | null;
  error: string | null;
  draw: (compute: (rng: Rng) => T) => void;
  reset: () => void;
}

/**
 * นโยบายการสุ่มของทั้งหมวด รวมไว้ที่เดียว
 *
 * เริ่มที่ `result: null` เสมอ และคำนวณเฉพาะตอนกดปุ่ม — ต่างจากเครื่องมืออย่าง text-lines
 * ที่คำนวณระหว่าง render ได้เพราะเป็นฟังก์ชันบริสุทธิ์ ถ้าสุ่มระหว่าง render ผลจะเปลี่ยน
 * ทุกครั้งที่ React วาดใหม่ และ SSR กับ client จะได้คนละค่าจนหน้าเพี้ยนตอน hydrate
 */
export function useDraw<T>(): DrawState<T> {
  const [seedInput, setSeedInput] = useState('');
  const [drawn, setDrawn] = useState<{ value: T; seed: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function draw(compute: (rng: Rng) => T) {
    try {
      const { rng, seed } = resolveDraw(seedInput);
      setDrawn({ value: compute(rng), seed });
      setError(null);
    } catch (e) {
      setDrawn(null);
      setError(e instanceof Error ? e.message : 'สุ่มไม่สำเร็จ');
    }
  }

  return {
    seedInput,
    setSeedInput,
    result: drawn?.value ?? null,
    usedSeed: drawn?.seed ?? null,
    error,
    draw,
    reset: () => {
      setDrawn(null);
      setError(null);
    },
  };
}
