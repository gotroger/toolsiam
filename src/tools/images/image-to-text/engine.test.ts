import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tesseract = vi.hoisted(() => ({
  worker: {
    recognize: vi.fn(),
    reinitialize: vi.fn(async () => undefined),
    terminate: vi.fn(async () => undefined),
  },
  createWorker: vi.fn(),
}));
vi.mock('tesseract.js', () => ({ createWorker: tesseract.createWorker, OEM: { LSTM_ONLY: 1 } }));

import { createEngine, RECOGNIZE_TIMEOUT_MS } from './engine';

const image = new Blob(['x'], { type: 'image/png' });
const hooks = () => ({ onLoad: vi.fn(), onProgress: vi.fn() });

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ version: '7.0.0-7.0.0' }), { status: 200 })),
  );
  tesseract.createWorker.mockReset().mockResolvedValue(tesseract.worker);
  tesseract.worker.recognize.mockReset().mockResolvedValue({ data: { text: 'สวัสดี', confidence: 91 } });
  tesseract.worker.reinitialize.mockClear();
  tesseract.worker.terminate.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe('createEngine', () => {
  it('ชี้ทุก path ไปที่ /ocr/<ver>/ ของเว็บเอง ไม่ใช้ CDN และไม่ cache ซ้ำใน IndexedDB', async () => {
    const engine = createEngine(hooks());
    await expect(engine.recognize(image, 'tha+eng')).resolves.toEqual({ text: 'สวัสดี', confidence: 91 });
    expect(fetch).toHaveBeenCalledWith('/ocr/manifest.json', { cache: 'no-store' });
    const [langs, oem, options] = tesseract.createWorker.mock.calls[0]!;
    expect(langs).toEqual(['tha', 'eng']);
    expect(oem).toBe(1);
    expect(options).toMatchObject({
      workerPath: '/ocr/7.0.0-7.0.0/worker.min.js',
      corePath: '/ocr/7.0.0-7.0.0/core',
      langPath: '/ocr/7.0.0-7.0.0/lang',
      gzip: true,
      cacheMethod: 'none',
      workerBlobURL: false,
    });
  });

  it('สร้าง worker ครั้งเดียว และ reinitialize เมื่อเปลี่ยนภาษา', async () => {
    const engine = createEngine(hooks());
    await engine.recognize(image, 'tha+eng');
    await engine.recognize(image, 'tha+eng');
    expect(tesseract.createWorker).toHaveBeenCalledTimes(1);
    expect(tesseract.worker.reinitialize).not.toHaveBeenCalled();
    await engine.recognize(image, 'eng');
    expect(tesseract.worker.reinitialize).toHaveBeenCalledWith('eng', 1);
    expect(tesseract.createWorker).toHaveBeenCalledTimes(1);
  });

  it('แมป logger เป็น onLoad และ onProgress', async () => {
    const h = hooks();
    const engine = createEngine(h);
    await engine.recognize(image, 'tha');
    const { logger } = tesseract.createWorker.mock.calls[0]![2];
    logger({ status: 'loading language traineddata', progress: 1 });
    expect(h.onLoad).toHaveBeenLastCalledWith(0.9);
    logger({ status: 'recognizing text', progress: 0.5 });
    expect(h.onProgress).toHaveBeenLastCalledWith(0.5);
    logger({ status: 'อะไรก็ไม่รู้', progress: 0.5 });
    expect(h.onLoad).toHaveBeenCalledTimes(1);
  });

  it('manifest ล้ม → ข้อความโหลดไม่สำเร็จ และลองใหม่ได้', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    );
    const engine = createEngine(hooks());
    await expect(engine.recognize(image, 'tha')).rejects.toThrow('โหลดตัวอ่านข้อความไม่สำเร็จ');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ version: 'v' }), { status: 200 })),
    );
    await expect(engine.recognize(image, 'tha')).resolves.toMatchObject({ text: 'สวัสดี' });
  });

  it('createWorker ล้ม → ข้อความเดียวกัน ไม่โชว์ error ดิบของไลบรารี', async () => {
    tesseract.createWorker.mockRejectedValueOnce(new Error('NetworkError: importScripts'));
    await expect(createEngine(hooks()).recognize(image, 'tha')).rejects.toThrow('โหลดตัวอ่านข้อความไม่สำเร็จ');
  });

  it('terminate ระหว่างอ่าน → reject ด้วย cancelled และฆ่า worker', async () => {
    tesseract.worker.recognize.mockReturnValue(new Promise(() => undefined));
    const engine = createEngine(hooks());
    const job = engine.recognize(image, 'tha');
    await vi.waitFor(() => expect(tesseract.worker.recognize).toHaveBeenCalled());
    engine.terminate();
    await expect(job).rejects.toThrow('cancelled');
    expect(tesseract.worker.terminate).toHaveBeenCalled();
    await expect(engine.recognize(image, 'tha')).rejects.toThrow('cancelled');
  });

  it('อ่านรูปค้างนานเกินกำหนด (worker ตายเงียบ) → reject ข้อความไทย ฆ่า worker และรูปถัดไปเริ่ม worker ใหม่', async () => {
    vi.useFakeTimers();
    try {
      tesseract.worker.recognize.mockReturnValueOnce(new Promise(() => undefined));
      const engine = createEngine(hooks());
      const job = engine.recognize(image, 'tha');
      const settled = expect(job).rejects.toThrow('นานเกินไป');
      await vi.waitFor(() => expect(tesseract.worker.recognize).toHaveBeenCalled());
      await vi.advanceTimersByTimeAsync(RECOGNIZE_TIMEOUT_MS);
      await settled;
      expect(tesseract.worker.terminate).toHaveBeenCalled();
      await expect(engine.recognize(image, 'tha')).resolves.toMatchObject({ text: 'สวัสดี' });
      expect(tesseract.createWorker).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
