import { describe, it, expect, vi } from 'vitest';
import {
  handleLatest, KV_KEY, outcomeSeverity, readStored, syncLatestDraw, type LotteryEnv,
} from './lottery-worker';

const seq = (n: number, start: number) => Array.from({ length: n }, (_, i) => String(start + i).padStart(6, '0'));

/** ข้อมูลดิบรูปแบบเดียวกับที่ API ของ GLO คืน */
function gloResult(date: string, first = '123456') {
  const n = Number(first);
  const near = [String(n - 1).padStart(6, '0'), String(n + 1).padStart(6, '0')];
  const num = (values: string[]) => ({ number: values.map((value, i) => ({ round: i + 1, value })) });
  return {
    date,
    data: {
      first: { price: '6000000.00', ...num([first]) },
      near1: { price: '100000.00', ...num(near) },
      second: { price: '200000.00', ...num(seq(5, 200_000)) },
      third: { price: '80000.00', ...num(seq(10, 300_000)) },
      fourth: { price: '40000.00', ...num(seq(50, 400_000)) },
      fifth: { price: '20000.00', ...num(seq(100, 500_000)) },
      last3f: { price: '4000.00', ...num(['111', '222']) },
      last3b: { price: '4000.00', ...num(['333', '444']) },
      last2: { price: '2000.00', ...num(['55']) },
    },
  };
}

const n3Raw = {
  straight3: { price: '5801.00', number: [{ value: '212' }] },
  shuffle3: { price: '2702.00', number: [{ value: '122' }, { value: '221' }] },
  straight2: { price: '582.00', number: [{ value: '04' }] },
  special: { price: '839705.00', number: [{ value: '212000003860' }] },
};

/** เวลา 15:30 น. ตามเวลาไทยของวันที่ระบุ — ช่วงที่ cron ทำงาน */
const at = (date: string, utc = '08:30') => new Date(`${date}T${utc}:00Z`);

/** KV จำลองที่เก็บใน memory */
function fakeKv(initial?: string) {
  const store = new Map<string, string>();
  if (initial) store.set(KV_KEY, initial);
  return {
    store,
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => { store.set(k, v); },
  } as unknown as KVNamespace & { store: Map<string, string> };
}

function env(overrides: Partial<LotteryEnv> = {}): LotteryEnv & { LOTTERY: ReturnType<typeof fakeKv> } {
  return { LOTTERY: fakeKv(), LOTTERY_AUTO: 'on', ...overrides } as never;
}

/** fetch จำลองที่ตอบตาม endpoint ของ GLO */
function fakeFetch(periods: string[], results: Record<string, unknown>) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const ok = (response: unknown) => new Response(JSON.stringify({ statusCode: 200, response }));
    if (String(url).includes('getPeriodList')) return ok({ list: periods });
    if (String(url).includes('getLotteryResult')) {
      const body = JSON.parse(String(init?.body ?? '{}'));
      const date = `${body.year}-${body.month}-${body.date}`;
      const result = results[date];
      if (!result) return new Response(JSON.stringify({ statusCode: 404 }));
      return ok({ result });
    }
    throw new Error(`ไม่คาดคิด: ${url}`);
  }) as unknown as typeof fetch;
}

