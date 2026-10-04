// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FavoriteButton from './FavoriteButton';
import { FavoritesList } from './FavoritesList';
import { __setPlanForTests } from '@/lib/plan-client';
import { __setFavoritesForTests } from '@/lib/favorites-client';

const user = { displayName: 'สมชาย', email: 'a@b.c', avatarUrl: null };

/** server จำลอง: GET คืนชุดปัจจุบัน · POST แก้ชุดแล้วคืนชุดใหม่ (หรือพังตาม `failPost`) */
function fakeServer(initial: string[] = [], { failPost = false } = {}) {
  let slugs = [...initial];
  const posts: unknown[] = [];
  const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { slug: string; favorite: boolean };
      posts.push(body);
      if (failPost) return new Response(null, { status: 503 });
      slugs = body.favorite
        ? [body.slug, ...slugs.filter((s) => s !== body.slug)]
        : slugs.filter((s) => s !== body.slug);
    }
    return new Response(JSON.stringify({ slugs }));
  });
  vi.stubGlobal('fetch', fetch);
  return { posts, fetch };
}

beforeEach(() => {
  __setPlanForTests(null);
  __setFavoritesForTests(null);
  window.history.replaceState(null, '', '/tools/baht-text');
});
afterEach(() => vi.unstubAllGlobals());

describe('FavoriteButton', () => {
  it('HTML จาก server เป็นตัวจองที่ล่องหน — ไม่มีลิงก์หรือปุ่มให้กดก่อนรู้สถานะ', () => {
    const html = renderToString(<FavoriteButton slug="baht-text" />);
    expect(html).toContain('data-placeholder');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('<a');
  });

  it('ไม่ได้ล็อกอิน → ลิงก์เข้าสู่ระบบที่พากลับมาบันทึกเครื่องมือนี้', () => {
    __setPlanForTests({ status: 'anonymous' });
    render(<FavoriteButton slug="baht-text" />);
    expect(screen.getByRole('link', { name: /บันทึกเป็นรายการโปรด/ })).toHaveAttribute(
      'href',
      '/api/auth/google/start?next=%2Ftools%2Fbaht-text%3Ffavorite%3Dadd',
    );
  });

  it('ระบบสมาชิกปิด → ไม่มีอะไรให้กด', () => {
    __setPlanForTests({ status: 'off' });
    render(<FavoriteButton slug="baht-text" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('ล็อกอินแล้ว → กดสลับได้ เปลี่ยนบนจอทันทีแล้วยึดค่าจาก server', async () => {
    const server = fakeServer(['age-days']);
    __setPlanForTests({ status: 'signedIn', user });
    render(<FavoriteButton slug="baht-text" />);
    const button = await screen.findByRole('button', { name: 'รายการโปรด' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(button).not.toHaveAttribute('aria-disabled'));
    expect(server.posts).toEqual([{ slug: 'baht-text', favorite: true }]);
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
    expect(server.posts).toHaveLength(2);
  });

  it('บันทึกไม่สำเร็จ → คืนสถานะเดิมพร้อมข้อความ', async () => {
    fakeServer([], { failPost: true });
    __setPlanForTests({ status: 'signedIn', user });
    render(<FavoriteButton slug="baht-text" />);
    const button = await screen.findByRole('button', { name: 'รายการโปรด' });
    fireEvent.click(button);
    expect(await screen.findByText('บันทึกรายการโปรดไม่สำเร็จ กรุณาลองใหม่')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('กลับจากหน้า Google พร้อม ?favorite=add → บันทึกให้ครั้งเดียวแล้วลบพารามิเตอร์', async () => {
    const server = fakeServer();
    window.history.replaceState(null, '', '/tools/baht-text?favorite=add&x=1');
    __setPlanForTests({ status: 'signedIn', user });
    render(<FavoriteButton slug="baht-text" />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'รายการโปรด' })).toHaveAttribute('aria-pressed', 'true'),
    );
    expect(window.location.search).toBe('?x=1');
    expect(server.posts).toEqual([{ slug: 'baht-text', favorite: true }]);
  });
});

describe('FavoritesList', () => {
  const tools = [
    { slug: 'baht-text', name: 'แปลงตัวเลขเป็นคำอ่านภาษาไทย' },
    { slug: 'age-days', name: 'คำนวณอายุ' },
  ];

  it('เรียงตามที่ server ส่งมา ข้ามเครื่องมือที่ปลดระวาง และนำออกได้', async () => {
    fakeServer(['retired-tool', 'age-days', 'baht-text']);
    __setPlanForTests({ status: 'signedIn', user });
    render(<FavoritesList tools={tools} />);
    const links = await screen.findAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/tools/age-days', '/tools/baht-text']);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'นำออก: คำนวณอายุ' })));
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(1));
  });

  it('ยังไม่มีรายการ → บอกวิธีเพิ่มพร้อมลิงก์ไปหน้าเครื่องมือทั้งหมด', async () => {
    fakeServer([]);
    __setPlanForTests({ status: 'signedIn', user });
    render(<FavoritesList tools={tools} />);
    expect(await screen.findByText(/ยังไม่มีรายการโปรด/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'หน้าเครื่องมือทั้งหมด' })).toHaveAttribute('href', '/tools');
  });
});
