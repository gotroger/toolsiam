import { base64url, randomToken } from './guards';

/**
 * Google OIDC authorization code flow + PKCE — ไม่ใช้ SDK ไม่ใช้ jose
 *
 * id_token ถูกส่งกลับมาจาก token endpoint ของ Google โดยตรงผ่าน TLS Google ระบุว่ากรณีนี้
 * ไม่จำเป็นต้องตรวจลายเซ็น แต่เรายังตรวจ iss / aud / exp / email_verified ทุกครั้ง
 */
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

export async function pkcePair(random?: (n: number) => Uint8Array): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomToken(32, random);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64url.encode(new Uint8Array(digest)) };
}

export function buildAuthUrl(p: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', p.clientId);
  url.searchParams.set('redirect_uri', p.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', p.state);
  url.searchParams.set('code_challenge', p.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

export async function exchangeCode(p: {
  code: string;
  verifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const body = new URLSearchParams({
    code: p.code,
    client_id: p.clientId,
    client_secret: p.clientSecret,
    redirect_uri: p.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: p.verifier,
  });
  const res = await (p.fetchImpl ?? fetch)(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Google token endpoint ตอบ ${res.status}`);
  const data = (await res.json()) as { id_token?: unknown };
  if (typeof data.id_token !== 'string') throw new Error('Google ไม่ส่ง id_token กลับมา');
  return data.id_token;
}

/** ตรวจ claim ที่จำเป็นแล้วคืนโปรไฟล์ — โยน Error เมื่อไม่ผ่านข้อใดข้อหนึ่ง */
export function parseIdToken(idToken: string, opts: { clientId: string; now: number }): GoogleProfile {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('id_token ไม่ใช่ JWT');
  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(base64url.decodeText(parts[1])) as Record<string, unknown>;
  } catch {
    throw new Error('อ่าน payload ของ id_token ไม่ได้');
  }
  if (!ISSUERS.has(String(claims.iss))) throw new Error('iss ไม่ใช่ Google');
  const aud = claims.aud;
  const audOk = Array.isArray(aud) ? aud.includes(opts.clientId) : aud === opts.clientId;
  if (!audOk) throw new Error('aud ไม่ตรง client id');
  if (typeof claims.exp !== 'number' || claims.exp <= opts.now) throw new Error('id_token หมดอายุ');
  if (typeof claims.sub !== 'string' || !claims.sub) throw new Error('ไม่มี sub');
  if (typeof claims.email !== 'string' || claims.email_verified !== true) throw new Error('อีเมลยังไม่ยืนยัน');
  return {
    sub: claims.sub,
    email: claims.email,
    name: typeof claims.name === 'string' && claims.name ? claims.name : claims.email.split('@')[0],
    picture: typeof claims.picture === 'string' ? claims.picture : null,
  };
}
