import { useState } from 'react';
import { cryptoRng, resolveDraw, type Rng } from '@/lib/random';
import { useRollSequence } from './roll';

export interface DrawState<T> {
  seedInput: string;
  setSeedInput: (value: string) => void;
  /** ค่าที่ควรแสดงตอนนี้ — ระหว่างลุ้นเป็นค่าหลอก พอจบคือผลจริง */
  shown: T | null;
  /** ผลจริง มีค่าเฉพาะเมื่อลุ้นจบแล้ว — ใช้กับปุ่มคัดลอกและอะไรที่ต้องไม่ได้ค่าหลอกไป */
  result: T | null;
  rolling: boolean;
  /** นับครั้งที่สุ่ม ใช้เป็น key เพื่อให้แอนิเมชันตอนผลลงตัวเล่นซ้ำทุกครั้ง */
  drawId: number;
  usedSeed: string | null;
  error: string | null;
  draw: (compute: (rng: Rng) => T, preview?: (rng: Rng, step: number, final: T) => T) => void;
  reset: () => void;
}

/**
 * นโยบายการสุ่มของทั้งหมวด รวมไว้ที่เดียว
 *
 * เริ่มที่ `shown: null` เสมอ และคำนวณเฉพาะตอนกดปุ่ม — ต่างจากเครื่องมืออย่าง text-lines
 * ที่คำนวณระหว่าง render ได้เพราะเป็นฟังก์ชันบริสุทธิ์ ถ้าสุ่มระหว่าง render ผลจะเปลี่ยน
 * ทุกครั้งที่ React วาดใหม่ และ SSR กับ client จะได้คนละค่าจนหน้าเพี้ยนตอน hydrate
 */
export function useDraw<T>(): DrawState<T> {
  const [seedInput, setSeedInput] = useState('');
  const [usedSeed, setUsedSeed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawId, setDrawId] = useState(0);
  const sequence = useRollSequence<T>();

  function draw(compute: (rng: Rng) => T, preview?: (rng: Rng, step: number, final: T) => T) {
    try {
      const { rng, seed } = resolveDraw(seedInput);
      // ตัดสินผลจริงที่บรรทัดนี้ ก่อนจังหวะลุ้นจะเริ่ม
      const final = compute(rng);

      setUsedSeed(seed);
      setError(null);
      setDrawId((n) => n + 1);

      if (!preview) {
        sequence.play(final);
        return;
      }
      // ค่าหลอกมาจาก RNG คนละตัวกับที่ตัดสินผล จึงไม่มีทางไปแตะผลจริงได้เลย
      const decoy = cryptoRng();
      sequence.play(final, (step) => preview(decoy, step, final));
    } catch (e) {
      sequence.clear();
      setUsedSeed(null);
      setError(e instanceof Error ? e.message : 'สุ่มไม่สำเร็จ');
    }
  }

  return {
    seedInput,
    setSeedInput,
    shown: sequence.shown,
    result: sequence.rolling ? null : sequence.shown,
    rolling: sequence.rolling,
    drawId,
    usedSeed,
    error,
    draw,
    reset: () => {
      sequence.clear();
      setUsedSeed(null);
      setError(null);
    },
  };
}
