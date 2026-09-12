/** พื้นผิวของ ffmpeg-core (Emscripten module) เท่าที่ ffmpeg.worker.ts ใช้ — โหลดจาก /ffmpeg/<ver>/ffmpeg-core.js ตอนรัน */
interface FFmpegCoreModule {
  exec: (...args: string[]) => void;
  ret: number;
  reset: () => void;
  setTimeout: (ms: number) => void;
  setLogger: (cb: (log: { type: string; message: string }) => void) => void;
  setProgress: (cb: (p: { progress: number; time: number }) => void) => void;
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
    readFile: (path: string, opts: { encoding: 'binary' }) => Uint8Array<ArrayBuffer>;
    unlink: (path: string) => void;
  };
}
type CreateFFmpegCore = (opts: { mainScriptUrlOrBlob: string }) => Promise<FFmpegCoreModule>;
