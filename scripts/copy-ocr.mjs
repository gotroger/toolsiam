// คัดลอกตัวอ่านข้อความ (tesseract.js worker + core + โมเดลภาษา) จาก node_modules ไป public/ocr/<version>/
//
//   node scripts/copy-ocr.mjs        (รันอัตโนมัติตอน postinstall และก่อน build)
//
// ทำไมต้องโฮสต์เอง: ค่าตั้งต้นของ tesseract.js ดึง worker/core/โมเดลจาก jsDelivr — IP และ referrer ของผู้ใช้
// จะไปถึงบุคคลที่สาม ขัดกับที่หน้าเครื่องมือบอกว่าไม่มีอะไรออกจากเครื่อง (src/tools/images/image-to-text/engine.ts)
//
// ทุกไฟล์ต่ำกว่าเพดาน 25 MiB ของ Cloudflare static assets จึงไม่ต้อง gzip เองแบบ ffmpeg
// (core ~3.9 MB เป็น JS ที่ฝัง wasm ไว้ Cloudflare บีบให้เหลือ ~1.5 MB · โมเดลเป็น .gz อยู่แล้ว)
//
// ไฟล์ทั้งหมดใน public/ocr/ ถูก generate — ไม่ commit (ดู .gitignore) · Node ล้วน ไม่มี dependency (E8)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join('public', 'ocr');
const pkg = (name) => JSON.parse(readFileSync(join('node_modules', name, 'package.json'), 'utf8'));

// เบราว์เซอร์โหลด core แค่ตัวเดียวตามความสามารถของเครื่อง (tesseract.js เลือกเอง) — LSTM-only ทั้งหมด
const CORES = ['tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'];
const LANGS = ['tha', 'eng'];

const files = [
  { from: join('node_modules', 'tesseract.js', 'dist', 'worker.min.js'), to: 'worker.min.js' },
  ...CORES.map((name) => ({ from: join('node_modules', 'tesseract.js-core', name), to: join('core', name) })),
  ...LANGS.map((lang) => ({
    from: join('node_modules', '@tesseract.js-data', lang, '4.0.0_best_int', `${lang}.traineddata.gz`),
    to: join('lang', `${lang}.traineddata.gz`),
  })),
].map((file) => ({ ...file, data: readFileSync(file.from) }));

const version = `${pkg('tesseract.js').version}-${pkg('tesseract.js-core').version}`;
const hash = createHash('sha256');
for (const file of files) hash.update(file.to).update(file.data);
const sha256 = hash.digest('hex');

const dir = join(OUT, version);
const manifestPath = join(OUT, 'manifest.json');
const current = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
if (current?.version === version && current?.sha256 === sha256 && files.every((file) => existsSync(join(dir, file.to)))) {
  console.log(`ocr ${version} พร้อมแล้ว`);
  process.exit(0);
}

// เก็บเวอร์ชันเดียวเสมอ — ไม่ deploy ไฟล์หลาย MB ซ้ำหลายชุด
if (existsSync(OUT)) for (const entry of readdirSync(OUT)) rmSync(join(OUT, entry), { recursive: true, force: true });
for (const sub of ['core', 'lang']) mkdirSync(join(dir, sub), { recursive: true });
for (const file of files) writeFileSync(join(dir, file.to), file.data);

const size = (to) => files.find((file) => file.to === to).data.length;
const bytes = {
  // ขนาดดิบของ core ตัวที่ใหญ่สุด — ผู้ใช้โหลดจริงน้อยกว่านี้เพราะ Cloudflare บีบอัดระหว่างทาง
  core: Math.max(...CORES.map((name) => size(join('core', name)))),
  tha: size(join('lang', 'tha.traineddata.gz')),
  eng: size(join('lang', 'eng.traineddata.gz')),
};
writeFileSync(manifestPath, JSON.stringify({ version, sha256, bytes }, null, 2) + '\n');
const mb = (n) => (n / 1048576).toFixed(1);
console.log(`ocr ${version}: core ${mb(bytes.core)} MB · tha ${mb(bytes.tha)} MB · eng ${mb(bytes.eng)} MB → ${dir}/`);
