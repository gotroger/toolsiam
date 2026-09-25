import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  ErrorText,
  Field,
  FileDrop,
  Input,
  NumberInput,
  SegmentedControl,
  SelectedFiles,
  Select,
  Slider,
} from '@/components/ui';
import { fileSize } from '@/lib/format';
import { limitsFor, mb, PLAN_LIMITS, PREMIUM_PRICE_BAHT, type PlanLimits } from '@/lib/plan-limits';
import { usePlan, type PlanStatus } from '@/lib/plan-client';
import { getAccountUrl, getLoginUrl, getPremiumUrl } from '@/lib/routes';
import { fileTools, type FileToolId } from '../catalog';
import type { LimitHit, Options, Output, WorkerReply } from './types';

/**
 * ขีดจำกัดที่ถูกชน — แยก "เกินฟรีแต่พรีเมียมรับไหว" (เสนอพรีเมียม) ออกจาก "เกินพรีเมียมด้วย" (บอกให้แบ่งไฟล์)
 * ตัวเลขทั้งหมดมาจาก src/lib/plan-limits.ts
 */
type Upsell = { kind: 'perFile' | 'maxFiles' | 'total' | LimitHit['kind']; name?: string };

function premiumFits(kind: Upsell['kind'], value: number, fileClass: keyof PlanLimits['perFileMb']): boolean {
  const p = PLAN_LIMITS.premium;
  switch (kind) {
    case 'perFile':
      return value <= mb(p.perFileMb[fileClass]);
    case 'total':
      return value <= mb(p.totalMb);
    case 'maxFiles':
      return value <= p.maxFiles;
    case 'pages':
      return value <= p.pages;
    case 'zip':
      return value <= p.zipExpandedMb;
    case 'cells':
      return value <= p.cells;
  }
}

/**
 * ตรวจไฟล์ที่เลือกกับขีดจำกัดของแพลนปัจจุบัน — ฟังก์ชันบริสุทธิ์ เรียกซ้ำตอนสถานะสมาชิกเปลี่ยนได้
 * premiumOnly = มีไฟล์ที่เกินฟรีแต่พรีเมียมรับไหว (ใช้ตัดสินว่าควรรอรู้สถานะสมาชิกก่อนไหม)
 */
function validateSelection(
  selected: File[],
  current: File[],
  {
    config,
    limits,
    canUpsell,
    multiple,
  }: {
    config: { accept: string; fileClass: keyof PlanLimits['perFileMb'] };
    limits: PlanLimits;
    canUpsell: boolean;
    multiple: boolean;
  },
) {
  const next = [...current];
  const errors: string[] = [];
  let offer: Upsell | null = null;
  let premiumOnly = false;
  const perFile = mb(limits.perFileMb[config.fileClass]);
  const total = mb(limits.totalMb);
  /** ไฟล์ที่เกินขีดจำกัดของแพลนปัจจุบัน — ถ้าพรีเมียมรับไหวและผู้ใช้ยังไม่ใช่พรีเมียม ให้เสนอแทนการด่า */
  function reject(kind: Upsell['kind'], value: number, name: string, message: string) {
    const fits = premiumFits(kind, value, config.fileClass);
    premiumOnly ||= fits;
    if (canUpsell && fits) offer ??= { kind, name };
    else errors.push(message);
  }
  for (const file of selected) {
    if (!config.accept.split(',').some((ext) => file.name.toLowerCase().endsWith(ext))) {
      errors.push(`${file.name}: ชนิดไฟล์ไม่รองรับ`);
      continue;
    }
    if (!file.size) {
      errors.push(`${file.name}: ไฟล์ว่างเปล่า`);
      continue;
    }
    if (file.size > perFile) {
      reject('perFile', file.size, file.name, `${file.name}: ขนาดไม่เกิน ${limits.perFileMb[config.fileClass]} MB`);
      continue;
    }
    if (next.length >= (multiple ? limits.maxFiles : 1)) {
      // เครื่องมือไฟล์เดียวไม่มีเพดานจำนวนไฟล์ให้ขยาย พรีเมียมก็รับได้ไฟล์เดียวเท่ากัน — อย่าเสนอขาย
      if (!multiple) errors.push(`${file.name}: เครื่องมือนี้รับได้ครั้งละหนึ่งไฟล์`);
      else reject('maxFiles', next.length + 1, file.name, `${file.name}: เกินขีดจำกัด ${limits.maxFiles} ไฟล์`);
      continue;
    }
    const sum = next.reduce((acc, f) => acc + f.size, file.size);
    if (sum > total) {
      reject('total', sum, file.name, `${file.name}: รวมทุกไฟล์ต้องไม่เกิน ${limits.totalMb} MB`);
      continue;
    }
    next.push(file);
  }
  return { next, errors, offer: offer as Upsell | null, premiumOnly };
}

