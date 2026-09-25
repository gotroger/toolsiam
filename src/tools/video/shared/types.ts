export interface EngineJob {
  input: { name: string; bytes: Uint8Array<ArrayBuffer> };
  args: string[];
  output: { name: string; mime: string };
}
export interface EngineOutput {
  /** สำเนาที่ไม่ผูกกับ heap ของ wasm — ใส่ Blob ได้ทันที */
  bytes: Uint8Array<ArrayBuffer>;
  name: string;
  mime: string;
}
export interface EngineHooks {
  /** ความคืบหน้าการดาวน์โหลด core (ไบต์ที่ได้ / ไบต์ทั้งหมด) — ครั้งแรกเท่านั้น ครั้งถัดไปมาจาก HTTP cache */
  onLoad: (loaded: number, total: number) => void;
  /** วินาทีของผลลัพธ์ที่ ffmpeg เขียนไปแล้ว */
  onProgress: (seconds: number) => void;
}
export interface Engine {
  /** hooks ส่งมากับแต่ละรอบ เพราะ engine อยู่ต่อข้ามรอบ แต่ callback ผูกกับรอบที่เรียก */
  run: (job: EngineJob, hooks: EngineHooks) => Promise<EngineOutput>;
  terminate: () => void;
}

/** main → worker */
export type WorkerCommand = { type: 'load'; base: string; gzipBytes: number } | { type: 'run'; job: EngineJob };
/** worker → main */
export type WorkerEvent =
  | { type: 'load-progress'; loaded: number; total: number }
  | { type: 'loaded' }
  | { type: 'progress'; seconds: number }
  | { type: 'done'; output: EngineOutput }
  | { type: 'error'; message: string };
