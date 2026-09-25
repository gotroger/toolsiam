import { afterEach, describe, expect, it, vi } from 'vitest';
import { GLO_TIMEOUT_MS, latestPeriodOnOrBefore, postGlo, recentPeriods, toDraw, toN3 } from './glo-api.mjs';

afterEach(() => vi.restoreAllMocks());

const n3Raw = {
  straight3: { price: '5801.00', number: [{ value: '212' }] },
  shuffle3: { price: '2702.00', number: [{ value: '221' }, { value: '122' }] },
  straight2: { price: '582.00', number: [{ value: '04' }] },
  special: { price: '839705.00', number: [{ value: '212000003860' }] },
};

describe('เรียก API ของ GLO', () => {
  it('ทุกคำขอมี timeout — API ค้างต้องไม่ทำให้ cron ค้างจนหมดเวลาทั้งรอบ', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ statusCode: 200, response: {} })));
    await postGlo('https://www.glo.or.th/x', undefined, fetchImpl as unknown as typeof fetch);
    const init = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init[1].signal).toBeInstanceOf(AbortSignal);
    expect(GLO_TIMEOUT_MS).toBe(10_000);
  });
});

describe('เลือกงวดจากรายการของ API', () => {
  it('เลือกงวดใหม่สุดที่ไม่เลยวันนี้ ไม่ว่า API จะเรียงมาแบบไหน', () => {
    expect(latestPeriodOnOrBefore(['2026-08-16', '2026-09-16', '2026-09-01'], '2026-09-20')).toBe('2026-09-16');
  });

  it('ข้ามงวดในอนาคตที่ API อาจประกาศล่วงหน้า', () => {
    expect(latestPeriodOnOrBefore(['2026-10-01', '2026-09-16', '2026-09-01'], '2026-09-20')).toBe('2026-09-16');
  });

  it('วันออกรางวัลเองนับเป็นงวดที่ต้องดึง', () => {
    expect(latestPeriodOnOrBefore(['2026-09-16', '2026-09-01'], '2026-09-16')).toBe('2026-09-16');
  });

  it('ไม่มีงวดที่ถึงกำหนดเลยคืน undefined', () => {
    expect(latestPeriodOnOrBefore(['2026-10-01'], '2026-09-20')).toBeUndefined();
  });

  it('limit คือ N งวดล่าสุด ไม่ใช่ N ไฟล์ที่ขาดอยู่ที่ไหนก็ได้ในประวัติ', () => {
    const periods = ['2026-09-01', '2026-10-01', '2026-09-16', '2026-08-16', '2026-08-01'];
    expect(recentPeriods(periods, 2, '2026-09-20')).toEqual(['2026-09-16', '2026-09-01']);
    expect(recentPeriods(periods, Infinity, '2026-09-20')).toEqual([
      '2026-09-16',
      '2026-09-01',
      '2026-08-16',
      '2026-08-01',
    ]);
  });
});

describe('แปลง N3', () => {
  it('N3 ครบถ้วนถูกแปลงและเรียงเลข', () => {
    expect(toN3('2026-09-16', n3Raw)).toEqual({
      straight3: { price: 5801, numbers: ['212'] },
      shuffle3: { price: 2702, numbers: ['122', '221'] },
      straight2: { price: 582, numbers: ['04'] },
      special: { price: 839705, numbers: ['212000003860'] },
    });
  });

  it('n3 ว่างเปล่า ({}) ถือว่าไม่มี N3 ไม่ใช่ error', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(toN3('2026-09-16', {})).toBeUndefined();
    expect(toN3('2026-09-16', null)).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it('N3 ที่ยังออกไม่ครบถูกตัดทิ้งพร้อม log แทนการโยน error', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { special: _special, ...partial } = n3Raw;
    expect(toN3('2026-09-16', partial)).toBeUndefined();
    expect(toN3('2026-09-16', { ...n3Raw, straight2: { price: '0', number: [] } })).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(2);
    expect(String(warn.mock.calls[0][0])).toContain('special');
  });

  it('N3 ที่ไม่ครบไม่ทำให้ผลสลาก 6 หลักทั้งงวดถูกทิ้ง', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const seq = (n: number, start: number) =>
      Array.from({ length: n }, (_, i) => ({ value: String(start + i).padStart(6, '0') }));
    const result = {
      date: '2026-09-16',
      data: {
        first: { number: [{ value: '123456' }] },
        near1: { number: [{ value: '123455' }, { value: '123457' }] },
        second: { number: seq(5, 200_000) },
        third: { number: seq(10, 300_000) },
        fourth: { number: seq(50, 400_000) },
        fifth: { number: seq(100, 500_000) },
        last3f: { number: [{ value: '111' }, { value: '222' }] },
        last3b: { number: [{ value: '333' }, { value: '444' }] },
        last2: { number: [{ value: '55' }] },
      },
      n3: { straight3: n3Raw.straight3 },
    };
    const draw = toDraw('2026-09-16', result, { status: 'validated', enteredAt: '2026-09-16' });
    expect(draw.prizes.first).toEqual(['123456']);
    expect(draw.n3).toBeUndefined();
  });
});
