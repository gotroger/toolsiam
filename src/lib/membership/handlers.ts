import { PREMIUM_DAYS, PREMIUM_PRICE_SATANG, QR_TTL_MINUTES } from '@/lib/plan-limits';
import { getAccountUrl, getGoogleCallbackPath, getHomeUrl } from '@/lib/routes';
import { createPromptPayCharge, extractCharge, fetchCharge, verifyWebhookSignature } from './beam';
import { isBillingEnabled, isEnabled, type MembershipEnv } from './env';
import {
  base64url,
  cookieDomain,
  empty,
  isTrustedOrigin,
  json,
  parseCookies,
  randomToken,
  readBody,
  redirect,
  safeNext,
  serializeCookie,
} from './guards';
import { buildAuthUrl, exchangeCode, parseIdToken, pkcePair } from './google';
import { expiringSoon, planOf } from './plan';
import { createSession, deleteSession, readSession, sessionCookies, type Session } from './session';
import type { MembershipStore } from './store';

/**
 * handler ของทุก API สมาชิก — รับ Request คืน Response ไม่แตะ `cloudflare:workers`
 * ไฟล์ใน src/pages/api/** เป็น shim ที่ส่ง binding เข้ามาเท่านั้น (แบบ /api/lottery/latest)
 */
export interface Deps {
  store?: MembershipStore;
  kv?: KVNamespace;
  /** unix seconds */
  now?: () => number;
  random?: (n: number) => Uint8Array;
  fetchImpl?: typeof fetch;
  /** id ของ user/payment — เทสต์ส่งค่าคงที่ */
  newId?: () => string;
}

const OAUTH_COOKIE = 'oauth';
interface OauthCookie {
  state?: unknown;
  verifier?: unknown;
  next?: unknown;
}
const OAUTH_TTL = 600;
const WEBHOOK_MAX_BYTES = 64 * 1024;

const nowSec = () => Math.floor(Date.now() / 1000);

function ready(env: MembershipEnv, deps: Deps): deps is Deps & { store: MembershipStore; kv: KVNamespace } {
  return isEnabled(env) && !!deps.store && !!deps.kv;
}

function siteOrigin(env: MembershipEnv, request: Request): string {
  return env.SITE_ORIGIN?.replace(/\/$/, '') || new URL(request.url).origin;
}

/** `GET /api/me` */
export async function handleMe(request: Request, env: MembershipEnv, deps: Deps): Promise<Response> {
  if (!ready(env, deps)) return empty(204);
  const now = (deps.now ?? nowSec)();
  const session = await readSession(deps.kv, request.headers.get('cookie'));
  const domain = cookieDomain(request.url);
  if (!session) return signedOut(request, domain);
  const user = await deps.store.getUser(session.userId);
  if (!user) return signedOut(request, domain);
  const expiresAt = await deps.store.getExpiresAt(user.id);
  return json(200, {
    user: { displayName: user.displayName, email: user.email, avatarUrl: user.avatarUrl },
    plan: planOf(expiresAt, now),
    premiumUntil: expiresAt,
    expiringSoon: expiringSoon(expiresAt, now),
  });
}

/** 401 พร้อมลบ cookie ค้าง — hint `ts_m` ที่เหลืออยู่จะทำให้ทุกหน้ายิง /api/me ฟรี ๆ */
function signedOut(request: Request, domain?: string): Response {
  const hasCookie = !!parseCookies(request.headers.get('cookie')).ts_m;
  const headers = new Headers();
  if (hasCookie) for (const c of sessionCookies(null, domain)) headers.append('Set-Cookie', c);
  return empty(401, headers);
}

/** `GET /api/auth/google/start?next=` */
export async function handleStart(request: Request, env: MembershipEnv, deps: Deps): Promise<Response> {
  if (!ready(env, deps)) return empty(204);
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'));
  const state = randomToken(16, deps.random);
  const { verifier, challenge } = await pkcePair(deps.random);
  const authUrl = buildAuthUrl({
    clientId: env.GOOGLE_CLIENT_ID!,
    redirectUri: siteOrigin(env, request) + getGoogleCallbackPath(),
    state,
    codeChallenge: challenge,
  });
  // state + verifier + next อยู่ใน cookie ไม่ใช่ KV — KV อาจยังไม่ propagate ตอน Google redirect กลับมา
  const payload = base64url.encodeText(JSON.stringify({ state, verifier, next }));
  const cookie = serializeCookie(OAUTH_COOKIE, payload, { maxAge: OAUTH_TTL, httpOnly: true, path: '/api/auth' });
  return redirect(302, authUrl, [cookie]);
}

