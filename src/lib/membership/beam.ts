/**
 * Beam Checkout — QR PromptPay (spec เดิม §6)
 *
 * รูปแบบ request/response อ้างจาก client ของโปรเจกต์ข้างเคียงที่ใช้งานจริง ไม่ใช่เอกสารทางการ
 * ต้อง smoke test กับ playground ก่อนเชื่อ (ดู spec 2026-09-19 §ความเสี่ยง)
 */
export interface BeamCredentials {
  baseUrl: string;
  merchantId: string;
  apiKey: string;
}

export interface PromptPayCharge {
  chargeId: string;
  /** PNG base64 (ไม่มี prefix data:) */
  imageBase64: string;
  /** payload EMVCo สำหรับคัดลอกไปวางในแอปธนาคาร */
  rawData: string;
}

export class BeamError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

export async function createPromptPayCharge(p: {
  creds: BeamCredentials;
  /** ใช้เป็นทั้ง referenceId และ idempotency key — เรียกซ้ำด้วย id เดิม Beam คืน charge เดิม */
  paymentId: string;
  amountSatang: number;
  /** ISO 8601 */
  expiryTime: string;
  returnUrl: string;
  fetchImpl?: typeof fetch;
  /** หน่วงระหว่าง retry (ms) — เทสต์ส่ง 0 */
  retryDelayMs?: number;
}): Promise<PromptPayCharge> {
  const fetchImpl = p.fetchImpl ?? fetch;
  const body = JSON.stringify({
    amount: p.amountSatang,
    currency: 'THB',
    deviceType: 'WEB',
    paymentMethod: { paymentMethodType: 'QR_PROMPT_PAY', qrPromptPay: { expiryTime: p.expiryTime } },
    referenceId: p.paymentId,
    returnUrl: p.returnUrl,
  });
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Basic ${btoa(`${p.creds.merchantId}:${p.creds.apiKey}`)}`,
    'x-beam-idempotency-key': p.paymentId,
  };
  let last: BeamError | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, p.retryDelayMs ?? 500 * attempt));
    let res: Response;
    try {
      res = await fetchImpl(`${p.creds.baseUrl.replace(/\/$/, '')}/api/v1/charges`, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (e) {
      last = new BeamError(`เรียก Beam ไม่สำเร็จ: ${(e as Error).message}`);
      continue;
    }
    if (RETRY_STATUSES.has(res.status)) {
      last = new BeamError(`Beam ตอบ ${res.status}`, res.status);
      continue;
    }
    if (!res.ok) throw new BeamError(`Beam ตอบ ${res.status}`, res.status);
    return parseChargeResponse(await res.json());
  }
  throw last ?? new BeamError('เรียก Beam ไม่สำเร็จ');
}

function parseChargeResponse(data: unknown): PromptPayCharge {
  const d = (data ?? {}) as Record<string, unknown>;
  const chargeId = typeof d.chargeId === 'string' ? d.chargeId : typeof d.id === 'string' ? d.id : null;
  const encoded = (d.encodedImage ?? {}) as Record<string, unknown>;
  const imageBase64 = typeof encoded.imageBase64Encoded === 'string' ? encoded.imageBase64Encoded : null;
  const rawData = typeof encoded.rawData === 'string' ? encoded.rawData : '';
  if (!chargeId || !imageBase64) throw new BeamError('Beam ไม่ส่ง QR กลับมา');
  return { chargeId, imageBase64, rawData };
}

export interface ChargeSnapshot {
  /** `SUCCEEDED` | `FAILED` | `PENDING` ตามเอกสาร Beam — เก็บเป็น string เผื่อ Beam เพิ่มค่าใหม่ */
  status: string | null;
  referenceId: string | null;
  /** สตางค์ */
  amount: number | null;
  rawJson: string;
}

/** `GET /api/v1/charges/{chargeId}` — ใช้ถามสถานะเองเมื่อ webhook ไม่มา ไม่ retry (ผู้เรียก poll ซ้ำอยู่แล้ว) */
export async function fetchCharge(p: {
  creds: BeamCredentials;
  chargeId: string;
  fetchImpl?: typeof fetch;
}): Promise<ChargeSnapshot> {
  const res = await (p.fetchImpl ?? fetch)(
    `${p.creds.baseUrl.replace(/\/$/, '')}/api/v1/charges/${encodeURIComponent(p.chargeId)}`,
    {
      method: 'GET',
      headers: { Authorization: `Basic ${btoa(`${p.creds.merchantId}:${p.creds.apiKey}`)}` },
      signal: AbortSignal.timeout(5_000),
    },
  );
  if (!res.ok) throw new BeamError(`Beam ตอบ ${res.status}`, res.status);
  const rawJson = await res.text();
  const d = JSON.parse(rawJson) as Record<string, unknown>;
  return {
    status: typeof d.status === 'string' ? d.status.toUpperCase() : null,
    referenceId: typeof d.referenceId === 'string' ? d.referenceId : null,
    amount: typeof d.amount === 'number' ? d.amount : null,
    rawJson,
  };
}

/** ตรวจ x-beam-signature = base64(HMAC-SHA256(raw body, base64decode(secret))) แบบ constant-time */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureB64: string | null,
  secretB64: string,
): Promise<boolean> {
  if (!signatureB64) return false;
  let key: CryptoKey;
  let expected: Uint8Array;
  try {
    key = await crypto.subtle.importKey('raw', b64(secretB64), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  } catch {
    return false;
  }
  let given: Uint8Array;
  try {
    given = b64(signatureB64.trim());
  } catch {
    return false;
  }
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ given[i];
  return diff === 0;
}

/** สร้างลายเซ็นแบบเดียวกับ Beam — ใช้ในเทสต์และสคริปต์ยิง webhook เอง */
export async function signWebhook(rawBody: string, secretB64: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', b64(secretB64), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  return btoa(String.fromCharCode(...sig));
}

export interface WebhookCharge {
  id: string | null;
  referenceId: string | null;
  status: string | null;
}

/** payload ของ Beam มาได้หลายทรง (`data` / `charge` / `object` / ตรง ๆ) — ดึง charge ออกมาให้ได้ก่อน */
export function extractCharge(payload: unknown): WebhookCharge {
  const root = (payload ?? {}) as Record<string, unknown>;
  const candidates = [root.data, root.charge, root.object, root].filter(
    (c): c is Record<string, unknown> => !!c && typeof c === 'object',
  );
  for (const c of candidates) {
    const id = typeof c.chargeId === 'string' ? c.chargeId : typeof c.id === 'string' ? c.id : null;
    const referenceId = typeof c.referenceId === 'string' ? c.referenceId : null;
    if (id || referenceId) {
      return { id, referenceId, status: typeof c.status === 'string' ? c.status : null };
    }
  }
  return { id: null, referenceId: null, status: null };
}

/** คืน Uint8Array บน ArrayBuffer จริง — Web Crypto รับ BufferSource ไม่รับ ArrayBufferLike */
function b64(text: string): Uint8Array<ArrayBuffer> {
  const s = atob(text);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