/** ข้อความข้อเสนอพรีเมียม — status บอกว่าควรพาไปล็อกอินหรือไปหน้าบัญชี */
export function PremiumUpsell({
  hit,
  status,
  fileClass,
}: {
  hit: Upsell;
  status: PlanStatus;
  fileClass: keyof PlanLimits['perFileMb'];
}) {
  const p = PLAN_LIMITS.premium;
  const f = PLAN_LIMITS.free;
  const what =
    hit.kind === 'perFile'
      ? `แบบฟรีรับไฟล์ละไม่เกิน ${f.perFileMb[fileClass]} MB`
      : hit.kind === 'maxFiles'
        ? `แบบฟรีรับสูงสุด ${f.maxFiles} ไฟล์ต่อครั้ง`
        : hit.kind === 'total'
          ? `แบบฟรีรับรวมไม่เกิน ${f.totalMb} MB ต่อครั้ง`
          : hit.kind === 'pages'
            ? `แบบฟรีรับ PDF รวมไม่เกิน ${f.pages} หน้า`
            : hit.kind === 'cells'
              ? `แบบฟรีรับตารางไม่เกิน ${f.cells.toLocaleString('th-TH')} ช่องข้อมูล`
              : `แบบฟรีรับเอกสารที่คลายแล้วไม่เกิน ${f.zipExpandedMb} MB`;
  const link = 'font-medium text-brand-700 underline';
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  return (
    <Alert tone="note" title={hit.name ? `${hit.name}: เกินขีดจำกัดแบบฟรี` : 'เกินขีดจำกัดแบบฟรี'}>
      <p>
        {what} · สมาชิกพรีเมียม {PREMIUM_PRICE_BAHT} บาท/เดือน รับไฟล์ละ {p.perFileMb[fileClass]} MB, {p.maxFiles} ไฟล์
        รวม {p.totalMb} MB และ PDF {p.pages.toLocaleString('th-TH')} หน้า
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {status === 'signedIn' ? (
          <a className={link} href={getAccountUrl()}>
            สมัครพรีเมียม {PREMIUM_PRICE_BAHT} บาท
          </a>
        ) : (
          <a className={link} href={getLoginUrl(path)} rel="nofollow">
            เข้าสู่ระบบด้วย Google
          </a>
        )}
        <a className={link} href={getPremiumUrl()}>
          ดูรายละเอียดพรีเมียม
        </a>
      </p>
    </Alert>
  );
}

