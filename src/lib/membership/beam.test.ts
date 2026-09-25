import { describe, it, expect, vi } from 'vitest';
import {
  BeamError,
  createPromptPayCharge,
  extractCharge,
  fetchCharge,
  signWebhook,
  verifyWebhookSignature,
} from './beam';

const creds = { baseUrl: 'https://playground.api.beamcheckout.com/', merchantId: 'm1', apiKey: 'k1' };
const okBody = {
  chargeId: 'ch_1',
  actionRequired: 'ENCODED_IMAGE',
  encodedImage: { imageBase64Encoded: 'iVBOR', rawData: '0002' },
};

describe('createPromptPayCharge', () => {
  it('ส่ง request ตามรูปแบบของ Beam และอ่าน QR กลับมา', async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://playground.api.beamcheckout.com/api/v1/charges');
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe(`Basic ${btoa('m1:k1')}`);
      expect(headers['x-beam-idempotency-key']).toBe('pay_1');
      expect(JSON.parse(String(init?.body))).toEqual({
        amount: 1900,
        currency: 'THB',
        deviceType: 'WEB',
        paymentMethod: { paymentMethodType: 'QR_PROMPT_PAY', qrPromptPay: { expiryTime: '2026-09-19T10:00:00.000Z' } },
        referenceId: 'pay_1',
        returnUrl: 'https://toolsiam.com/account',
      });
      return new Response(JSON.stringify(okBody));
    }) as unknown as typeof fetch;
    const charge = await createPromptPayCharge({
      creds,
      paymentId: 'pay_1',
      amountSatang: 1900,
      expiryTime: '2026-09-19T10:00:00.000Z',
      returnUrl: 'https://toolsiam.com/account',
      fetchImpl,
    });
    expect(charge).toEqual({ chargeId: 'ch_1', imageBase64: 'iVBOR', rawData: '0002' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retry เมื่อ 503 แล้วสำเร็จ · 4xx ไม่ retry · ครบ 3 ครั้งแล้วโยน', async () => {
    const flaky = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'ch_2', encodedImage: { imageBase64Encoded: 'x' } })));
    const base = { creds, paymentId: 'p', amountSatang: 1900, expiryTime: 't', returnUrl: 'r', retryDelayMs: 0 };
    const charge = await createPromptPayCharge({ ...base, fetchImpl: flaky as unknown as typeof fetch });
    expect(charge.chargeId).toBe('ch_2');
    expect(charge.rawData).toBe('');
    expect(flaky).toHaveBeenCalledTimes(2);

    const bad = vi.fn().mockResolvedValue(new Response('', { status: 400 }));
    await expect(createPromptPayCharge({ ...base, fetchImpl: bad as unknown as typeof fetch })).rejects.toBeInstanceOf(
      BeamError,
    );
    expect(bad).toHaveBeenCalledTimes(1);

    const down = vi.fn().mockResolvedValue(new Response('', { status: 502 }));
    await expect(createPromptPayCharge({ ...base, fetchImpl: down as unknown as typeof fetch })).rejects.toThrow('502');
    expect(down).toHaveBeenCalledTimes(3);
  });

  it('คำตอบที่ไม่มี QR → โยน', async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({ chargeId: 'x' }))) as unknown as typeof fetch;
    await expect(
      createPromptPayCharge({ creds, paymentId: 'p', amountSatang: 1, expiryTime: 't', returnUrl: 'r', fetchImpl }),
    ).rejects.toThrow('QR');
  });
});

describe('verifyWebhookSignature', () => {
  const secret = btoa('super-secret-key');
  const body = '{"type":"charge.succeeded","data":{"id":"ch_1"}}';

  it('ลายเซ็นที่คำนวณด้วย key เดียวกันผ่าน', async () => {
    expect(await verifyWebhookSignature(body, await signWebhook(body, secret), secret)).toBe(true);
  });
  it('body เปลี่ยน / key ต่าง / ไม่มีลายเซ็น / base64 พัง → ไม่ผ่านโดยไม่โยน', async () => {
    const sig = await signWebhook(body, secret);
    expect(await verifyWebhookSignature(body + ' ', sig, secret)).toBe(false);
    expect(await verifyWebhookSignature(body, sig, btoa('other'))).toBe(false);
    expect(await verifyWebhookSignature(body, null, secret)).toBe(false);
    expect(await verifyWebhookSignature(body, '***', secret)).toBe(false);
    expect(await verifyWebhookSignature(body, sig, '***')).toBe(false);
  });
});

describe('extractCharge', () => {
  it('รองรับ wrapper data / charge / object และแบบตรง ๆ', () => {
    const none = { amount: null, currency: null };
    expect(extractCharge({ data: { id: 'a', referenceId: 'r', status: 'SUCCEEDED' } })).toEqual({
      id: 'a',
      referenceId: 'r',
      status: 'SUCCEEDED',
      ...none,
    });
    expect(extractCharge({ charge: { chargeId: 'b' } })).toEqual({ id: 'b', referenceId: null, status: null, ...none });
    expect(extractCharge({ object: { referenceId: 'c' } })).toEqual({
      id: null,
      referenceId: 'c',
      status: null,
      ...none,
    });
    expect(extractCharge({ id: 'd', status: 'FAILED' })).toEqual({
      id: 'd',
      referenceId: null,
      status: 'FAILED',
      ...none,
    });
    expect(extractCharge(null)).toEqual({ id: null, referenceId: null, status: null, ...none });
  });

  it('ดึงยอด (สตางค์) และสกุลเงินมาด้วยเมื่อ Beam ส่งมา — ใช้เทียบกับรายการฝั่งเรา', () => {
    expect(extractCharge({ data: { id: 'a', amount: 2900, currency: 'THB' } })).toMatchObject({
      amount: 2900,
      currency: 'THB',
    });
    // ชนิดผิดถือว่าไม่ได้ส่งมา ไม่ใช่ 0 หรือสตริงว่าง
    expect(extractCharge({ data: { id: 'a', amount: '2900', currency: 1 } })).toMatchObject({
      amount: null,
      currency: null,
    });
  });
});

describe('fetchCharge', () => {
  const creds = { baseUrl: 'https://playground.api.beamcheckout.com/', merchantId: 'm1', apiKey: 'k1' };

  it('GET /api/v1/charges/{id} ด้วย Basic auth แล้วคืน status + referenceId + amount', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ chargeId: 'ch_1', referenceId: 'p1', status: 'SUCCEEDED', amount: 1900 })),
    ) as unknown as typeof fetch;
    const got = await fetchCharge({ creds, chargeId: 'ch_1', fetchImpl });
    expect(got.status).toBe('SUCCEEDED');
    expect(got.referenceId).toBe('p1');
    expect(got.amount).toBe(1900);
    expect(JSON.parse(got.rawJson)).toMatchObject({ chargeId: 'ch_1' });
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://playground.api.beamcheckout.com/api/v1/charges/ch_1');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${btoa('m1:k1')}`);
  });

  it('Beam ตอบไม่ใช่ 2xx → BeamError พร้อม status', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    await expect(fetchCharge({ creds, chargeId: 'nope', fetchImpl })).rejects.toMatchObject({ status: 404 });
    await expect(fetchCharge({ creds, chargeId: 'nope', fetchImpl })).rejects.toBeInstanceOf(BeamError);
  });
});
