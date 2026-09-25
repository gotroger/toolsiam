import type { EngineHooks, OcrEngine, OcrLanguage } from './types';

const MANIFEST_URL = '/ocr/manifest.json';
const LOAD_ERROR = 'โหลดตัวอ่านข้อความไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่';
/**
 * เพดานเวลาอ่านรูปเดียว — tesseract.js ไม่ reject งานที่ค้างเมื่อ worker ตาย (เช่น iOS ฆ่าเพราะหน่วยความจำหมด)
 * ถ้าไม่มีเพดาน ปุ่มจะค้าง "กำลังอ่าน" ตลอดไป · มือถือเก่ากับรูปใหญ่ใช้ราวหนึ่งนาที จึงเผื่อไว้สามเท่า
 */
export const RECOGNIZE_TIMEOUT_MS = 3 * 60_000;
const TIMEOUT_ERROR = 'อ่านรูปนี้นานเกินไป อาจเพราะหน่วยความจำไม่พอ กรุณาลองรูปที่เล็กลง';

// สัดส่วนของแถบ "กำลังโหลด" ต่อขั้นของ tesseract.js — โมเดลภาษาเป็นก้อนที่ใหญ่สุดจึงได้ช่วงกว้างสุด
const LOAD_STAGES: Record<string, [number, number]> = {
  'loading tesseract core': [0, 0.3],
  'initializing tesseract': [0.3, 0.35],
  'loading language traineddata': [0.35, 0.9],
  'initializing api': [0.9, 1],
};

interface TesseractWorker {
  recognize(image: Blob | HTMLCanvasElement): Promise<{ data: { text: string; confidence: number } }>;
  reinitialize(langs: string, oem: number): Promise<unknown>;
  terminate(): Promise<unknown>;
}

/**
 * ตัวอ่านข้อความ — worker หนึ่งตัวต่อหน้า โหลด core + โมเดลตอน recognize() ครั้งแรก แล้วอยู่ต่อให้อ่านรูปถัดไปได้ทันที
 *
 * ทุกไฟล์มาจาก /ocr/<ver>/ ของเว็บเอง (scripts/copy-ocr.mjs) — ห้ามปล่อยให้ tesseract.js ใช้ค่าตั้งต้นที่ชี้ jsDelivr
 * terminate() ฆ่า worker ทิ้ง งานที่ค้างอยู่ reject ด้วย 'cancelled'
 * โมดูลนี้ต้องถูก import แบบ dynamic จาก Tool.tsx เท่านั้น และไม่รั่วชนิดของ tesseract.js ออกไป (เปลี่ยนไส้ในได้ภายหลัง)
 */
export function createEngine(hooks: EngineHooks): OcrEngine {
  let worker: TesseractWorker | null = null;
  let loading: Promise<TesseractWorker> | null = null;
  let language: OcrLanguage | null = null;
  let pending: ((error: Error) => void) | null = null;
  let dead = false;

  function logger({ status, progress }: { status: string; progress: number }) {
    if (status === 'recognizing text') hooks.onProgress(progress);
    else {
      const stage = LOAD_STAGES[status];
      if (stage) hooks.onLoad(stage[0] + (stage[1] - stage[0]) * progress);
    }
  }

  async function start(lang: OcrLanguage): Promise<TesseractWorker> {
    // no-store: manifest ชี้เวอร์ชันปัจจุบัน ต้องสดเสมอ (ไฟล์เล็ก) ส่วน /ocr/<ver>/* cache แบบ immutable ผ่าน public/_headers
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(LOAD_ERROR);
    const { version } = (await res.json()) as { version: string };
    const base = `/ocr/${version}`;
    const { createWorker, OEM } = await import('tesseract.js');
    const created = (await createWorker(lang.split('+'), OEM.LSTM_ONLY, {
      workerPath: `${base}/worker.min.js`,
      corePath: `${base}/core`,
      langPath: `${base}/lang`,
      gzip: true,
      // HTTP cache (immutable) พอแล้ว — ไม่เก็บโมเดลซ้ำใน IndexedDB และไม่มีโมเดลค้างเวอร์ชันเก่า
      cacheMethod: 'none',
      // ให้ worker โหลดจาก URL ของเราตรง ๆ ไม่ผ่าน blob: ที่ importScripts ข้าม origin ได้
      workerBlobURL: false,
      logger,
      errorHandler: () => undefined,
    })) as unknown as TesseractWorker;
    language = lang;
    return created;
  }

  async function ready(lang: OcrLanguage): Promise<TesseractWorker> {
    if (!loading) {
      loading = start(lang).catch((error: unknown) => {
        loading = null;
        throw error instanceof Error && error.message === LOAD_ERROR ? error : new Error(LOAD_ERROR);
      });
    }
    const current = await loading;
    if (language !== lang) {
      const { OEM } = await import('tesseract.js');
      await current.reinitialize(lang, OEM.LSTM_ONLY);
      language = lang;
    }
    return current;
  }

  return {
    recognize(image, lang) {
      return new Promise((resolve, reject) => {
        if (dead) return reject(new Error('cancelled'));
        pending = reject;
        ready(lang)
          .then((current) => {
            worker = current;
            // terminate() มาระหว่างโหลด — worker เพิ่งเกิดหลังถูกสั่งยกเลิก ต้องฆ่าทิ้งเอง
            if (dead) {
              void current.terminate();
              throw new Error('cancelled');
            }
            return new Promise<Awaited<ReturnType<TesseractWorker['recognize']>>>((done, fail) => {
              const timer = setTimeout(() => {
                // worker อาจตายหรือค้าง — ทิ้งทั้งตัว รูปถัดไปจะโหลด worker ใหม่ (ไม่ใช่ dead: ยังใช้ engine ต่อได้)
                void current.terminate();
                if (worker === current) worker = null;
                loading = null;
                language = null;
                fail(new Error(TIMEOUT_ERROR));
              }, RECOGNIZE_TIMEOUT_MS);
              current
                .recognize(image)
                .then(done, fail)
                .finally(() => clearTimeout(timer));
            });
          })
          .then(({ data }) => resolve({ text: data.text, confidence: data.confidence }))
          .catch((error: unknown) => reject(error instanceof Error ? error : new Error('อ่านรูปนี้ไม่สำเร็จ')));
      });
    },
    terminate() {
      dead = true;
      void worker?.terminate();
      worker = null;
      pending?.(new Error('cancelled'));
      pending = null;
    },
  };
}
