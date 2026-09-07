import { describe, it, expect } from 'vitest';
import { formatJson, minifyJson } from './logic';

describe('formatJson', () => {
  it('จัดรูปแบบด้วย 2 ช่องว่างเป็นค่าเริ่มต้น', () => {
    const r = formatJson('{"a":1,"b":[1,2]}');
    expect(r).toEqual({ ok: true, output: '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}' });
  });
  it('รองรับ 4 ช่องว่างและแท็บ', () => {
    expect(formatJson('{"a":1}', 4)).toEqual({ ok: true, output: '{\n    "a": 1\n}' });
    expect(formatJson('{"a":1}', 'tab')).toEqual({ ok: true, output: '{\n\t"a": 1\n}' });
  });
  it('ข้อความว่างเป็น error ที่อ่านเข้าใจ', () => {
    const r = formatJson('   ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toBe('ยังไม่ได้ใส่ข้อมูล JSON');
  });
  it('JSON ผิดรูปแบบบอกตำแหน่งบรรทัด/คอลัมน์', () => {
    const r = formatJson('{\n  "a": 1,\n}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.line).toBe(3);
      expect(r.error.column).toBe(1);
      expect(r.error.position).toBe(12);
      expect(r.error.message.length).toBeGreaterThan(0);
    }
  });
});

describe('minifyJson', () => {
  it('ลบช่องว่างทั้งหมด', () => {
    expect(minifyJson('{\n  "a": 1,\n  "b": [1, 2]\n}')).toEqual({ ok: true, output: '{"a":1,"b":[1,2]}' });
  });
  it('รักษาค่าใน string', () => {
    expect(minifyJson('{"s": "a  b"}')).toEqual({ ok: true, output: '{"s":"a  b"}' });
  });
});