/** `GET /api/auth/google/callback?code&state` */
export async function handleCallback(request: Request, env: MembershipEnv, deps: Deps): Promise<Response> {
  if (!ready(env, deps)) return empty(204);
  const url = new URL(request.url);
  const clearOauth = serializeCookie(OAUTH_COOKIE, '', { maxAge: 0, httpOnly: true, path: '/api/auth' });
  const raw = parseCookies(request.headers.get('cookie'))[OAUTH_COOKIE];
  let saved: OauthCookie | null = null;
  try {
    saved = raw ? (JSON.parse(base64url.decodeText(raw)) as OauthCookie) : null;
  } catch {
    saved = null;
  }
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  if (!saved || !state || !code || saved.state !== state || typeof saved.verifier !== 'string') {
    return new Response('การเข้าสู่ระบบไม่ถูกต้องหรือหมดเวลา กรุณาลองใหม่', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Set-Cookie': clearOauth },
    });
  }
  const next = safeNext(typeof saved.next === 'string' ? saved.next : null);
  const now = (deps.now ?? nowSec)();
  const domain = cookieDomain(request.url);
  try {
    const idToken = await exchangeCode({
      code,
      verifier: saved.verifier,
      redirectUri: siteOrigin(env, request) + getGoogleCallbackPath(),
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
      fetchImpl: deps.fetchImpl,
    });
    const profile = parseIdToken(idToken, { clientId: env.GOOGLE_CLIENT_ID!, now });
    const user = await deps.store.upsertUserFromGoogle(
      { googleSub: profile.sub, email: profile.email, displayName: profile.name, avatarUrl: profile.picture },
      now,
      deps.newId ?? (() => randomToken(16, deps.random)),
    );
    const sid = await createSession(deps.kv, user.id, now, deps.random);
    return redirect(303, next, [...sessionCookies(sid, domain), clearOauth]);
  } catch (e) {
    console.error('[membership] google callback ล้มเหลว:', (e as Error).message);
    return redirect(303, `${getAccountUrl()}?error=google`, [clearOauth]);
  }
}

/** `POST /api/auth/logout` — ฟอร์ม POST ธรรมดา ทำงานได้โดยไม่ต้องมี JS */
export async function handleLogout(request: Request, env: MembershipEnv, deps: Deps): Promise<Response> {
  if (!isTrustedOrigin(request.headers.get('origin'), env.SITE_ORIGIN)) return empty(403);
  const domain = cookieDomain(request.url);
  if (deps.kv) {
    const session = await readSession(deps.kv, request.headers.get('cookie'));
    if (session) await deleteSession(deps.kv, session.sid);
  }
  return redirect(303, getHomeUrl(), sessionCookies(null, domain));
}

async function requireSession(request: Request, deps: Deps & { kv: KVNamespace }): Promise<Session | null> {
  return readSession(deps.kv, request.headers.get('cookie'));
}