export default function FileTool({ id }: { id: FileToolId }) {
  const config = fileTools[id];
  const multiple = 'multiple' in config && config.multiple;
  const isImage = config.category === 'images';
  const { status, plan } = usePlan();
  // ระบบปิด (off) หรือยังไม่รู้ = แพลนฟรีโดยไม่มีข้อเสนอ — เว็บทำตัวเหมือนไม่มีระบบสมาชิก
  const limits = limitsFor(status === 'signedIn' ? plan : 'anonymous');
  const canUpsell = status === 'anonymous' || (status === 'signedIn' && plan !== 'premium');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [upsell, setUpsell] = useState<Upsell | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<(Output & { url: string }) | null>(null);
  const [pages, setPages] = useState('');
  const [angle, setAngle] = useState('90');
  const [width, setWidth] = useState('1200');
  const [sheet, setSheet] = useState('1');
  const [delimiter, setDelimiter] = useState(',');
  const [format, setFormat] = useState(id === 'image-compress' ? 'image/jpeg' : 'image/png');
  const [quality, setQuality] = useState('80');
  const [flip, setFlip] = useState(false);
  const [notice, setNotice] = useState('');
  /** ไฟล์ที่พักไว้รอผลสถานะสมาชิก — ดู selectFiles */
  const [waiting, setWaiting] = useState<File[] | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const worker = useRef<Worker | null>(null);
  const controller = useRef<AbortController | null>(null);
  const version = useRef(0);
  const objectUrl = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lock = useRef(false);
  useEffect(
    () => () => {
      version.current++;
      worker.current?.terminate();
      controller.current?.abort();
      clearTimeout(timer.current);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );
  function clearResult() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = '';
    setResult(null);
    setError('');
    setUpsell(null);
    setNotice('');
  }
  function cancel() {
    version.current++;
    worker.current?.terminate();
    worker.current = null;
    controller.current?.abort();
    clearTimeout(timer.current);
    lock.current = false;
    setBusy(false);
    setNotice('ยกเลิกแล้ว เลือกไฟล์หรือลองใหม่ได้');
  }
  function fail(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }
  // สถานะสมาชิกรู้ผลแล้ว → ตรวจไฟล์ที่พักไว้ใหม่ด้วยขีดจำกัดจริง (ปรับ state ระหว่าง render แทน effect)
  if (waiting && status !== 'unknown') {
    const checked = validateSelection(waiting, multiple ? files : [], { config, limits, canUpsell, multiple });
    setWaiting(null);
    setNotice('');
    setFiles(checked.next);
    setUpsell(checked.offer);
    setError(checked.errors.join(' · '));
  }
  function selectFiles(selected: FileList | null) {
    if (!selected) return;
    clearResult();
    const incoming = Array.from(selected);
    if (picker.current) picker.current.value = '';
    const checked = validateSelection(incoming, multiple ? files : [], { config, limits, canUpsell, multiple });
    // ยังถาม /api/me อยู่ (มี hint cookie) และไฟล์เกินฟรีแต่พรีเมียมรับไหว — อาจเป็นสมาชิกพรีเมียม อย่าเพิ่งปฏิเสธ
    if (status === 'unknown' && checked.premiumOnly) {
      setWaiting(incoming);
      setNotice('กำลังตรวจสอบสถานะสมาชิก…');
      return;
    }
    setFiles(checked.next);
    setUpsell(checked.offer);
    if (checked.errors.length) fail(checked.errors.join(' · '));
  }
  function move(index: number, target: number) {
    clearResult();
    const next = [...files];
    [next[index], next[target]] = [next[target], next[index]];
    setFiles(next);
  }
  async function run() {
    if (lock.current) return;
    clearResult();
    if (files.length < (id === 'pdf-merge' ? 2 : 1)) {
      fail(id === 'pdf-merge' ? 'กรุณาเลือก PDF อย่างน้อย 2 ไฟล์' : 'กรุณาเลือกไฟล์ก่อน');
      return;
    }
    if (id === 'image-resize' && (!/^\d+$/.test(width) || +width < 1 || +width > 4096)) {
      fail('กรุณาระบุความกว้างเป็นจำนวนเต็ม 1–4096 พิกเซล');
      return;
    }
    if (id === 'excel-to-csv' && (!/^\d+$/.test(sheet) || +sheet < 1 || +sheet > 2000)) {
      fail('กรุณาระบุลำดับชีตเป็นจำนวนเต็ม 1–2000');
      return;
    }
    const options: Options = {
      pages,
      angle: +angle,
      width: +width,
      sheet: +sheet,
      delimiter,
      format,
      quality: +quality,
      flip,
    };
    lock.current = true;
    setBusy(true);
    const current = ++version.current;
    const abort = new AbortController();
    controller.current = abort;
    timer.current = setTimeout(() => {
      if (current === version.current) {
        cancel();
        fail(`ใช้เวลานานเกิน ${limits.timeoutMs / 1000} วินาที กรุณาลดขนาดไฟล์แล้วลองใหม่`);
      }
    }, limits.timeoutMs);
    try {
      let output: Output;
      if (isImage || id === 'images-to-pdf') {
        const { processImage } = await import('./image');
        output = await processImage({ id, files, options, limits }, abort.signal);
      } else {
        output = await new Promise<Output>((resolve, reject) => {
          const task = new Worker(new URL('./document.worker.ts', import.meta.url), { type: 'module' });
          worker.current = task;
          abort.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
          task.onmessage = (event: MessageEvent<WorkerReply>) => {
            if (event.data.error === undefined) return resolve(event.data.output);
            const limit = event.data.limit;
            // ชนขีดจำกัดของแพลนที่พรีเมียมรับไหว → เสนอพรีเมียมแทนข้อความผิดพลาด
            if (limit && canUpsell && premiumFits(limit.kind, limit.atLeast, config.fileClass)) {
              setUpsell({ kind: limit.kind });
              return reject(new Error(''));
            }
            reject(new Error(event.data.error));
          };
          task.onerror = () => reject(new Error('โหลดตัวแปลงไฟล์ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่'));
          task.postMessage({ id, files, options, limits });
        });
      }
      if (current !== version.current) return;
      objectUrl.current = URL.createObjectURL(output.blob);
      setResult({ ...output, url: objectUrl.current });
    } catch (cause) {
      if (current !== version.current) return;
      const message = cause instanceof Error ? cause.message : 'แปลงไฟล์ไม่สำเร็จ กรุณาลองใหม่';
      if (message) fail(message);
    } finally {
      if (current === version.current) {
        clearTimeout(timer.current);
        worker.current?.terminate();
        worker.current = null;
        lock.current = false;
        setBusy(false);
      }
    }
  }
  const hintPlan = status === 'signedIn' && plan === 'premium' ? 'พรีเมียม · ' : '';
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-brand-600/20 bg-brand-50 p-4 text-sm text-brand-700">
        ไฟล์อยู่บนอุปกรณ์ของคุณ · ไม่อัปโหลดขึ้นเซิร์ฟเวอร์
      </div>
      <p className="text-sm text-slate-600">{config.detail}</p>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <FileDrop
          ref={picker}
          id="file-input"
          label={multiple ? 'เลือกไฟล์ (เพิ่มได้หลายครั้ง)' : 'เลือกไฟล์'}
          accept={config.accept}
          multiple={multiple}
          disabled={busy}
          invalid={!!error}
          errorId="file-errors"
          prompt={
            multiple
              ? 'ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์ เพิ่มได้หลายครั้ง'
              : 'ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์'
          }
          hint={`${hintPlan}${config.accept.replaceAll('.', '').toUpperCase()} · ไฟล์ละไม่เกิน ${limits.perFileMb[config.fileClass]} MB${multiple ? ` · สูงสุด ${limits.maxFiles} ไฟล์ รวม ${limits.totalMb} MB` : ''}`}
          onFiles={selectFiles}
        />
        <SelectedFiles
          files={files}
          onMove={multiple ? move : undefined}
          onRemove={(index) => {
            clearResult();
            setFiles(files.filter((_, i) => i !== index));
          }}
        />
        {(id === 'pdf-extract' || id === 'pdf-remove-pages') && (
          <Field label={id === 'pdf-extract' ? 'หน้าที่ต้องการเก็บ' : 'หน้าที่ต้องการลบ'} htmlFor="pages">
            <Input
              id="pages"
              value={pages}
              placeholder="เช่น 1,3-5"
              onChange={(e) => {
                clearResult();
                setPages(e.target.value);
              }}
            />
          </Field>
        )}
        {(id === 'pdf-rotate' || id === 'image-rotate') && (
          <Field label="มุมหมุนตามเข็มนาฬิกา" htmlFor="angle">
            <Select
              id="angle"
              value={angle}
              onChange={(e) => {
                clearResult();
                setAngle(e.target.value);
              }}
            >
              {(id === 'image-rotate' ? [0, 90, 180, 270] : [90, 180, 270]).map((a) => (
                <option key={a} value={a}>
                  {a} องศา
                </option>
              ))}
            </Select>
          </Field>
        )}
        {id === 'image-rotate' && (
          <Checkbox
            label="กลับด้านซ้ายขวาก่อนหมุน"
            checked={flip}
            onChange={(e) => {
              clearResult();
              setFlip(e.target.checked);
            }}
          />
        )}
        {id === 'image-resize' && (
          <NumberInput
            id="width"
            label="ความกว้างใหม่"
            value={width}
            mode="numeric"
            suffix="พิกเซล"
            onValueChange={(value) => {
              clearResult();
              setWidth(value);
            }}
          />
        )}
        {id === 'excel-to-csv' && (
          <NumberInput
            id="sheet"
            label="ลำดับชีต (เริ่มจาก 1)"
            value={sheet}
            mode="numeric"
            onValueChange={(value) => {
              clearResult();
              setSheet(value);
            }}
          />
        )}
        {(id === 'excel-to-csv' || id === 'csv-to-excel') && (
          <Field label="เครื่องหมายคั่นข้อมูล CSV" htmlFor="delimiter">
            <Select
              id="delimiter"
              value={delimiter}
              onChange={(e) => {
                clearResult();
                setDelimiter(e.target.value);
              }}
            >
              <option value=",">จุลภาค (,)</option>
              <option value=";">อัฒภาค (;)</option>
              <option value={'\t'}>แท็บ</option>
            </Select>
          </Field>
        )}
        {id === 'excel-to-csv' && (
          <p className="text-xs text-slate-600">
            วันที่ส่งออกเป็น ISO 8601 และเติมเครื่องหมาย ' หน้าค่าที่อาจเป็นสูตรเพื่อป้องกันการเรียกใช้สูตรเมื่อเปิด CSV
          </p>
        )}
        {isImage && (
          <SegmentedControl
            name="format"
            legend="ชนิดไฟล์ผลลัพธ์"
            value={format}
            hint={
              format === 'image/jpeg'
                ? 'JPG ไม่เก็บความโปร่งใส ส่วนที่โปร่งจะกลายเป็นพื้นหลังขาว'
                : 'เก็บความโปร่งใสของภาพต้นฉบับไว้'
            }
            options={[
              { value: 'image/jpeg', label: 'JPG' },
              ...(id === 'image-compress' ? [] : [{ value: 'image/png', label: 'PNG' }]),
              { value: 'image/webp', label: 'WebP' },
            ]}
            onChange={(next) => {
              clearResult();
              setFormat(next);
            }}
          />
        )}
        {isImage && format !== 'image/png' && (
          <Slider
            id="quality"
            label="คุณภาพรูป"
            value={quality}
            min={10}
            max={100}
            step={5}
            suffix="%"
            onValueChange={(next) => {
              clearResult();
              setQuality(next);
            }}
          />
        )}
      </fieldset>
      <div id="file-errors" ref={errorRef} tabIndex={-1}>
        {error && <ErrorText>{error}</ErrorText>}
      </div>
      {upsell && <PremiumUpsell hit={upsell} status={status} fileClass={config.fileClass} />}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void run()} disabled={busy || !!waiting} aria-busy={busy}>
          {config.action}
        </Button>
        {busy ? (
          <Button variant="secondary" onClick={cancel}>
            ยกเลิก
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={!files.length && !error && !upsell}
            onClick={() => {
              clearResult();
              setFiles([]);
              setWaiting(null);
              if (picker.current) picker.current.value = '';
              picker.current?.focus();
            }}
          >
            ล้างไฟล์
          </Button>
        )}
      </div>
      <div role="status" aria-live="polite" className="text-sm text-slate-600">
        {busy ? 'กำลังประมวลผล… คุณสามารถยกเลิกได้' : result ? 'สร้างไฟล์สำเร็จ พร้อมดาวน์โหลด' : notice}
      </div>
      {result && (
        <section aria-label="ผลลัพธ์" className="space-y-3 rounded-xl border border-brand-600/20 bg-brand-50 p-4">
          <p className="break-words font-medium">{result.summary}</p>
          <p className="text-sm text-slate-600">
            ต้นฉบับ {fileSize(files.reduce((sum, file) => sum + file.size, 0))} · ผลลัพธ์ {fileSize(result.blob.size)}
          </p>
          {result.blob.type.startsWith('image/') && (
            <img src={result.url} alt="รูปภาพผลลัพธ์" className="mx-auto max-h-72 max-w-full object-contain" />
          )}
          {result.text && (
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface p-3 text-sm">
              {result.text}
              {result.text.length >= 5000 ? '\n…แสดงตัวอย่าง 5,000 ตัวอักษรแรก ดาวน์โหลดเพื่อดูทั้งหมด' : ''}
            </pre>
          )}
          <a
            href={result.url}
            download={result.name}
            className="product-button inline-flex max-w-full break-all bg-action px-4 py-2 text-sm font-medium text-white hover:bg-action-hover"
          >
            ดาวน์โหลด {result.name}
          </a>
        </section>
      )}
    </div>
  );
}
