import type { Engine, EngineHooks, EngineJob, EngineOutput, WorkerCommand, WorkerEvent } from './types';

const MANIFEST_URL = '/ffmpeg/manifest.json';
const LOAD_ERROR = 'โหลดตัวประมวลผลไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่';
const CRASH_ERROR = 'ตัวประมวลผลหยุดทำงานกลางคัน อาจเพราะหน่วยความจำไม่พอ กรุณาใช้ไฟล์ที่เล็กลงหรือเลือกช่วงที่สั้นลง';

/**
 * ตัวประมวลผลวิดีโอ — worker หนึ่งตัวต่อหน้า โหลด core ครั้งแรกตอน run() ครั้งแรก
 * แล้วอยู่ต่อให้ลองค่าใหม่ได้โดยไม่โหลดซ้ำ
 *
 * terminate() ฆ่า worker ทิ้งทั้งหมด งานที่ค้างอยู่ reject ด้วย 'cancelled'
 * โมดูลนี้ต้องถูก import แบบ dynamic จาก VideoTool เท่านั้น — ไม่ให้ worker หลุดเข้า chunk ที่ hydrate
 */
export function createEngine(): Engine {
  let worker: Worker | null = null;
  let loaded: Promise<void> | null = null;
  let pending: ((error: Error) => void) | null = null;

  /** hooks มากับแต่ละ run — callback ของรอบก่อนผูก version เก่าไว้ ถ้าใช้ซ้ำ progress จะค้าง 0% */
  function load(hooks: EngineHooks): Promise<void> {
    if (loaded) return loaded;
    loaded = (async () => {
      // no-store: manifest ชี้เวอร์ชันปัจจุบัน ต้องสดเสมอ (ไฟล์ ~150 byte) ส่วน /ffmpeg/<ver>/* cache แบบ immutable ผ่าน public/_headers
      const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(LOAD_ERROR);
      const manifest = (await res.json()) as { version: string; gzipBytes: number };
      worker = new Worker(new URL('./ffmpeg.worker.ts', import.meta.url), { type: 'module' });
      await new Promise<void>((resolve, reject) => {
        pending = reject;
        worker!.onerror = () => reject(new Error(LOAD_ERROR));
        worker!.onmessage = ({ data }: MessageEvent<WorkerEvent>) => {
          if (data.type === 'load-progress') hooks.onLoad(data.loaded, data.total);
          else if (data.type === 'loaded') resolve();
          else if (data.type === 'error') reject(new Error(data.message));
        };
        const command: WorkerCommand = {
          type: 'load',
          base: `/ffmpeg/${manifest.version}`,
          gzipBytes: manifest.gzipBytes,
        };
        worker!.postMessage(command);
      });
    })();
    loaded.catch(() => {
      loaded = null;
    });
    return loaded;
  }

  return {
    async run(job: EngineJob, hooks: EngineHooks): Promise<EngineOutput> {
      await load(hooks);
      return new Promise<EngineOutput>((resolve, reject) => {
        pending = reject;
        // worker ตายกลางงาน (เช่น iOS ฆ่าเพราะหน่วยความจำหมด) → แจ้งทันที ไม่ค้างรอจนครบ 15 นาที
        worker!.onerror = () => reject(new Error(CRASH_ERROR));
        worker!.onmessage = ({ data }: MessageEvent<WorkerEvent>) => {
          if (data.type === 'progress') hooks.onProgress(data.seconds);
          else if (data.type === 'done') resolve(data.output);
          else if (data.type === 'error') reject(new Error(data.message));
        };
        const command: WorkerCommand = { type: 'run', job };
        worker!.postMessage(command, [job.input.bytes.buffer]);
      });
    },
    terminate() {
      worker?.terminate();
      worker = null;
      loaded = null;
      pending?.(new Error('cancelled'));
      pending = null;
    },
  };
}
