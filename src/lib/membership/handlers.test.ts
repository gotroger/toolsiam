import { describe, it, expect, vi } from 'vitest';
import {
  handleCallback,
  handleCheckout,
  handleHistory,
  handleLogout,
  handleMe,
  handleStart,
  handleStatus,
  handleWebhook,
  HISTORY_LIMIT,
  type Deps,
} from './handlers';
import type { MembershipEnv } from './env';
import { memoryStore } from './memory-store';
import { fakeKv } from './session.test';
import { createSession } from './session';
import { base64url } from './guards';
import { signWebhook } from './beam';
import { DAY } from './plan';
import { PREMIUM_PRICE_SATANG, QR_TTL_MINUTES } from '@/lib/plan-limits';

const NOW = 1_800_000_000;
const CLIENT = 'cid.apps.googleusercontent.com';
const SECRET = btoa('hmac-secret');
const SITE = 'https://toolsiam.com';

function fullEnv(overrides: Partial<MembershipEnv> = {}): MembershipEnv {
  return {
    DB: {} as D1Database,
    MEMBER_SESSION: {} as KVNamespace,
    MEMBERSHIP: 'on',
    SITE_ORIGIN: SITE,
    GOOGLE_CLIENT_ID: CLIENT,
    GOOGLE_CLIENT_SECRET: 'gs',
    BEAM_API_BASE_URL: 'https://playground.api.beamcheckout.com',
    BEAM_MERCHANT_ID: 'm1',
    BEAM_API_KEY: 'k1',
    BEAM_WEBHOOK_HMAC_SECRET: SECRET,
    ...overrides,
  };
}

function setup() {
  const store = memoryStore();
  const kv = fakeKv();
  let n = 0;
  const deps: Deps = {
    store,
    kv,
    now: () => NOW,
    random: (len) => new Uint8Array(len).fill(9),
    newId: () => `id${++n}`,
  };
  return { store, kv, deps };
}

async function signedIn(d: ReturnType<typeof setup>) {
  const user = await d.store.upsertUserFromGoogle(
    { googleSub: 'g1', email: 'a@b.c', displayName: 'A', avatarUrl: null },
    NOW,
    () => 'u1',
  );
  const sid = await createSession(d.kv, user.id, NOW);
  return { user, sid, cookie: `sid=${sid}; ts_m=1` };
}

const get = (path: string, headers: Record<string, string> = {}) => new Request(`${SITE}${path}`, { headers });
const post = (path: string, headers: Record<string, string> = {}, body?: string) =>
  new Request(`${SITE}${path}`, { method: 'POST', headers, body });

describe('kill switch และ binding', () => {
  it('ทุก handler ตอบ 204 เมื่อ MEMBERSHIP ไม่ใช่ on หรือขาด binding', async () => {
    const { deps } = setup();
    for (const env of [
      fullEnv({ MEMBERSHIP: 'off' }),
      fullEnv({ DB: undefined }),
      fullEnv({ GOOGLE_CLIENT_SECRET: undefined }),
    ]) {
      expect((await handleMe(get('/api/me'), env, deps)).status).toBe(204);
      expect((await handleStart(get('/api/auth/google/start'), env, deps)).status).toBe(204);
      expect((await handleCallback(get('/api/auth/google/callback'), env, deps)).status).toBe(204);
      expect((await handleCheckout(post('/api/billing/checkout', { origin: SITE }), env, deps)).status).toBe(204);
      expect((await handleStatus(get('/api/billing/status?ref=x'), env, deps)).status).toBe(204);
      expect((await handleWebhook(post('/api/billing/webhook', {}, '{}'), env, deps)).status).toBe(204);
    }
    // billing ปิดแยกจาก login ได้
    const noBeam = fullEnv({ BEAM_API_KEY: undefined });
    expect((await handleCheckout(post('/api/billing/checkout', { origin: SITE }), noBeam, deps)).status).toBe(204);
    expect((await handleMe(get('/api/me'), noBeam, deps)).status).toBe(401);
  });
});