/** `POST /api/billing/checkout` — สร้าง (หรือใช้ซ้ำ) รายการ pending แล้วคืน QR */
export async function handleCheckout(request: Request, env: MembershipEnv, deps: Deps): Promise<Response> {
  if (!ready(env, deps) || !isBillingEnabled(env)) return empty(204);
  if (!isTrustedOrigin(request.headers.get('origin'), env.SITE_ORIGIN)) return empty(403);
  const session = await requireSession(request, deps);
  if (!session) return empty(401);
  const now = (deps.now ?? nowSec)();

  const existing = await deps.store.latestPendingPayment(session.userId, now);
  if (existing?.qrImage) return json(200, present(existing));

  const paymentId = (deps.newId ?? (() => randomToken(16, deps.random)))();
  const qrExpiresAt = now + QR_TTL_MINUTES * 60;
  await deps.store.createPayment({
    id: paymentId,
    userId: session.userId,
    amountSatang: PREMIUM_PRICE_SATANG,
    beamChargeId: null,
    qrExpiresAt,
    qrImage: null,
    qrRaw: null,
    createdAt: now,
  });
  try {
    const charge = await createPromptPayCharge({
      creds: { baseUrl: env.BEAM_API_BASE_URL!, merchantId: env.BEAM_MERCHANT_ID!, apiKey: env.BEAM_API_KEY! },
      paymentId,
      amountSatang: PREMIUM_PRICE_SATANG,
      expiryTime: new Date(qrExpiresAt * 1000).toISOString(),
      returnUrl: siteOrigin(env, request) + getAccountUrl(),
      fetchImpl: deps.fetchImpl,
    });
    await deps.store.attachCharge(paymentId, {
      beamChargeId: charge.chargeId,
      qrImage: charge.imageBase64,
      qrRaw: charge.rawData,
      qrExpiresAt,
    });
    return json(200, {
      paymentId,
      imageBase64: charge.imageBase64,
      rawData: charge.rawData,
      expiresAt: qrExpiresAt,
      amountSatang: PREMIUM_PRICE_SATANG,
    });
  } catch (e) {
    console.error('[membership] beam checkout ล้มเหลว:', (e as Error).message);
    // รายการที่สร้าง QR ไม่สำเร็จไม่ควรค้างเป็น pending ให้ถูกหยิบมาใช้ซ้ำ
    await deps.store.expirePayment(paymentId);
    return json(502, { error: 'สร้าง QR ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
  }
}

function present(p: {
  id: string;
  qrImage: string | null;
  qrRaw: string | null;
  qrExpiresAt: number;
  amountSatang: number;
}) {
  return {
    paymentId: p.id,
    imageBase64: p.qrImage,
    rawData: p.qrRaw ?? '',
    expiresAt: p.qrExpiresAt,
    amountSatang: p.amountSatang,
  };
}

/** `GET /api/billing/status?ref=` — DB เป็นความจริง; QR ที่เลยเวลาถูกปิดตรงนี้ (Beam ไม่ส่ง event เมื่อหมดอายุ) */
export async function handleStatus(request: Request, env: MembershipEnv, deps: Deps): Promise<Response> {
  if (!ready(env, deps) || !isBillingEnabled(env)) return empty(204);
  const session = await requireSession(request, deps);
  if (!session) return empty(401);
  const ref = new URL(request.url).searchParams.get('ref') ?? '';
  const payment = ref ? await deps.store.getPayment(ref) : null;
  if (!payment || payment.userId !== session.userId) return empty(404);
  const now = (deps.now ?? nowSec)();
  let status = payment.status;
  if (status === 'pending' && (await confirmedByBeam(payment, env, deps, now))) status = 'paid';
  if (status === 'pending' && now > payment.qrExpiresAt) {
    await deps.store.expirePayment(payment.id);
    status = 'expired';
  }
  return json(200, { status, premiumUntil: await deps.store.getExpiresAt(session.userId) });
}

const BEAM_CHECK_AFTER = 20;
const BEAM_CHECK_EVERY = 60;

/**
 * ทางสำรองเมื่อ webhook ไม่มา (Beam เลิก retry หลัง 10 ครั้ง) — ถาม Beam ตรง ๆ ว่ารายการนี้จ่ายแล้วหรือยัง
 *
 * หน้าบัญชี poll status ทุกไม่กี่วินาที จึงต้องคุมไม่ให้ยิง Beam ตาม: รอ 20 วินาทีแรกให้ webhook มาก่อน
 * แล้วถามไม่เกินครั้งเดียวต่อ 60 วินาทีต่อรายการ (60 = TTL ต่ำสุดของ KV)
 * ให้สิทธิ์ผ่าน settlePayment ตัวเดียวกับ webhook จึง idempotent — webhook มาทีหลังวันก็ไม่เพิ่ม
 */
async function confirmedByBeam(
  payment: { id: string; beamChargeId: string | null; amountSatang: number; createdAt: number },
  env: MembershipEnv,
  deps: Deps & { store: MembershipStore; kv: KVNamespace },
  now: number,
): Promise<boolean> {
  if (!payment.beamChargeId || now - payment.createdAt < BEAM_CHECK_AFTER) return false;
  const throttleKey = `beamcheck:${payment.id}`;
  if (await deps.kv.get(throttleKey)) return false;
  await deps.kv.put(throttleKey, '1', { expirationTtl: BEAM_CHECK_EVERY });
  try {
    const charge = await fetchCharge({
      creds: { baseUrl: env.BEAM_API_BASE_URL!, merchantId: env.BEAM_MERCHANT_ID!, apiKey: env.BEAM_API_KEY! },
      chargeId: payment.beamChargeId,
      fetchImpl: deps.fetchImpl,
    });
    if (charge.status !== 'SUCCEEDED') return false;
    // ตรวจเฉพาะช่องที่ Beam ส่งมา — charge id ได้จากตอนเราสร้างรายการนี้เอง สองช่องนี้เป็นชั้นกันเสริม
    const mismatch =
      (charge.referenceId !== null && charge.referenceId !== payment.id) ||
      (charge.amount !== null && charge.amount !== payment.amountSatang);
    if (mismatch) {
      console.warn('[membership] Beam ยืนยัน charge ที่ไม่ตรงกับรายการ:', payment.id);
      return false;
    }
    console.warn('[membership] ให้สิทธิ์จากการถาม Beam เอง (webhook ไม่มา):', payment.id);
    await deps.store.settlePayment(payment.id, {
      beamChargeId: payment.beamChargeId,
      rawWebhookJson: charge.rawJson,
      now,
      days: PREMIUM_DAYS,
    });
    return true;
  } catch (e) {
    console.warn('[membership] ถามสถานะจาก Beam ไม่สำเร็จ:', (e as Error).message);
    return false;
  }
}

/**
 * `GET /api/billing/history` — ประวัติการชำระเงินของผู้ใช้เอง
 *
 * แยกจาก `/api/me` โดยตั้งใจ: `/api/me` ถูกเรียกทุกหน้าที่ล็อกอินอยู่ จึงไม่ควรโตตามจำนวนรายการ
 * ส่งออกเฉพาะสามช่องที่เจ้าของบัญชีต้องใช้ — ไม่ส่ง beamChargeId / rawWebhookJson / qrImage ออกนอก server
 */
export const HISTORY_LIMIT = 10;

export async function handleHistory(request: Request, env: MembershipEnv, deps: Deps): Promise<Response> {
  if (!ready(env, deps)) return empty(204);
  const session = await requireSession(request, deps);
  if (!session) return empty(401);
  const payments = await deps.store.listPayments(session.userId, HISTORY_LIMIT);
  return json(200, {
    payments: payments.map((p) => ({ createdAt: p.createdAt, amountSatang: p.amountSatang, status: p.status })),
  });
}

/** `POST /api/billing/webhook` — ไม่มี cookie ไม่มี Origin ใช้ HMAC เท่านั้น */
export async function handleWebhook(request: Request, env: MembershipEnv, deps: Deps): Promise<Response> {
  if (!ready(env, deps) || !isBillingEnabled(env)) return empty(204);
  const rawBody = await readBody(request, WEBHOOK_MAX_BYTES);
  if (rawBody === null) return empty(413);
  const ok = await verifyWebhookSignature(
    rawBody,
    request.headers.get('x-beam-signature'),
    env.BEAM_WEBHOOK_HMAC_SECRET!,
  );
  if (!ok) return empty(401);
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return empty(400);
  }
  if (payload.merchantId !== undefined && payload.merchantId !== env.BEAM_MERCHANT_ID) return empty(401);

  const event = request.headers.get('x-beam-event') ?? (typeof payload.type === 'string' ? payload.type : '');
  const charge = extractCharge(payload);
  const succeeded = event === 'charge.succeeded' || charge.status?.toUpperCase() === 'SUCCEEDED';
  if (!succeeded) return json(200, { ok: true, ignored: true });

  const payment =
    (charge.id ? await deps.store.findPaymentByChargeId(charge.id) : null) ??
    (charge.referenceId ? await deps.store.getPayment(charge.referenceId) : null);
  // ไม่รู้จักรายการนี้ — ตอบ 200 ให้ Beam เลิก retry แต่ log ไว้ให้คนมาดู
  if (!payment) {
    console.warn('[membership] webhook ถึงรายการที่ไม่รู้จัก:', charge);
    return json(200, { ok: true, ignored: true });
  }
  // จ่ายหลัง QR หมดอายุ (นาฬิกาเราปิดรายการไปก่อนเงินจะมาถึง) — ยังให้สิทธิ์ แต่ต้องรู้ว่าเกิดบ่อยแค่ไหน
  if (payment.status === 'expired') {
    console.warn('[membership] เงินมาถึงหลังปิดรายการ ยังให้สิทธิ์ตามปกติ:', payment.id);
  }
  const result = await deps.store.settlePayment(payment.id, {
    // null ไม่ใช่ '' — beam_charge_id มี UNIQUE index รายการที่ไม่รู้ charge id สองรายการจึงชนกันไม่ได้
    beamChargeId: charge.id ?? payment.beamChargeId,
    rawWebhookJson: rawBody,
    now: (deps.now ?? nowSec)(),
    days: PREMIUM_DAYS,
  });
  return json(200, { ok: true, applied: result.applied });
}
