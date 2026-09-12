// คัดลอก ffmpeg core จาก node_modules ไป public/ffmpeg/<version>/ แล้ว gzip ไฟล์ wasm
//
//   node scripts/copy-ffmpeg.mjs        (รันอัตโนมัติตอน postinstall และก่อน build)
//
// ทำไมต้อง gzip เอง: ffmpeg-core.wasm ดิบ 30.7 MB เกินเพดาน 25 MiB ต่อไฟล์ของ Cloudflare
// static assets ส่วน .gz เหลือ ~9.7 MB และเบราว์เซอร์คลายได้ด้วย DecompressionStream
// (src/tools/video/shared/ffmpeg.worker.ts)
//
// ไฟล์ทั้งหมดใน public/ffmpeg/ ถูก generate — ไม่ commit (ดู .gitignore) · Node ล้วน ไม่มี dependency (E8)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const SRC = join('node_modules', '@ffmpeg', 'core');
const OUT = join('public', 'ffmpeg');
const { version } = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8'));
const dir = join(OUT, version);
const manifestPath = join(OUT, 'manifest.json');

const wasm = readFileSync(join(SRC, 'dist', 'esm', 'ffmpeg-core.wasm'));
const sha256 = createHash('sha256').update(wasm).digest('hex');

const current = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
if (current?.version === version && current?.sha256 === sha256 && existsSync(join(dir, 'ffmpeg-core.wasm.gz'))) {
  console.log(`ffmpeg core ${version} พร้อมแล้ว`);
  process.exit(0);
}

// เก็บเวอร์ชันเดียวเสมอ — ไม่ deploy ไฟล์ 10 MB ซ้ำหลายชุด
if (existsSync(OUT)) for (const entry of readdirSync(OUT)) rmSync(join(OUT, entry), { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const gz = gzipSync(wasm, { level: 9 });
writeFileSync(join(dir, 'ffmpeg-core.wasm.gz'), gz);
writeFileSync(join(dir, 'ffmpeg-core.js'), readFileSync(join(SRC, 'dist', 'esm', 'ffmpeg-core.js')));
writeFileSync(
  manifestPath,
  JSON.stringify({ version, wasmBytes: wasm.length, gzipBytes: gz.length, sha256 }, null, 2) + '\n',
);
const mb = (n) => (n / 1048576).toFixed(1);
console.log(`ffmpeg core ${version}: wasm ${mb(wasm.length)} MB → gz ${mb(gz.length)} MB → ${dir}/`);
