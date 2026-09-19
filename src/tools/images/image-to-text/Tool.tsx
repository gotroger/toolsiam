import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  CopyButton,
  ErrorText,
  FileDrop,
  ProgressBar,
  SegmentedControl,
  SelectedFiles,
  Textarea,
} from '@/components/ui';
import { ACCEPT, MAX_FILES, MAX_MB, prepareImage, validateFiles } from './image';
import { joinResults, outputFileName } from './text';
import type { OcrEngine, OcrLanguage, OcrPageResult } from './types';

export const TESSERACT_CREDIT = 'อ่านข้อความด้วย Tesseract OCR และ tesseract.js (Apache License 2.0)';
export const TESSERACT_SOURCE = 'https://github.com/naptha/tesseract.js';

/** ต่ำกว่านี้ถือว่าผลไม่น่าเชื่อ — แสดงคำแนะนำวิธีถ่ายรูปใหม่ */
const LOW_CONFIDENCE = 60;

type Phase = { kind: 'loading'; percent: number } | { kind: 'reading'; index: number; percent: number };

export default function ImageToTextTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [language, setLanguage] = useState<OcrLanguage>('tha+eng');
  const [tidy, setTidy] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading', percent: 0 });
  const [pages, setPages] = useState<OcrPageResult[]>([]);
  /** ข้อความที่ผู้ใช้แก้เองในกล่อง — null = ยังไม่แก้ ให้ใช้ผลที่ประกอบจาก pages */
  const [edited, setEdited] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const picker = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const engine = useRef<OcrEngine | null>(null);
  const version = useRef(0);
  const lock = useRef(false);
  const index = useRef(0);

  useEffect(
    () => () => {
      version.current++;
      engine.current?.terminate();
    },
    [],
  );

  const assembled = useMemo(() => joinResults(pages, tidy), [pages, tidy]);
  const text = edited ?? assembled;
  const failed = pages.filter((page) => page.error);
  const unsure = pages.filter((page) => !page.error && page.confidence < LOW_CONFIDENCE);

  function clearResult() {
    setPages([]);
    setEdited(null);
    setError('');
    setNotice('');
  }
  function fail(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }
  function selectFiles(list: FileList) {
    clearResult();
    const next = [...files, ...Array.from(list)];
    const message = validateFiles(next);
    if (message) {
      if (picker.current) picker.current.value = '';
      return fail(message);
    }
    setFiles(next);
  }
  function removeFile(at: number) {
    clearResult();
    setFiles(files.filter((_, i) => i !== at));
    if (picker.current) picker.current.value = '';
  }
  function cancel() {
    version.current++;
    engine.current?.terminate();
    engine.current = null;
    lock.current = false;
    setBusy(false);
    setNotice('ยกเลิกแล้ว ผลของรูปที่อ่านเสร็จก่อนหน้ายังอยู่');
  }

  async function run() {
    if (lock.current) return;
    const message = validateFiles(files);
    if (message) return fail(message);
    lock.current = true;
    const current = ++version.current;
    const alive = () => version.current === current;
    clearResult();
    setBusy(true);
    setPhase({ kind: 'loading', percent: 0 });
    try {
      if (!engine.current) {
        const { createEngine } = await import('./engine');
        if (!alive()) return;
        engine.current = createEngine({
          onLoad: (fraction) => alive() && setPhase({ kind: 'loading', percent: fraction * 100 }),
          onProgress: (fraction) =>
            alive() && setPhase({ kind: 'reading', index: index.current, percent: fraction * 100 }),
        });
      }
      const done: OcrPageResult[] = [];
      for (const [i, file] of files.entries()) {
        index.current = i;
        let canvas: HTMLCanvasElement | null = null;
        try {
          const image = await prepareImage(file);
          if (!alive()) return;
          if (image instanceof HTMLCanvasElement) canvas = image;
          const result = await engine.current.recognize(image, language);
          if (!alive()) return;
          done.push(
            result.text.trim()
              ? { name: file.name, ...result }
              : { name: file.name, text: '', confidence: 0, error: 'ไม่พบข้อความในรูปนี้' },
          );
        } catch (cause) {
          if (!alive()) return;
          const reason = cause instanceof Error ? cause.message : '';
          // โหลด engine ไม่ขึ้น = ทั้งชุดไปต่อไม่ได้ ต่างจากรูปเสียรูปเดียวที่ข้ามได้
          if (reason.startsWith('โหลดตัวอ่านข้อความ')) throw cause;
          done.push({ name: file.name, text: '', confidence: 0, error: reason || 'อ่านรูปนี้ไม่สำเร็จ' });
        } finally {
          if (canvas) canvas.width = canvas.height = 0;
        }
        // แสดงผลทีละรูป — ยกเลิกกลางชุดแล้วผลที่เสร็จยังอยู่
        setPages([...done]);
      }
      const readable = done.filter((page) => !page.error).length;
      if (!readable) fail('อ่านข้อความไม่ได้เลย ลองใช้รูปที่ตัวหนังสือชัดและตั้งตรง');
      else {
        setNotice(`อ่านเสร็จ ${readable} จาก ${done.length} รูป`);
        requestAnimationFrame(() => resultRef.current?.focus());
      }
    } catch (cause) {
      if (!alive()) return;
      engine.current?.terminate();
      engine.current = null;
      fail(cause instanceof Error ? cause.message : 'อ่านข้อความไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      if (alive()) {
        lock.current = false;
        setBusy(false);
      }
    }
  }

  function download() {
    // BOM ให้ Notepad บน Windows เปิดภาษาไทยถูก
    const url = URL.createObjectURL(
      new Blob([String.fromCharCode(0xfeff), text], { type: 'text/plain;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = outputFileName(files.map((file) => file.name));
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-brand-600/20 bg-brand-50 p-4 text-sm text-brand-700">
        รูปอยู่บนอุปกรณ์ของคุณ · ไม่อัปโหลดขึ้นเซิร์ฟเวอร์ · ครั้งแรกจะโหลดตัวอ่านข้อความราว 5 MB
      </div>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <FileDrop
          ref={picker}
          id="file-input"
          label="เลือกรูป"
          accept={ACCEPT}
          multiple
          disabled={busy}
          invalid={!!error}
          errorId="file-errors"
          hint={`JPG PNG WebP · ไม่เกิน ${MAX_MB} MB ต่อรูป · สูงสุด ${MAX_FILES} รูป`}
          onFiles={selectFiles}
        />
        <SelectedFiles files={files} onRemove={removeFile} />
        <SegmentedControl
          name="language"
          legend="ภาษาในรูป"
          value={language}
          options={[
            { value: 'tha+eng', label: 'ไทย + อังกฤษ' },
            { value: 'tha', label: 'ไทย' },
            { value: 'eng', label: 'อังกฤษ' },
          ]}
          hint="เลือกภาษาเดียวเมื่อในรูปมีภาษาเดียว จะโหลดน้อยลงและแม่นขึ้น"
          onChange={(next) => {
            clearResult();
            setLanguage(next as OcrLanguage);
          }}
        />
      </fieldset>
      <div id="file-errors" ref={errorRef} tabIndex={-1}>
        {error && <ErrorText>{error}</ErrorText>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={run}>
          อ่านข้อความจากรูป
        </Button>
        {busy && (
          <Button variant="secondary" onClick={cancel}>
            ยกเลิก
          </Button>
        )}
      </div>
      {busy &&
        (phase.kind === 'loading' ? (
          <ProgressBar
            id="progress"
            label="กำลังโหลดตัวอ่านข้อความ"
            value={phase.percent}
            detail="ครั้งแรกเท่านั้น ครั้งถัดไปเบราว์เซอร์จำไว้แล้ว"
          />
        ) : (
          <ProgressBar
            id="progress"
            label={`กำลังอ่านรูปที่ ${phase.index + 1}/${files.length}`}
            value={phase.percent}
            detail="รูปใหญ่หรือมือถือรุ่นเก่าอาจใช้เวลาหลายสิบวินาทีต่อรูป"
          />
        ))}
      <div role="status" aria-live="polite" className="text-sm text-slate-600">
        {busy ? 'กำลังอ่านข้อความ… คุณสามารถยกเลิกได้' : notice}
      </div>
      {pages.some((page) => !page.error) && (
        <section
          ref={resultRef}
          tabIndex={-1}
          aria-label="ผลลัพธ์"
          className="space-y-3 rounded-xl border border-brand-600/20 bg-brand-50 p-4"
        >
          <label htmlFor="ocr-text" className="block font-medium">
            ข้อความที่อ่านได้ <span className="text-sm font-normal text-slate-600">(แก้ไขได้ก่อนคัดลอก)</span>
          </label>
          <Textarea
            id="ocr-text"
            value={text}
            rows={8}
            spellCheck={false}
            onChange={(event) => setEdited(event.target.value)}
          />
          <Checkbox
            label="จัดช่องว่างภาษาไทย (ลบช่องว่างที่แทรกกลางคำ)"
            checked={tidy}
            onChange={(event) => {
              setTidy(event.target.checked);
              // สลับแล้วกลับไปใช้ผลที่ประกอบใหม่ — ไม่ต้องอ่านรูปซ้ำ
              setEdited(null);
            }}
          />
          <ul className="space-y-1 text-sm text-slate-600">
            {pages.map((page) => (
              <li key={page.name} className="break-words">
                {page.name} — {page.error ?? `ความมั่นใจ ${Math.round(page.confidence)}%`}
              </li>
            ))}
          </ul>
          {/* ผลทดสอบ 20 ก.ย. 2569: ความมั่นใจ 90%+ ก็ยังมีตัวเลขและวรรณยุกต์ผิด (docs/image-to-text-verification.md) */}
          <p className="text-sm text-slate-600">
            ความมั่นใจสูงไม่ได้แปลว่าถูกทุกตัว — เทียบตัวเลข ชื่อ และวรรณยุกต์กับรูปต้นฉบับก่อนนำไปใช้
          </p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={text} label="คัดลอกข้อความ" />
            <Button variant="secondary" onClick={download}>
              ดาวน์โหลด .txt
            </Button>
          </div>
        </section>
      )}
      {(unsure.length > 0 || (failed.length > 0 && failed.length < pages.length)) && (
        <Alert title="บางรูปอ่านได้ไม่ชัด">
          ตรวจทานข้อความก่อนนำไปใช้ ถ้าผิดมากให้ถ่ายใหม่ให้ตั้งตรง แสงสว่างพอ ตัวหนังสือไม่เล็กเกินไป หรือ
          <a href="/tools/image-rotate" className="underline">
            หมุนรูปให้ตรง
          </a>
          ก่อนอ่าน
        </Alert>
      )}
      <p className="text-xs text-slate-500">
        {TESSERACT_CREDIT} ·{' '}
        <a href={TESSERACT_SOURCE} rel="noopener noreferrer" target="_blank" className="underline">
          ซอร์สโค้ด
        </a>
      </p>
    </div>
  );
}
