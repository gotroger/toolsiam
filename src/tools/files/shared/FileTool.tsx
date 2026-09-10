import { useEffect, useRef, useState } from 'react';
import {
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
import { fileTools, type FileToolId } from '../catalog';
import type { Options, Output, WorkerReply } from './types';

export default function FileTool({ id }: { id: FileToolId }) {
  const config = fileTools[id];
  const multiple = 'multiple' in config && config.multiple;
  const isImage = config.category === 'images';
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
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
  function selectFiles(selected: FileList | null) {
    if (!selected) return;
    clearResult();
    const next = multiple ? [...files] : [];
    const errors: string[] = [];
    for (const file of Array.from(selected)) {
      if (!config.accept.split(',').some((ext) => file.name.toLowerCase().endsWith(ext))) {
        errors.push(`${file.name}: ชนิดไฟล์ไม่รองรับ`);
        continue;
      }
      if (!file.size || file.size > config.limit * 1024 * 1024) {
        errors.push(`${file.name}: ต้องมีข้อมูลและขนาดไม่เกิน ${config.limit} MB`);
        continue;
      }
      if (next.length >= (multiple ? 20 : 1) || next.reduce((sum, f) => sum + f.size, file.size) > 30 * 1024 * 1024) {
        errors.push(`${file.name}: เกินขีดจำกัด 20 ไฟล์หรือรวม 30 MB`);
        continue;
      }
      next.push(file);
    }
    setFiles(next);
    if (errors.length) fail(errors.join(' · '));
    if (picker.current) picker.current.value = '';
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
        fail('ใช้เวลานานเกิน 60 วินาที กรุณาลดขนาดไฟล์แล้วลองใหม่');
      }
    }, 60_000);
    try {
      let output: Output;
      if (isImage || id === 'images-to-pdf') {
        const { processImage } = await import('./image');
        output = await processImage({ id, files, options }, abort.signal);
      } else {
        output = await new Promise<Output>((resolve, reject) => {
          const task = new Worker(new URL('./document.worker.ts', import.meta.url), { type: 'module' });
          worker.current = task;
          abort.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
          task.onmessage = (event: MessageEvent<WorkerReply>) =>
            event.data.error !== undefined ? reject(new Error(event.data.error)) : resolve(event.data.output);
          task.onerror = () => reject(new Error('โหลดตัวแปลงไฟล์ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่'));
          task.postMessage({ id, files, options });
        });
      }
      if (current !== version.current) return;
      objectUrl.current = URL.createObjectURL(output.blob);
      setResult({ ...output, url: objectUrl.current });
    } catch (cause) {
      if (current === version.current) fail(cause instanceof Error ? cause.message : 'แปลงไฟล์ไม่สำเร็จ กรุณาลองใหม่');
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
          hint={`${config.accept.replaceAll('.', '').toUpperCase()} · ไฟล์ละไม่เกิน ${config.limit} MB${multiple ? ' · สูงสุด 20 ไฟล์ รวม 30 MB' : ''}`}
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
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void run()} disabled={busy} aria-busy={busy}>
          {config.action}
        </Button>
        {busy ? (
          <Button variant="secondary" onClick={cancel}>
            ยกเลิก
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={!files.length && !error}
            onClick={() => {
              clearResult();
              setFiles([]);
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
