import { describe, it, expect } from 'vitest';
import { DRAWS, drawByDate, drawsByYear, HAS_DRAWS, latestDraw } from './index';
import { validateDrawIssues } from './schema';

/**
 * เทสต์นี้ทำงานได้ทั้งตอนยังไม่มีข้อมูลและตอนมีข้อมูลแล้ว
 * เมื่อวางไฟล์งวดจริงลงในโฟลเดอร์ เทสต์ชุดเดียวกันนี้จะกลายเป็นตัวตรวจข้อมูลจริงทันที
 */
describe('คลังข้อมูลงวด', () => {
  it('ทุกงวดที่มีอยู่ผ่าน validator', () => {
    for (const draw of DRAWS) {
      expect(validateDrawIssues(draw), draw.drawDate).toEqual([]);
    }
  });

  it('เรียงจากใหม่ไปเก่า', () => {
    const dates = DRAWS.map((d) => d.drawDate);
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)));
  });

  it('ไม่มีวันที่ซ้ำกัน', () => {
    expect(new Set(DRAWS.map((d) => d.drawDate)).size).toBe(DRAWS.length);
  });

  it('HAS_DRAWS ตรงกับจำนวนงวดที่มีจริง — เป็นตัวคุมว่าหน้า /lottery จะถูก build หรือไม่', () => {
    expect(HAS_DRAWS).toBe(DRAWS.length > 0);
  });

  it('latestDraw คืนงวดใหม่สุด และคืน undefined เมื่อยังไม่มีข้อมูล', () => {
    expect(latestDraw()).toBe(DRAWS[0]);
    if (!HAS_DRAWS) expect(latestDraw()).toBeUndefined();
  });

  it('drawByDate หางวดที่ไม่มีคืน undefined', () => {
    expect(drawByDate('1900-01-01')).toBeUndefined();
    for (const d of DRAWS) expect(drawByDate(d.drawDate)).toBe(d);
  });

  it('จัดกลุ่มตามปีได้ครบทุกงวดและเรียงปีจากใหม่ไปเก่า', () => {
    const groups = drawsByYear();
    expect(groups.flatMap((g) => g.draws)).toHaveLength(DRAWS.length);
    const years = groups.map((g) => g.year);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });
});
