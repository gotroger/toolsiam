/// <reference lib="webworker" />
import type { EngineJob, WorkerCommand, WorkerEvent } from './types';

/**
 * Worker ของเราเองที่คุยกับ ffmpeg core โดยตรง (แทน @ffmpeg/ffmpeg ซึ่งสร้าง worker
 * ด้วย `new URL(..., import.meta.url)` ภายใน node_modules ที่ Vite ไม่รับประกันว่าจะ bundle)
 *
 * โหลด core: fetch .wasm.gz → DecompressionStream → blob URL → import ffmpeg-core.js
 * งาน: writeFile → exec → readFile → unlink ทั้งเข้าและออกใน finally (คืนหน่วยความจำ MEMFS)
 * ยกเลิก = main thread terminate() worker ทิ้งทั้งตัว จึงไม่ต้องมีคำสั่งยกเลิกในนี้
 */
let core: FFmpegCoreModule | null = null;
const logs: string[] = [];
const post = (event: WorkerEvent, transfer: Transferable[] = []) => self.postMessage(event, transfer);

async function load(base: string, gzipBytes: number) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('เบราว์เซอร์นี้ไม่รองรับเครื่องมือวิดีโอ กรุณาอัปเดตเบราว์เซอร์');
  }
  const res = await fetch(`${base}/ffmpeg-core.wasm.gz`);
  if (!res.ok || !res.body) throw new Error('โหลดตัวประมวลผลไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่');
  const total = Number(res.headers.get('content-length')) || gzipBytes;
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let loaded = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    // เซิร์ฟเวอร์บางตัว (เช่น Vite dev) ส่ง Content-Encoding: gzip ให้เบราว์เซอร์คลายเอง
    // ไบต์ที่นับได้จึงเป็นไฟล์ดิบซึ่งใหญ่กว่า content-length — กันเปอร์เซ็นต์ทะลุ 100
    post({ type: 'load-progress', loaded: Math.min(loaded, total), total });
  }
  const raw = new Blob(chunks);
  const head = new Uint8Array(await raw.slice(0, 2).arrayBuffer());
  const isGzip = head[0] === 0x1f && head[1] === 0x8b;
  const wasm = isGzip ? await new Response(raw.stream().pipeThrough(new DecompressionStream('gzip'))).blob() : raw;
  const wasmURL = URL.createObjectURL(wasm.slice(0, wasm.size, 'application/wasm'));
  const coreURL = new URL(`${base}/ffmpeg-core.js`, self.location.href).href;
  const factory = (await import(/* @vite-ignore */ coreURL)).default as CreateFFmpegCore;
  // core อ่าน wasmURL จาก hash ของ mainScriptUrlOrBlob (แบบเดียวกับ @ffmpeg/ffmpeg)
  core = await factory({ mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL, workerURL: '' }))}` });
  URL.revokeObjectURL(wasmURL);
  core.setLogger(({ message }) => {
    logs.push(message);
    if (logs.length > 40) logs.shift();
  });
  // time = out_time ของ ffmpeg เป็นไมโครวินาที (ยืนยันด้วย smoke test ตอนพัฒนา)
  core.setProgress(({ time }) => post({ type: 'progress', seconds: time / 1e6 }));
}

function translate(code: number) {
  const text = logs.join('\n');
  if (/Invalid data found|moov atom not found|Unable to find a suitable output/.test(text))
    return 'ไฟล์เสียหายหรือเป็นชนิดที่อ่านไม่ได้ กรุณาลองไฟล์อื่น';
  if (/Output file is empty|does not contain any stream/.test(text))
    return 'ช่วงเวลาที่เลือกอยู่นอกความยาวคลิป กรุณาตรวจเวลาเริ่มและจบ';
  if (/Cannot allocate memory|out of memory|Aborted/i.test(text))
    return 'หน่วยความจำไม่พอ กรุณาใช้ไฟล์ที่เล็กลงหรือเลือกช่วงที่สั้นลง';
  return `แปลงไม่สำเร็จ (รหัส ${code}) กรุณาลองไฟล์อื่นหรือลดขนาดไฟล์`;
}

function run(job: EngineJob) {
  if (!core) throw new Error('ตัวประมวลผลยังไม่พร้อม');
  logs.length = 0;
  core.FS.writeFile(job.input.name, job.input.bytes);
  try {
    core.setTimeout(-1);
    core.exec(...job.args);
    const code = core.ret;
    core.reset();
    if (code !== 0) throw new Error(translate(code));
    // สำเนาออกจาก heap ของ wasm ก่อน transfer — buffer เดิมเป็นของ core
    const bytes = core.FS.readFile(job.output.name, { encoding: 'binary' }).slice();
    if (!bytes.byteLength) throw new Error(translate(code));
    return bytes;
  } finally {
    for (const name of [job.input.name, job.output.name]) {
      try {
        core.FS.unlink(name);
      } catch {
        /* ไฟล์ออกอาจไม่ถูกสร้างเมื่อผิดพลาด */
      }
    }
  }
}

self.onmessage = async ({ data }: MessageEvent<WorkerCommand>) => {
  try {
    if (data.type === 'load') {
      await load(data.base, data.gzipBytes);
      post({ type: 'loaded' });
    } else {
      const bytes = run(data.job);
      post({ type: 'done', output: { bytes, name: data.job.output.name, mime: data.job.output.mime } }, [bytes.buffer]);
    }
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : 'ตัวประมวลผลขัดข้อง กรุณาลองใหม่' });
  }
};
