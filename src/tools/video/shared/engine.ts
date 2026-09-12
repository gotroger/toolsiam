import type { Engine, EngineHooks, EngineJob, EngineOutput, WorkerCommand, WorkerEvent } from './types';

const MANIFEST_URL = '/ffmpeg/manifest.json';
const LOAD_ERROR = 'โหลดตัวประมวลผลไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่';

/**
 * ตัวประมวลผลวิดีโอ — worker หนึ่งตัวต่อหน้า โหลด core ครั้งแรกตอน run() ครั้งแรก
 * แล้วอยู่ต่อให้ลองค่าใหม่ได้โดยไม่โหลดซ้ำ
 *
 * terminate() ฆ่า worker ทิ้งทั้งหมด งานที่ค้างอยู่ reject ด้วย 'cancelled'
 * โมดูลนี้ต้องถูก import แบบ dynamic จาก VideoTool เท่านั้น — ไม่ให้ worker หลุดเข้า chunk ที่ hydrate
 */
export function createEngine(hooks: EngineHooks): Engine {
  let worker: Worker | null = null;
  let loaded: Promise<void> | null = null;
  let pending: ((error: Error) => void) | null = null;

  function load(): Promise<void> {
    if (loaded) return loaded;
    loaded = (async () => {
      const res = await fetch(MANIFEST_URL);
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
    async run(job: EngineJob): Promise<EngineOutput> {
      await load();
      return new Promise<EngineOutput>((resolve, reject) => {
        pending = reject;
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