describe('kill switch', () => {
  it('ไม่ดึงข้อมูลเลยเมื่อ LOTTERY_AUTO ไม่ใช่ on', async () => {
    const fetchImpl = fakeFetch(['2026-09-16'], {});
    const outcome = await syncLatestDraw({
      env: env({ LOTTERY_AUTO: 'off' }), newestStaticDate: '2026-09-01', fetchImpl,
    });
    expect(outcome).toEqual({ action: 'disabled' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('API ตอบ 204 เมื่อปิด kill switch แม้ KV จะมีข้อมูล', async () => {
    const e = env({ LOTTERY_AUTO: 'off' });
    await e.LOTTERY.put(KV_KEY, JSON.stringify({ draw: { drawDate: '2026-09-16' }, fetchedAt: 'x' }));
    expect((await handleLatest(e)).status).toBe(204);
  });
});

describe('L1 — ข้อมูลที่ดึงเองห้ามเป็น verified', () => {
  it('งวดที่ Worker ดึงมาเก็บเป็น validated เสมอ', async () => {
    const e = env();
    const fetchImpl = fakeFetch(['2026-09-16'], { '2026-09-16': gloResult('2026-09-16') });
    const outcome = await syncLatestDraw({ env: e, newestStaticDate: '2026-09-01', fetchImpl });

    expect(outcome).toEqual({ action: 'stored', drawDate: '2026-09-16', hasN3: false });
    const stored = await readStored(e);
    expect(stored!.draw.status).toBe('validated');
    expect(stored!.draw.status).not.toBe('verified');
  });
});

describe('L3 — ไฟล์ใน repo ชนะ KV', () => {
  it('ไม่เก็บงวดที่ static มีอยู่แล้ว', async () => {
    const fetchImpl = fakeFetch(['2026-09-01'], { '2026-09-01': gloResult('2026-09-01') });
    const outcome = await syncLatestDraw({ env: env(), newestStaticDate: '2026-09-01', fetchImpl });
    expect(outcome).toMatchObject({ action: 'skipped' });
  });

  it('ไม่เก็บงวดที่เก่ากว่า static', async () => {
    const fetchImpl = fakeFetch(['2026-08-16'], {});
    const outcome = await syncLatestDraw({ env: env(), newestStaticDate: '2026-09-01', fetchImpl });
    expect(outcome).toMatchObject({ action: 'skipped' });
  });
});

describe('early exit ตาม §28.4', () => {
  const calls = (f: typeof fetch) => (f as unknown as ReturnType<typeof vi.fn>).mock.calls;

  it('งวดที่อยู่ใน KV แล้วไม่ถูกดึงซ้ำ', async () => {
    const e = env();
    await e.LOTTERY.put(KV_KEY, JSON.stringify({ draw: { drawDate: '2026-09-16', n3: {} }, fetchedAt: 'x' }));
    const fetchImpl = fakeFetch(['2026-09-16'], { '2026-09-16': gloResult('2026-09-16') });

    const outcome = await syncLatestDraw({ env: e, newestStaticDate: '2026-09-01', fetchImpl, now: at('2026-09-27') });
    expect(outcome).toMatchObject({ action: 'skipped' });
    // ยิงแค่ getPeriodList ไม่ได้ยิง getLotteryResult
    expect(calls(fetchImpl)).toHaveLength(1);
  });

  it('วันที่งวดใหม่ยังออกไม่ได้ (งวดใน KV เพิ่งออกไม่ถึง 10 วัน) ไม่ยิงออกนอกเลย', async () => {
    const e = env();
    await e.LOTTERY.put(KV_KEY, JSON.stringify({ draw: { drawDate: '2026-09-16', n3: {} }, fetchedAt: 'x' }));
    const fetchImpl = fakeFetch(['2026-09-16'], {});

    const outcome = await syncLatestDraw({ env: e, newestStaticDate: undefined, fetchImpl, now: at('2026-09-20') });
    expect(outcome).toMatchObject({ action: 'skipped', known: '2026-09-16' });
    expect(calls(fetchImpl)).toHaveLength(0);
  });

  it('งวดใน KV ที่ยังไม่มี N3 ถูกดึงซ้ำในวันออกรางวัลจนกว่า N3 จะครบ', async () => {
    const e = env();
    await e.LOTTERY.put(KV_KEY, JSON.stringify({ draw: { drawDate: '2026-09-16' }, fetchedAt: 'x' }));
    const fetchImpl = fakeFetch(['2026-09-16'], { '2026-09-16': { ...gloResult('2026-09-16'), n3: n3Raw } });

    const outcome = await syncLatestDraw({ env: e, newestStaticDate: undefined, fetchImpl, now: at('2026-09-16') });
    expect(outcome).toEqual({ action: 'stored', drawDate: '2026-09-16', hasN3: true });
    expect((await readStored(e))!.draw.n3?.straight3.numbers).toEqual(['212']);
  });

  it('N3 ยังไม่ออกในรอบดึงซ้ำ ไม่เขียน KV ทับด้วยข้อมูลเดิม', async () => {
    const e = env();
    const before = JSON.stringify({ draw: { drawDate: '2026-09-16' }, fetchedAt: 'เดิม' });
    await e.LOTTERY.put(KV_KEY, before);
    const fetchImpl = fakeFetch(['2026-09-16'], { '2026-09-16': gloResult('2026-09-16') });

    const outcome = await syncLatestDraw({ env: e, newestStaticDate: undefined, fetchImpl, now: at('2026-09-16') });
    expect(outcome).toMatchObject({ action: 'skipped' });
    expect(e.LOTTERY.store.get(KV_KEY)).toBe(before);
  });
});

describe('เลือกงวดจากรายการของ API', () => {
  it('เลือกงวดใหม่สุดที่ไม่เลยวันนี้ ไม่ใช่ periods[0]', async () => {
    const e = env();
    // API เรียงไม่ตรงลำดับ และมีงวดในอนาคตที่ประกาศล่วงหน้า
    const fetchImpl = fakeFetch(['2026-10-01', '2026-09-01', '2026-09-16'], {
      '2026-09-16': gloResult('2026-09-16'),
    });
    const outcome = await syncLatestDraw({ env: e, newestStaticDate: undefined, fetchImpl, now: at('2026-09-16') });
    expect(outcome).toMatchObject({ action: 'stored', drawDate: '2026-09-16' });
  });

  it('N3 ที่ไม่ผ่านไม่ทำให้ผลสลาก 6 หลักทั้งงวดถูกทิ้ง', async () => {
    const e = env();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const partialN3 = { ...n3Raw, shuffle3: { price: '2702.00', number: [{ value: '122' }] } };
    const fetchImpl = fakeFetch(['2026-09-16'], { '2026-09-16': { ...gloResult('2026-09-16'), n3: partialN3 } });

    const outcome = await syncLatestDraw({ env: e, newestStaticDate: undefined, fetchImpl, now: at('2026-09-16') });
    expect(outcome).toEqual({ action: 'stored', drawDate: '2026-09-16', hasN3: false });
    expect((await readStored(e))!.draw.n3).toBeUndefined();
    warn.mockRestore();
  });
});

describe('ระดับ log ของแต่ละรอบ — ให้ Workers logs จับรอบที่ผิดปกติได้', () => {
  const lastRun = (date: string) => at(date, '13:30');

  it('รอบสุดท้ายของวันจบโดยเก็บงวดที่ออกแล้วไม่ได้ = error', () => {
    expect(outcomeSeverity({ action: 'rejected', drawDate: '2026-09-16', issues: [] }, lastRun('2026-09-16'))).toBe('error');
    expect(outcomeSeverity({ action: 'failed', error: 'x' }, lastRun('2026-09-16'))).toBe('error');
  });

  it('รอบกลางหน้าต่างที่ผลยังไม่ครบเป็นเรื่องปกติ ไม่ใช่ error', () => {
    expect(outcomeSeverity({ action: 'rejected', drawDate: '2026-09-16', issues: [] }, at('2026-09-16'))).toBe('info');
    expect(outcomeSeverity({ action: 'failed', error: 'x' }, at('2026-09-16'))).toBe('warn');
  });

  it('รอบสุดท้ายที่ข้อมูลล่าสุดที่รู้จักเก่าเกินเกณฑ์ = error · พ้นวันออกรางวัลแล้วยังไม่มีผล = warn', () => {
    expect(outcomeSeverity({ action: 'skipped', reason: '', known: '2026-09-01' }, lastRun('2026-09-20'))).toBe('error');
    expect(outcomeSeverity({ action: 'skipped', reason: '', known: '2026-09-01' }, lastRun('2026-09-17'))).toBe('warn');
    expect(outcomeSeverity({ action: 'skipped', reason: '', known: '2026-09-16' }, lastRun('2026-09-17'))).toBe('info');
  });

  it('เก็บสำเร็จเป็น info · เก็บได้แต่ยังไม่มี N3 เป็น warn', () => {
    expect(outcomeSeverity({ action: 'stored', drawDate: '2026-09-16', hasN3: true }, lastRun('2026-09-16'))).toBe('info');
    expect(outcomeSeverity({ action: 'stored', drawDate: '2026-09-16', hasN3: false }, lastRun('2026-09-16'))).toBe('warn');
  });
});

describe('ข้อมูลไม่ครบหรือ API ล่ม', () => {
  it('ข้อมูลไม่ผ่าน validator ไม่ถูกเก็บ และไม่เขียนทับของเดิม', async () => {
    const e = env();
    const good = JSON.stringify({ draw: { drawDate: '2026-09-01', status: 'validated' }, fetchedAt: 'เดิม' });
    await e.LOTTERY.put(KV_KEY, good);

    // ผลทยอยออก — รางวัลที่ 3 ยังมาไม่ครบ 10 รางวัล
    const partial = gloResult('2026-09-16');
    partial.data.third.number = partial.data.third.number.slice(0, 3);
    const fetchImpl = fakeFetch(['2026-09-16'], { '2026-09-16': partial });

    const outcome = await syncLatestDraw({ env: e, newestStaticDate: '2026-08-16', fetchImpl });
    expect(outcome).toMatchObject({ action: 'rejected', drawDate: '2026-09-16' });
    expect(e.LOTTERY.store.get(KV_KEY)).toBe(good);
  });

  it('API ล่มคืน failed โดยไม่โยน error ออกมา — cron ต้องไม่พังทั้งรอบ', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('เครือข่ายล่ม'); }) as unknown as typeof fetch;
    const outcome = await syncLatestDraw({ env: env(), newestStaticDate: '2026-09-01', fetchImpl });
    expect(outcome).toMatchObject({ action: 'failed' });
  });

  it('API คืนงวดคนละวันกับที่ขอ ถือว่าไม่ผ่าน', async () => {
    const fetchImpl = fakeFetch(['2026-09-16'], { '2026-09-16': gloResult('2026-08-01') });
    const outcome = await syncLatestDraw({ env: env(), newestStaticDate: '2026-09-01', fetchImpl });
    expect(outcome).toMatchObject({ action: 'failed' });
  });
});

describe('GET /api/lottery/latest', () => {
  it('ตอบ 204 เมื่อ KV ว่าง — client จะได้ใช้ static ต่อเงียบ ๆ', async () => {
    const res = await handleLatest(env());
    expect(res.status).toBe(204);
  });

  it('ตอบข้อมูลพร้อม Cache-Control เมื่อมีของใน KV', async () => {
    const e = env();
    const payload = { draw: { drawDate: '2026-09-16', status: 'validated' }, fetchedAt: '2026-09-16T08:00:00Z' };
    await e.LOTTERY.put(KV_KEY, JSON.stringify(payload));

    const res = await handleLatest(e);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=300');
    expect(await res.json()).toEqual(payload);
  });

  it('KV ที่ข้อมูลเสียหายไม่ทำให้ระเบิด — ถือว่าไม่มีข้อมูล', async () => {
    const e = env();
    await e.LOTTERY.put(KV_KEY, 'ไม่ใช่ JSON');
    expect(await readStored(e)).toBeNull();
    expect((await handleLatest(e)).status).toBe(204);
  });
});