describe('GET /api/me', () => {
  it('ไม่มี session → 401 และล้าง hint cookie ที่ค้าง', async () => {
    const { deps } = setup();
    const res = await handleMe(get('/api/me', { cookie: 'ts_m=1; sid=stale-AAAAAAAAAAAAAAAAAAAAAA' }), fullEnv(), deps);
    expect(res.status).toBe(401);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c) => c.startsWith('ts_m=;') && c.includes('Max-Age=0'))).toBe(true);
    expect(cookies.some((c) => c.includes('Domain=toolsiam.com'))).toBe(true);
    // ไม่มี cookie เลย → 401 เงียบ ๆ ไม่ต้อง Set-Cookie
    expect((await handleMe(get('/api/me'), fullEnv(), deps)).headers.getSetCookie()).toEqual([]);
  });

  it('มี session → โปรไฟล์ + แพลน + เตือนใกล้หมดอายุ', async () => {
    const d = setup();
    const { cookie, user } = await signedIn(d);
    let body = await (await handleMe(get('/api/me', { cookie }), fullEnv(), d.deps)).json();
    expect(body).toEqual({
      user: { displayName: 'A', email: 'a@b.c', avatarUrl: null },
      plan: 'free',
      premiumUntil: null,
      expiringSoon: false,
    });
    d.store.expiry.set(user.id, NOW + 2 * DAY);
    body = await (await handleMe(get('/api/me', { cookie }), fullEnv(), d.deps)).json();
    expect(body).toMatchObject({ plan: 'premium', premiumUntil: NOW + 2 * DAY, expiringSoon: true });
  });
});

