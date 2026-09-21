// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccountPanel, { __setPlanForTests } from './AccountPanel';

beforeEach(() => {
  __setPlanForTests(null);
  Object.defineProperty(document, 'cookie', { value: '', configurable: true, writable: true });
  // ค่าเริ่มต้น: ยังไม่เคยจ่าย — เทสต์ที่สนใจประวัติจะ stub ทับเอง
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ payments: [] }))),
  );
});
afterEach(() => vi.unstubAllGlobals());

const user = { displayName: 'สมชาย', email: 'somchai@example.com', avatarUrl: null };

describe('AccountPanel', () => {
  it('ระบบปิด → บอกว่าปิดปรับปรุง ไม่มีปุ่มเข้าสู่ระบบ', () => {
    __setPlanForTests({ status: 'off' });
    render(<AccountPanel />);
    expect(screen.getByText('ระบบสมาชิกปิดปรับปรุงชั่วคราว')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /เข้าสู่ระบบ/ })).not.toBeInTheDocument();
  });

  it('ถามสถานะไม่สำเร็จ → บอกว่าสิทธิ์ไม่หาย พร้อมปุ่มลองใหม่ ไม่ใช่หน้า "ยังไม่ได้เข้าสู่ระบบ"', () => {
    __setPlanForTests({ status: 'error' });
    render(<AccountPanel />);
    expect(screen.getByRole('alert')).toHaveTextContent('ตรวจสอบสถานะบัญชีไม่สำเร็จ');
    expect(screen.getByRole('button', { name: 'ลองใหม่' })).toBeInTheDocument();
    expect(screen.queryByText('ยังไม่ได้เข้าสู่ระบบ')).not.toBeInTheDocument();
  });

  it('ยังไม่ล็อกอิน → ปุ่มเข้าสู่ระบบพา next กลับมาหน้าบัญชี และแสดง error จาก Google เมื่อมี', () => {
    __setPlanForTests({ status: 'anonymous' });
    window.history.replaceState(null, '', '/account?error=google');
    render(<AccountPanel />);
    expect(screen.getByRole('link', { name: 'เข้าสู่ระบบด้วย Google' })).toHaveAttribute(
      'href',
      '/api/auth/google/start?next=%2Faccount',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('เข้าสู่ระบบไม่สำเร็จ');
    window.history.replaceState(null, '', '/account');
  });

  it('ล็อกอินแล้ว (ฟรี) → โปรไฟล์ + ปุ่มสมัคร + ฟอร์มออกจากระบบเป็น POST', () => {
    __setPlanForTests({ status: 'signedIn', plan: 'free', user });
    render(<AccountPanel />);
    expect(screen.getByText('สมชาย')).toBeInTheDocument();
    expect(screen.getByText('ฟรี')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'สมัคร 30 วัน · 29 บาท' })).toBeInTheDocument();
    const logout = screen.getByRole('button', { name: 'ออกจากระบบ' }).closest('form')!;
    expect(logout).toHaveAttribute('method', 'post');
    expect(logout).toHaveAttribute('action', '/api/auth/logout');
  });

  it('พรีเมียมใกล้หมดอายุ → banner เตือน + ปุ่มต่ออายุ', () => {
    const until = Math.floor(Date.now() / 1000) + 2 * 86_400;
    __setPlanForTests({ status: 'signedIn', plan: 'premium', premiumUntil: until, expiringSoon: true, user });
    render(<AccountPanel />);
    expect(screen.getByText(/พรีเมียมจะหมดอายุใน 2 วัน/)).toBeInTheDocument();
    expect(screen.getByText('สมาชิกพรีเมียม')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ต่ออายุอีก 30 วัน · 29 บาท' })).toBeInTheDocument();
  });

  it('เคยจ่ายแล้ว → แสดงตารางประวัติพร้อมวันที่ จำนวนเงิน และสถานะภาษาไทย', async () => {
    __setPlanForTests({ status: 'signedIn', plan: 'free', user });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/billing/history')
          return new Response(
            JSON.stringify({
              payments: [
                { createdAt: Date.UTC(2026, 8, 19) / 1000, amountSatang: 1900, status: 'paid' },
                { createdAt: Date.UTC(2026, 7, 19) / 1000, amountSatang: 1900, status: 'expired' },
              ],
            }),
          );
        throw new Error(`ไม่คาดคิด: ${url}`);
      }),
    );
    render(<AccountPanel />);
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByText('ชำระแล้ว')).toBeInTheDocument();
    expect(screen.getByText('หมดอายุ')).toBeInTheDocument();
    expect(screen.getAllByText('19.00 บาท')).toHaveLength(2);
    expect(screen.getByText(/19 กันยายน 2569/)).toBeInTheDocument();
  });

  it('ยังไม่เคยจ่าย → ไม่มีตารางประวัติให้รกหน้า', async () => {
    __setPlanForTests({ status: 'signedIn', plan: 'free', user });
    render(<AccountPanel />);
    await waitFor(() => expect(screen.getByText('สมชาย')).toBeInTheDocument());
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('กดสมัคร → POST checkout → แสดง QR และ poll จน paid', async () => {
    __setPlanForTests({ status: 'signedIn', plan: 'free', user });
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/billing/checkout') {
        expect(init?.method).toBe('POST');
        return new Response(
          JSON.stringify({
            paymentId: 'p1',
            imageBase64: 'AAAA',
            rawData: '000201',
            expiresAt: Math.floor(Date.now() / 1000) + 900,
          }),
        );
      }
      if (url.startsWith('/api/billing/status?ref=p1'))
        return new Response(JSON.stringify({ status: 'paid', premiumUntil: 1 }));
      if (url === '/api/me')
        return new Response(JSON.stringify({ user, plan: 'premium', premiumUntil: 1, expiringSoon: false }));
      throw new Error(`ไม่คาดคิด: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    // หลังจ่าย refreshPlan() จะยิง /api/me เฉพาะเมื่อมี hint cookie
    Object.defineProperty(document, 'cookie', { value: 'ts_m=1', configurable: true, writable: true });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<AccountPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'สมัคร 30 วัน · 29 บาท' }));
    expect(await screen.findByRole('img', { name: 'QR PromptPay สำหรับชำระเงิน' })).toHaveAttribute(
      'src',
      'data:image/png;base64,AAAA',
    );
    expect(screen.getByText(/QR หมดอายุใน/)).toHaveTextContent(/1[45]:\d\d/);
    expect(screen.getByRole('button', { name: 'คัดลอกรหัส PromptPay' })).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(3100);
    await waitFor(() => expect(screen.getByText('ชำระเงินสำเร็จ')).toBeInTheDocument());
    vi.useRealTimers();
  });

  it('จ่ายสำเร็จแล้ว → ประวัติโผล่รายการใหม่เองโดยไม่ต้องรีเฟรชหน้า', async () => {
    __setPlanForTests({ status: 'signedIn', plan: 'free', user });
    let paid = false;
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/billing/history')
        return new Response(
          JSON.stringify({
            payments: paid ? [{ createdAt: Date.UTC(2026, 8, 21) / 1000, amountSatang: 2900, status: 'paid' }] : [],
          }),
        );
      if (url === '/api/billing/checkout')
        return new Response(
          JSON.stringify({
            paymentId: 'p1',
            imageBase64: 'AAAA',
            rawData: '000201',
            expiresAt: Math.floor(Date.now() / 1000) + 900,
          }),
        );
      if (url.startsWith('/api/billing/status?ref=p1')) {
        paid = true;
        return new Response(JSON.stringify({ status: 'paid', premiumUntil: 1 }));
      }
      if (url === '/api/me')
        return new Response(JSON.stringify({ user, plan: 'premium', premiumUntil: 1, expiringSoon: false }));
      throw new Error(`ไม่คาดคิด: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(document, 'cookie', { value: 'ts_m=1', configurable: true, writable: true });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<AccountPanel />);
    await waitFor(() => expect(screen.queryByRole('table')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'สมัคร 30 วัน · 29 บาท' }));
    await screen.findByRole('img', { name: 'QR PromptPay สำหรับชำระเงิน' });
    await vi.advanceTimersByTimeAsync(3100);
    await waitFor(() => expect(screen.getByText('ชำระเงินสำเร็จ')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('29.00 บาท')).toBeInTheDocument());
    vi.useRealTimers();
  });

  it('checkout ล้มเหลว (502) → แสดงข้อความและกลับมากดใหม่ได้', async () => {
    __setPlanForTests({ status: 'signedIn', plan: 'free', user });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response(JSON.stringify({ error: 'สร้าง QR ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }), { status: 502 }),
      ),
    );
    render(<AccountPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'สมัคร 30 วัน · 29 บาท' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('สร้าง QR ไม่สำเร็จ');
    expect(screen.getByRole('button', { name: 'สมัคร 30 วัน · 29 บาท' })).toBeEnabled();
  });
});
