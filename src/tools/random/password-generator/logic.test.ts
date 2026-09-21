import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { seededRng } from '@/lib/random';
import {
  DEFAULT_PASSWORD_OPTIONS,
  estimateStrength,
  generatePassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  poolSize,
  type PasswordOptions,
} from './logic';

const rng = () => seededRng('รหัสผ่าน');
const opts = (patch: Partial<PasswordOptions> = {}): PasswordOptions => ({ ...DEFAULT_PASSWORD_OPTIONS, ...patch });

describe('generatePassword', () => {
  it('ยาวตามที่สั่งเป๊ะ', () => {
    for (const length of [4, 12, 24, 64, MAX_PASSWORD_LENGTH]) {
      expect(generatePassword(opts({ length }), rng())).toHaveLength(length);
    }
  });

  it('เปิดทุกชุดแล้วต้องมีครบทุกชุดอย่างน้อยชุดละตัว', () => {
    const r = rng();
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword(opts({ length: 8 }), r);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[!@#$%^&*()\-_=+[\]{};:,.?]/);
    }
  });

  it('ชุดที่ปิดไว้ต้องไม่โผล่มาเลย', () => {
    const r = rng();
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword(opts({ length: 20, upper: false, symbols: false }), r);
      expect(pw).not.toMatch(/[A-Z]/);
      expect(pw).not.toMatch(/[!@#$%^&*()\-_=+[\]{};:,.?]/);
      expect(pw).toMatch(/^[a-z0-9]+$/);
    }
  });

  it('ตัดตัวที่สับสนแล้วไม่มี 0 O 1 l I หลงเหลือ', () => {
    const r = rng();
    for (let i = 0; i < 100; i++) {
      expect(generatePassword(opts({ length: 32, excludeLookAlike: true }), r)).not.toMatch(/[0O1lI]/);
    }
  });

  it('ไม่ตัดตัวที่สับสนก็ยังใช้ได้ปกติ', () => {
    expect(generatePassword(opts({ length: 16, excludeLookAlike: false }), rng())).toHaveLength(16);
  });

  it('ไม่เลือกชุดอักขระเลยเป็นข้อผิดพลาด', () => {
    const none = opts({ lower: false, upper: false, digits: false, symbols: false });
    expect(() => generatePassword(none, rng())).toThrow();
  });

  it('ความยาวสั้นกว่าจำนวนชุดที่เปิดไว้เป็นข้อผิดพลาด', () => {
    expect(() => generatePassword(opts({ length: 3 }), rng())).toThrow();
  });

  it('ความยาวนอกช่วงที่รองรับเป็นข้อผิดพลาด', () => {
    expect(() => generatePassword(opts({ length: MIN_PASSWORD_LENGTH - 1 }), rng())).toThrow();
    expect(() => generatePassword(opts({ length: MAX_PASSWORD_LENGTH + 1 }), rng())).toThrow();
    expect(() => generatePassword(opts({ length: 12.5 }), rng())).toThrow();
  });

  it('สุ่มใหม่แล้วได้คนละรหัส — ไม่ใช่ค่าคงที่', () => {
    const r = rng();
    const made = new Set(Array.from({ length: 20 }, () => generatePassword(opts({ length: 16 }), r)));
    expect(made.size).toBe(20);
  });

  it('ตัวที่การันตีไว้ไม่ได้กองอยู่ต้นสตริงเสมอ — ต้องถูกสลับตำแหน่งจริง', () => {
    const r = rng();
    const firstChars = new Set(
      Array.from({ length: 60 }, () => generatePassword(opts({ length: 8 }), r)[0]).map((c) =>
        /[a-z]/.test(c) ? 'lower' : /[A-Z]/.test(c) ? 'upper' : /[0-9]/.test(c) ? 'digit' : 'symbol',
      ),
    );
    expect(firstChars.size).toBeGreaterThan(1);
  });
});

describe('poolSize และ estimateStrength', () => {
  it('นับขนาดกองอักขระตามชุดที่เปิด', () => {
    expect(poolSize(opts({ lower: true, upper: false, digits: false, symbols: false, excludeLookAlike: false }))).toBe(
      26,
    );
    expect(poolSize(opts({ lower: true, upper: false, digits: true, symbols: false, excludeLookAlike: false }))).toBe(
      36,
    );
  });

  it('ตัดตัวสับสนแล้วกองเล็กลง', () => {
    const full = poolSize(opts({ excludeLookAlike: false }));
    expect(poolSize(opts({ excludeLookAlike: true }))).toBeLessThan(full);
  });

  it('ยิ่งยาวยิ่งแข็งแรง และป้ายไล่ระดับตามบิต', () => {
    const short = estimateStrength(6, 62);
    const long = estimateStrength(32, 62);
    expect(long.bits).toBeGreaterThan(short.bits);
    expect(short.label).toBe('อ่อน');
    expect(long.label).toBe('แข็งแรงมาก');
  });

  it('กองว่างให้ 0 บิต ไม่ใช่ NaN หรือ -Infinity', () => {
    expect(estimateStrength(12, 0).bits).toBe(0);
  });
});

describe('ข้อห้ามเชิงโครงสร้าง', () => {
  /** อ่านเฉพาะโค้ด — คอมเมนต์ที่อธิบายว่า "ห้ามใช้ seededRng" ต้องไม่ทำให้เทสต์นี้ตก */
  const codeOf = (file: string) =>
    readFileSync(join(process.cwd(), 'src', 'tools', 'random', 'password-generator', file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

  it('ไม่มีโหมด seed ในเครื่องมือนี้ — รหัสผ่านที่สร้างซ้ำได้ไม่ใช่ความลับ', () => {
    for (const file of ['logic.ts', 'Tool.tsx']) {
      expect(codeOf(file), file).not.toMatch(/seededRng|newSeed|resolveDraw|useDraw|SeedRow/);
    }
  });

  it('ใช้ตัวสร้างเลขสุ่มเชิงความปลอดภัยของระบบเท่านั้น', () => {
    expect(codeOf('Tool.tsx')).toContain('cryptoRng');
  });
});