describe('Google OAuth', () => {
  it('start: 302 ไป Google พร้อม cookie oauth ที่เก็บ state/verifier/next (ไม่แตะ KV)', async () => {
    const { deps, kv } = setup();
    const res = await handleStart(get('/api/auth/google/start?next=%2Ftools%2Fpdf-merge'), fullEnv(), deps);
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('location')!);
    expect(location.hostname).toBe('accounts.google.com');
    expect(location.searchParams.get('redirect_uri')).toBe(`${SITE}/api/auth/google/callback`);
    const cookie = res.headers.getSetCookie()[0];
    expect(cookie).toMatch(/^oauth=.*HttpOnly/);
    expect(cookie).toContain('Path=/api/auth');
    const saved = JSON.parse(base64url.decodeText(cookie.split(';')[0].slice('oauth='.length)));
    expect(saved.state).toBe(location.searchParams.get('state'));
    expect(saved.next).toBe('/tools/pdf-merge');
    expect(typeof saved.verifier).toBe('string');
    expect(kv.store.size).toBe(0);
  });

  it('start: next ที่ไม่ปลอดภัยกลายเป็น / · ไม่มี SITE_ORIGIN ใช้ origin ของ request', async () => {
    const { deps } = setup();
    const res = await handleStart(
      new Request('http://localhost:4321/api/auth/google/start?next=https://evil.com'),
      fullEnv({ SITE_ORIGIN: undefined }),
      deps,
    );
    const location = new URL(res.headers.get('location')!);
    expect(location.searchParams.get('redirect_uri')).toBe('http://localhost:4321/api/auth/google/callback');
    const cookie = res.headers.getSetCookie()[0];
    expect(JSON.parse(base64url.decodeText(cookie.split(';')[0].slice('oauth='.length))).next).toBe('/');
  });

  async function startThen(d: ReturnType<typeof setup>, next = '/account') {
    const res = await handleStart(get(`/api/auth/google/start?next=${encodeURIComponent(next)}`), fullEnv(), d.deps);
    const cookie = res.headers.getSetCookie()[0].split(';')[0];
    const state = new URL(res.headers.get('location')!).searchParams.get('state')!;
    return { cookie, state };
  }

  function idToken(claims: Record<string, unknown> = {}) {
    const payload = {
      iss: 'https://accounts.google.com',
      aud: CLIENT,
      exp: NOW + 60,
      sub: 'g-sub-1',
      email: 'somchai@example.com',
      email_verified: true,
      name: 'สมชาย',
      picture: 'https://p/x.jpg',
      ...claims,
    };
    return `h.${base64url.encodeText(JSON.stringify(payload))}.s`;
  }

  it('callback: state ตรง → แลก code, สร้าง user + session, 303 ไป next พร้อม cookie ครบ', async () => {
    const d = setup();
    const { cookie, state } = await startThen(d, '/tools/pdf-merge');
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ id_token: idToken() })),
    ) as unknown as typeof fetch;
    const res = await handleCallback(get(`/api/auth/google/callback?code=c1&state=${state}`, { cookie }), fullEnv(), {
      ...d.deps,
      fetchImpl,
    });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/tools/pdf-merge');
    const cookies = res.headers.getSetCookie();
    expect(cookies.find((c) => c.startsWith('sid='))).toContain('HttpOnly');
    expect(cookies.find((c) => c.startsWith('ts_m=1'))).toBeDefined();
    expect(cookies.find((c) => c.startsWith('oauth='))).toContain('Max-Age=0');
    const user = [...d.store.users.values()][0];
    expect(user).toMatchObject({ googleSub: 'g-sub-1', email: 'somchai@example.com', displayName: 'สมชาย' });
    expect(d.kv.store.size).toBe(1);
    // session ที่ได้ใช้กับ /api/me ได้ทันที
    const sid = cookies.find((c) => c.startsWith('sid='))!.split(';')[0];
    expect((await handleMe(get('/api/me', { cookie: sid }), fullEnv(), d.deps)).status).toBe(200);
  });

  it('callback: state ไม่ตรง / ไม่มี cookie / cookie พัง → 400 และล้าง cookie oauth', async () => {
    const d = setup();
    const { cookie } = await startThen(d);
    for (const req of [
      get('/api/auth/google/callback?code=c&state=wrong', { cookie }),
      get('/api/auth/google/callback?code=c&state=x'),
      get('/api/auth/google/callback?code=c&state=x', { cookie: 'oauth=!!!' }),
    ]) {
      const res = await handleCallback(req, fullEnv(), d.deps);
      expect(res.status).toBe(400);
      expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
    }
    expect(d.store.users.size).toBe(0);
  });

  it('callback: Google ล้มเหลวหรือ token ไม่ผ่าน → 303 ไป /account?error=google ไม่สร้าง session', async () => {
    const d = setup();
    const { cookie, state } = await startThen(d);
    const failing = (async () => new Response('x', { status: 500 })) as unknown as typeof fetch;
    let res = await handleCallback(get(`/api/auth/google/callback?code=c&state=${state}`, { cookie }), fullEnv(), {
      ...d.deps,
      fetchImpl: failing,
    });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/account?error=google');
    const unverified = (async () =>
      new Response(JSON.stringify({ id_token: idToken({ email_verified: false }) }))) as unknown as typeof fetch;
    res = await handleCallback(get(`/api/auth/google/callback?code=c&state=${state}`, { cookie }), fullEnv(), {
      ...d.deps,
      fetchImpl: unverified,
    });
    expect(res.headers.get('location')).toBe('/account?error=google');
    expect(d.kv.store.size).toBe(0);
  });

  it('logout: ต้องมี Origin ที่เชื่อถือได้ · ลบ session ใน KV · ทำงานแม้ระบบปิดอยู่', async () => {
    const d = setup();
    const { cookie } = await signedIn(d);
    expect((await handleLogout(post('/api/auth/logout', { cookie }), fullEnv(), d.deps)).status).toBe(403);
    expect(
      (await handleLogout(post('/api/auth/logout', { cookie, origin: 'https://evil.com' }), fullEnv(), d.deps)).status,
    ).toBe(403);
    const res = await handleLogout(
      post('/api/auth/logout', { cookie, origin: SITE }),
      fullEnv({ MEMBERSHIP: 'off' }),
      d.deps,
    );
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/');
    expect(res.headers.getSetCookie().every((c) => c.includes('Max-Age=0'))).toBe(true);
    expect(d.kv.store.size).toBe(0);
  });
});

