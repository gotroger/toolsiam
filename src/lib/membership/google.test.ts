import { describe, it, expect, vi } from 'vitest';
import { buildAuthUrl, exchangeCode, GOOGLE_TOKEN_URL, parseIdToken, pkcePair } from './google';
import { base64url } from './guards';

const CLIENT = 'abc.apps.googleusercontent.com';
const now = 1_800_000_000;

function jwt(claims: Record<string, unknown>) {
  return `${base64url.encodeText('{"alg":"RS256"}')}.${base64url.encodeText(JSON.stringify(claims))}.sig`;
}
const good = {
  iss: 'https://accounts.google.com',
  aud: CLIENT,
  exp: now + 3600,
  sub: '1234567890',
  email: 'somchai@example.com',
  email_verified: true,
  name: 'สมชาย ใจดี',
  picture: 'https://lh3.example/p.jpg',
};

describe('pkcePair / buildAuthUrl', () => {
  it('challenge = base64url(SHA-256(verifier)) และ URL มีพารามิเตอร์ครบ', async () => {
    const { verifier, challenge } = await pkcePair((n) => new Uint8Array(n).fill(1));
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    expect(challenge).toBe(base64url.encode(digest));

    const url = new URL(
      buildAuthUrl({
        clientId: CLIENT,
        redirectUri: 'https://toolsiam.com/api/auth/google/callback',
        state: 's1',
        codeChallenge: challenge,
      }),
    );
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe(CLIENT);
    expect(url.searchParams.get('redirect_uri')).toBe('https://toolsiam.com/api/auth/google/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('state')).toBe('s1');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('prompt')).toBe('select_account');
  });
});

describe('exchangeCode', () => {
  it('POST form ไป token endpoint และคืน id_token', async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe(GOOGLE_TOKEN_URL);
      const body = init?.body as URLSearchParams;
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('code_verifier')).toBe('v');
      expect(body.get('code')).toBe('c');
      return new Response(JSON.stringify({ id_token: 'x.y.z' }));
    }) as unknown as typeof fetch;
    expect(
      await exchangeCode({
        code: 'c',
        verifier: 'v',
        redirectUri: 'r',
        clientId: CLIENT,
        clientSecret: 's',
        fetchImpl,
      }),
    ).toBe('x.y.z');
  });
  it('Google ตอบไม่ ok หรือไม่มี id_token → โยน', async () => {
    const bad = (async () => new Response('nope', { status: 400 })) as unknown as typeof fetch;
    await expect(
      exchangeCode({ code: 'c', verifier: 'v', redirectUri: 'r', clientId: CLIENT, clientSecret: 's', fetchImpl: bad }),
    ).rejects.toThrow('400');
    const empty = (async () => new Response('{}')) as unknown as typeof fetch;
    await expect(
      exchangeCode({
        code: 'c',
        verifier: 'v',
        redirectUri: 'r',
        clientId: CLIENT,
        clientSecret: 's',
        fetchImpl: empty,
      }),
    ).rejects.toThrow('id_token');
  });
});

describe('parseIdToken', () => {
  it('token ที่ถูกต้องคืนโปรไฟล์', () => {
    expect(parseIdToken(jwt(good), { clientId: CLIENT, now })).toEqual({
      sub: '1234567890',
      email: 'somchai@example.com',
      name: 'สมชาย ใจดี',
      picture: 'https://lh3.example/p.jpg',
    });
  });
  it('รับ iss แบบไม่มี https และ aud แบบ array · ไม่มีชื่อใช้ส่วนหน้าอีเมล', () => {
    const p = parseIdToken(
      jwt({ ...good, iss: 'accounts.google.com', aud: [CLIENT, 'x'], name: undefined, picture: 1 }),
      {
        clientId: CLIENT,
        now,
      },
    );
    expect(p.name).toBe('somchai');
    expect(p.picture).toBeNull();
  });
  it.each([
    ['iss ผิด', { iss: 'https://evil.example' }],
    ['aud ผิด', { aud: 'other' }],
    ['หมดอายุ', { exp: now }],
    ['อีเมลไม่ยืนยัน', { email_verified: false }],
    ['ไม่มี sub', { sub: '' }],
  ])('ปฏิเสธ: %s', (_, override) => {
    expect(() => parseIdToken(jwt({ ...good, ...override }), { clientId: CLIENT, now })).toThrow();
  });
  it('ไม่ใช่ JWT หรือ payload พัง → โยน', () => {
    expect(() => parseIdToken('abc', { clientId: CLIENT, now })).toThrow();
    expect(() => parseIdToken('a.!!!.c', { clientId: CLIENT, now })).toThrow();
  });
});
