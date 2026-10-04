// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __setUsageSummaryForTests, fetchUsageSummary, recordUsage } from './usage-client';

beforeEach(() => {
  sessionStorage.clear();
  __setUsageSummaryForTests(null, false);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubBeacon(result = true) {
  const sendBeacon = vi.fn(() => result);
  Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true });
  return sendBeacon;
}

describe('recordUsage', () => {
  it('ยิงอย่างละครั้งต่อเครื่องมือต่อแท็บ — view กับ use แยกกัน', () => {
    const sendBeacon = stubBeacon();
    recordUsage('baht-text', 'view');
    recordUsage('baht-text', 'view');
    recordUsage('baht-text', 'use');
    recordUsage('baht-text', 'use');
    recordUsage('age-days', 'view');
    expect(sendBeacon.mock.calls).toEqual([
      ['/api/usage', '{"slug":"baht-text","kind":"view"}'],
      ['/api/usage', '{"slug":"baht-text","kind":"use"}'],
      ['/api/usage', '{"slug":"age-days","kind":"view"}'],
    ]);
  });

  it('เบราว์เซอร์ไม่รับ beacon → ถอยไป fetch keepalive', () => {
    stubBeacon(false);
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    recordUsage('baht-text', 'use');
    expect(fetch).toHaveBeenCalledWith('/api/usage', expect.objectContaining({ method: 'POST', keepalive: true }));
  });

  it('sessionStorage ใช้ไม่ได้ → ยังยิงได้และไม่โยน error', () => {
    const sendBeacon = stubBeacon();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => recordUsage('baht-text', 'view')).not.toThrow();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });
});

describe('fetchUsageSummary', () => {
  it('ยิงครั้งเดียวต่อหน้า ทุกคนที่ขอได้ผลก้อนเดียวกัน', async () => {
    const body = { generatedAt: 'x', tools: { 'baht-text': { total: 70, recent: 3 } } };
    const fetch = vi.fn(async () => new Response(JSON.stringify(body)));
    vi.stubGlobal('fetch', fetch);
    const [a, b] = await Promise.all([fetchUsageSummary(), fetchUsageSummary()]);
    expect(a).toEqual(body);
    expect(b).toBe(a);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['ระบบปิด (204)', () => new Response(null, { status: 204 })],
    ['ขัดข้อง (503)', () => new Response(null, { status: 503 })],
    ['เครือข่ายพัง', () => Promise.reject(new TypeError('offline'))],
  ])('%s → null', async (_name, respond) => {
    vi.stubGlobal('fetch', vi.fn(respond));
    expect(await fetchUsageSummary()).toBeNull();
  });
});