describe('billing', () => {
  const beamOk = () =>
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ chargeId: 'ch_1', encodedImage: { imageBase64Encoded: 'QR', rawData: '00020101' } }),
        ),
    ) as unknown as typeof fetch;

  it('checkout: ต้อง login + Origin · สร้าง payment 1,900 สตางค์ อายุ QR 15 นาที · กดซ้ำได้ QR เดิมโดยไม่เรียก Beam อีก', async () => {
    const d = setup();
    expect((await handleCheckout(post('/api/billing/checkout', { origin: SITE }), fullEnv(), d.deps)).status).toBe(401);
    const { cookie } = await signedIn(d);
    expect((await handleCheckout(post('/api/billing/checkout', { cookie }), fullEnv(), d.deps)).status).toBe(403);

    const fetchImpl = beamOk();
    const deps = { ...d.deps, fetchImpl };
    const res = await handleCheckout(post('/api/billing/checkout', { cookie, origin: SITE }), fullEnv(), deps);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      paymentId: 'id1',
      imageBase64: 'QR',
      rawData: '00020101',
      expiresAt: NOW + QR_TTL_MINUTES * 60,
      amountSatang: PREMIUM_PRICE_SATANG,
    });
    expect(d.store.payments.get('id1')).toMatchObject({ status: 'pending', beamChargeId: 'ch_1', userId: 'u1' });

    const again = (await (
      await handleCheckout(post('/api/billing/checkout', { cookie, origin: SITE }), fullEnv(), deps)
    ).json()) as { paymentId: string };
    expect(again.paymentId).toBe('id1');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('checkout: Beam ล่ม → 502 และรายการนั้นถูกปิดไม่ให้หยิบมาใช้ซ้ำ', async () => {
    const d = setup();
    const { cookie } = await signedIn(d);
    const down = (async () => new Response('', { status: 400 })) as unknown as typeof fetch;
    const res = await handleCheckout(post('/api/billing/checkout', { cookie, origin: SITE }), fullEnv(), {
      ...d.deps,
      fetchImpl: down,
    });
    expect(res.status).toBe(502);
    expect(d.store.payments.get('id1')?.status).toBe('expired');
  });

  it('status: ของคนอื่น → 404 · pending ที่เลยเวลา QR → expired', async () => {
    const d = setup();
    const { cookie, user } = await signedIn(d);
    await d.store.createPayment({
      id: 'p1',
      userId: user.id,
      amountSatang: 1900,
      beamChargeId: null,
      qrExpiresAt: NOW + 10,
      qrImage: 'q',
      qrRaw: '',
      createdAt: NOW,
    });
    await d.store.createPayment({
      id: 'p2',
      userId: 'someone-else',
      amountSatang: 1900,
      beamChargeId: null,
      qrExpiresAt: NOW + 10,
      qrImage: 'q',
      qrRaw: '',
      createdAt: NOW,
    });
    expect((await handleStatus(get('/api/billing/status?ref=p1'), fullEnv(), d.deps)).status).toBe(401);
    expect((await handleStatus(get('/api/billing/status?ref=p2', { cookie }), fullEnv(), d.deps)).status).toBe(404);
    expect((await handleStatus(get('/api/billing/status', { cookie }), fullEnv(), d.deps)).status).toBe(404);
    let body = (await (
      await handleStatus(get('/api/billing/status?ref=p1', { cookie }), fullEnv(), d.deps)
    ).json()) as { status: string };
    expect(body).toEqual({ status: 'pending', premiumUntil: null });
    body = (await (
      await handleStatus(get('/api/billing/status?ref=p1', { cookie }), fullEnv(), { ...d.deps, now: () => NOW + 11 })
    ).json()) as { status: string };
    expect(body.status).toBe('expired');
    expect(d.store.payments.get('p1')?.status).toBe('expired');
  });

  async function webhook(
    d: ReturnType<typeof setup>,
    payload: unknown,
    opts: { sign?: boolean; event?: string; now?: number } = {},
  ) {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const headers: Record<string, string> = {};
    if (opts.sign !== false) headers['x-beam-signature'] = await signWebhook(raw, SECRET);
    if (opts.event) headers['x-beam-event'] = opts.event;
    return handleWebhook(post('/api/billing/webhook', headers, raw), fullEnv(), {
      ...d.deps,
      now: () => opts.now ?? NOW,
    });
  }

  it('history: ต้อง login · เห็นเฉพาะของตัวเอง · ส่งออกแค่สามช่อง ไม่มีข้อมูลภายในหลุด', async () => {
    const d = setup();
    expect((await handleHistory(get('/api/billing/history'), fullEnv(), d.deps)).status).toBe(401);
    const { cookie, user } = await signedIn(d);

    // ยังไม่เคยจ่าย → รายการว่าง
    expect(await (await handleHistory(get('/api/billing/history', { cookie }), fullEnv(), d.deps)).json()).toEqual({
      payments: [],
    });

    for (const [i, owner] of [user.id, 'someone-else', user.id].entries()) {
      await d.store.createPayment({
        id: `p${i}`,
        userId: owner,
        amountSatang: 1900,
        beamChargeId: `ch${i}`,
        qrExpiresAt: NOW,
        qrImage: 'ความลับ',
        qrRaw: 'ความลับ',
        createdAt: NOW + i,
      });
    }
    const res = await handleHistory(get('/api/billing/history', { cookie }), fullEnv(), d.deps);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    const body = (await res.json()) as { payments: Record<string, unknown>[] };
    // ของคนอื่นไม่ติดมา และเรียงใหม่ไปเก่า
    expect(body.payments).toEqual([
      { createdAt: NOW + 2, amountSatang: 1900, status: 'pending' },
      { createdAt: NOW, amountSatang: 1900, status: 'pending' },
    ]);
    // ไม่มี field ภายในหลุดออกไป
    expect(JSON.stringify(body)).not.toContain('ความลับ');
    expect(JSON.stringify(body)).not.toContain('ch0');
  });

  it('history: จำกัดจำนวนรายการที่ส่งออก', async () => {
    const d = setup();
    const { cookie, user } = await signedIn(d);
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      await d.store.createPayment({
        id: `p${i}`,
        userId: user.id,
        amountSatang: 1900,
        beamChargeId: null,
        qrExpiresAt: NOW,
        qrImage: null,
        qrRaw: null,
        createdAt: NOW + i,
      });
    }
    const body = (await (await handleHistory(get('/api/billing/history', { cookie }), fullEnv(), d.deps)).json()) as {
      payments: unknown[];
    };
    expect(body.payments).toHaveLength(HISTORY_LIMIT);
  });

  it('webhook: ลายเซ็นผิด → 401 · body ใหญ่เกิน → 413 · JSON พัง → 400 · merchant ไม่ตรง → 401', async () => {
    const d = setup();
    expect((await webhook(d, { a: 1 }, { sign: false })).status).toBe(401);
    expect((await webhook(d, JSON.stringify({ pad: 'x'.repeat(70_000) }))).status).toBe(413);
    expect((await webhook(d, '{bad')).status).toBe(400);
    expect((await webhook(d, { merchantId: 'other', data: { id: 'ch_1' } })).status).toBe(401);
  });

  it('webhook: charge.succeeded → paid + บวก 30 วัน · ซ้ำไม่บวกเพิ่ม · event อื่น/รายการที่ไม่รู้จัก → 200 ignored', async () => {
    const d = setup();
    const { cookie, user } = await signedIn(d);
    await handleCheckout(post('/api/billing/checkout', { cookie, origin: SITE }), fullEnv(), {
      ...d.deps,
      fetchImpl: beamOk(),
    });
    d.store.expiry.set(user.id, NOW + 5 * DAY);

    const other = await webhook(
      d,
      { merchantId: 'm1', data: { id: 'ch_1', status: 'PENDING' } },
      { event: 'charge.created' },
    );
    expect(await other.json()).toEqual({ ok: true, ignored: true });

    const paid = await webhook(
      d,
      { merchantId: 'm1', data: { id: 'ch_1', referenceId: 'id1', status: 'SUCCEEDED' } },
      { event: 'charge.succeeded' },
    );
    expect(await paid.json()).toEqual({ ok: true, applied: true });
    expect(d.store.expiry.get(user.id)).toBe(NOW + 35 * DAY);
    expect(d.store.payments.get('id1')).toMatchObject({ status: 'paid', paidAt: NOW });

    const replay = await webhook(
      d,
      { merchantId: 'm1', data: { id: 'ch_1', status: 'SUCCEEDED' } },
      { now: NOW + 100 },
    );
    expect(await replay.json()).toEqual({ ok: true, applied: false });
    expect(d.store.expiry.get(user.id)).toBe(NOW + 35 * DAY);

    const unknown = await webhook(d, { data: { id: 'ch_zzz', status: 'SUCCEEDED' } });
    expect(await unknown.json()).toEqual({ ok: true, ignored: true });

    // หลังจ่าย status endpoint และ /api/me เห็นผลทันที
    const status = await (await handleStatus(get('/api/billing/status?ref=id1', { cookie }), fullEnv(), d.deps)).json();
    expect(status).toEqual({ status: 'paid', premiumUntil: NOW + 35 * DAY });
  });
});
