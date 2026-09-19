// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __setPlanForTests, hasSessionHint, refreshPlan, usePlan } from './plan-client';

function setCookie(value: string) {
  Object.defineProperty(document, 'cookie', { value, configurable: true, writable: true });
}

beforeEach(() => {
  __setPlanForTests(null);
  setCookie('');
});
afterEach(() => vi.unstubAllGlobals());

describe('plan-client', () => {
  it('ไม่มี hint cookie → anonymous ทันทีโดยไม่ยิงเครือข่าย', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(hasSessionHint()).toBe(false);
    const { result } = renderHook(() => usePlan());
    await waitFor(() => expect(result.current.status).toBe('anonymous'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('มี hint → ยิง /api/me ครั้งเดียวแม้มีสอง subscriber และได้สถานะ signedIn', async () => {
    setCookie('toolsiam-x=1; ts_m=1');
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            user: { displayName: 'A', email: 'a@b.c', avatarUrl: null },
            plan: 'premium',
            premiumUntil: 123,
            expiringSoon: true,
          }),
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const a = renderHook(() => usePlan());
    const b = renderHook(() => usePlan());
    await waitFor(() => expect(a.result.current.status).toBe('signedIn'));
    expect(b.result.current).toEqual({
      status: 'signedIn',
      plan: 'premium',
      premiumUntil: 123,
      expiringSoon: true,
      user: { displayName: 'A', email: 'a@b.c', avatarUrl: null },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe('/api/me');
  });

  it('204 → off · 401 → anonymous · เครือข่ายพัง → anonymous', async () => {
    setCookie('ts_m=1');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    await refreshPlan();
    expect(renderHook(() => usePlan()).result.current.status).toBe('off');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    );
    await refreshPlan();
    expect(renderHook(() => usePlan()).result.current.status).toBe('anonymous');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    );
    await refreshPlan();
    expect(renderHook(() => usePlan()).result.current.status).toBe('anonymous');
  });
});
