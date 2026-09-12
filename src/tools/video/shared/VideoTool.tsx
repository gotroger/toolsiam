import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Checkbox,
  ErrorText,
  Field,
  FileDrop,
  Input,
  ProgressBar,
  SegmentedControl,
  SelectedFiles,
} from '@/components/ui';
import { fileSize } from '@/lib/format';
import { FFMPEG_CREDIT, FFMPEG_SOURCE, videoTools } from '../catalog';
import {
  ACCEPT,
  buildJob,
  DEFAULT_OPTIONS,
  inputExt,
  MAX_GIF_SECONDS,
  MAX_INPUT_MB,
  type VideoOptions,
  type VideoToolId,
} from './args';
import { formatTimecode, parseTimecode } from './timecode';
import type { Engine } from './types';

type Phase =
  { kind: 'idle' } | { kind: 'loading'; loaded: number; total: number } | { kind: 'working'; percent: number | null };
interface Result {
  url: string;
  name: string;
  mime: string;
  size: number;
}
/** เพดานแข็ง — งานที่นานกว่านี้แทบแน่ว่าแท็บจะถูกฆ่าก่อนเสร็จอยู่ดี */
const HARD_LIMIT_MS = 15 * 60_000;
const NOTICE_IDLE = 'เลือกไฟล์แล้วกดปุ่มเพื่อเริ่ม';

/** ช่องเวลา + ปุ่มดึงเวลาปัจจุบันจากตัวอย่างวิดีโอ — แยกเป็น component เพื่อไม่สร้าง callback ที่แตะ ref ระหว่าง render */
function TimeField({
  label,
  id,
  value,
  placeholder,
  canUseCurrent,
  onChange,
  onUseCurrent,
}: {
  label: string;
  id: string;
  value: string;
  placeholder: string;
  canUseCurrent: boolean;
  onChange: (value: string) => void;
  onUseCurrent: () => void;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          inputMode="decimal"
          onChange={(e) => onChange(e.target.value)}
        />
        <Button variant="secondary" className="shrink-0" disabled={!canUseCurrent} onClick={onUseCurrent}>
          ใช้เวลาปัจจุบัน
        </Button>
      </div>
    </Field>
  );
}

/**
 * UI ร่วมของเครื่องมือวิดีโอที่ใช้ ffmpeg — keyed ด้วย id แบบเดียวกับ FileTool
 *
 * ต่างจาก FileTool ตรงที่ไม่มี timeout 60 วินาที (ใช้ progress + ยกเลิกแทน) และ engine อยู่ต่อหลังสำเร็จ
 * เพื่อให้ลองค่าใหม่ได้โดยไม่โหลด core ซ้ำ · terminate เมื่อยกเลิก ผิดพลาด หรือ unmount
 * engine.ts ถูก import แบบ dynamic เท่านั้น เพื่อไม่ให้ worker หลุดเข้า chunk ที่ hydrate
 */
export default function VideoTool({ id }: { id: VideoToolId }) {
  const config = videoTools[id];
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [start, setStart] = useState('0:00');
  const [end, setEnd] = useState('');
  const [gifLength, setGifLength] = useState('5');
  const [precise, setPrecise] = useState(false);
  const [bitrate, setBitrate] = useState('192');
  const [gifWidth, setGifWidth] = useState('320');
  const [gifFps, setGifFps] = useState('10');
  const [preset, setPreset] = useState('720');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(NOTICE_IDLE);
  const [result, setResult] = useState<Result | null>(null);
  const engine = useRef<Engine | null>(null);
  const version = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const objectUrl = useRef('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const busy = phase.kind !== 'idle';
  const needsRange = id === 'video-trim' || id === 'video-to-gif';

  useEffect(
    () => () => {
      engine.current?.terminate();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function clearResult() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = '';
    setResult(null);
    setError('');
  }
  function fail(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }
  function dropEngine() {
    engine.current?.terminate();
    engine.current = null;
  }
  function cancel() {
    version.current++;
    clearTimeout(timer.current);
    dropEngine();
    setPhase({ kind: 'idle' });
    setNotice('ยกเลิกแล้ว ปรับค่าหรือลองใหม่ได้');
  }
  function selectFiles(list: FileList | null) {
    const picked = list?.[0];
    if (!picked) return;
    clearResult();
    if (picker.current) picker.current.value = '';
    if (!ACCEPT.split(',').some((ext) => picked.name.toLowerCase().endsWith(ext))) {
      fail(`${picked.name}: ชนิดไฟล์ไม่รองรับ ใช้ MP4 MOV M4V หรือ WebM`);
      return;
    }
    if (!picked.size || picked.size > MAX_INPUT_MB * 1024 * 1024) {
      fail(`${picked.name}: ต้องมีข้อมูลและขนาดไม่เกิน ${MAX_INPUT_MB} MB`);
      return;
    }
    setFile(picked);
    setDuration(null);
    setEnd('');
    setPreview(URL.createObjectURL(picked));
    setNotice(NOTICE_IDLE);
  }
  function removeFile() {
    clearResult();
    setFile(null);
    setPreview('');
    setDuration(null);
  }
  function applyCurrentTime(setter: (value: string) => void) {
    const t = videoRef.current?.currentTime;
    if (typeof t === 'number' && Number.isFinite(t)) {
      clearResult();
      setter(formatTimecode(t));
    }
  }

  async function run() {
    if (busy) return;
    clearResult();
    if (!file) {
      fail('กรุณาเลือกไฟล์ก่อน');
      return;
    }
    let spec;
    try {
      let options: VideoOptions = {
        ...DEFAULT_OPTIONS,
        precise,
        bitrate: +bitrate as VideoOptions['bitrate'],
        gifWidth: +gifWidth as VideoOptions['gifWidth'],
        gifFps: +gifFps as VideoOptions['gifFps'],
        preset: +preset as VideoOptions['preset'],
      };
      if (needsRange) {
        const s = parseTimecode(start);
        const e =
          id === 'video-to-gif'
            ? s + parseTimecode(gifLength)
            : parseTimecode(end || (duration !== null ? formatTimecode(duration) : ''));
        if (duration !== null && e > duration + 0.5) {
          throw new Error(`เวลาจบเกินความยาวคลิป (${formatTimecode(duration)})`);
        }
        options = { ...options, start: s, end: e };
      }
      spec = buildJob(id, file.name, options);
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : 'ค่าที่กรอกไม่ถูกต้อง');
      return;
    }
    const expected = spec.expectedSeconds ?? duration;
    const current = ++version.current;
    setPhase({ kind: 'loading', loaded: 0, total: 0 });
    timer.current = setTimeout(() => {
      if (current === version.current) {
        cancel();
        fail('ใช้เวลานานเกิน 15 นาที กรุณาเลือกช่วงที่สั้นลงหรือไฟล์ที่เล็กลง');
      }
    }, HARD_LIMIT_MS);
    try {
      const { createEngine } = await import('./engine');
      if (current !== version.current) return;
      engine.current ??= createEngine({
        onLoad: (loaded, total) => {
          if (current === version.current) setPhase({ kind: 'loading', loaded, total });
        },
        onProgress: (seconds) => {
          if (current !== version.current) return;
          setPhase({ kind: 'working', percent: expected ? Math.min(99, (seconds / expected) * 100) : null });
        },
      });
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (current !== version.current) return;
      setPhase({ kind: 'working', percent: expected ? 0 : null });
      const output = await engine.current.run({
        input: { name: `in.${inputExt(file.name)}`, bytes },
        args: spec.args,
        output: { name: spec.args[spec.args.length - 1], mime: spec.mime },
      });
      if (current !== version.current) return;
      const blob = new Blob([output.bytes], { type: output.mime });
      objectUrl.current = URL.createObjectURL(blob);
      setResult({ url: objectUrl.current, name: spec.output, mime: output.mime, size: blob.size });
      setNotice('สร้างไฟล์สำเร็จ พร้อมดาวน์โหลด');
    } catch (cause) {
      if (current !== version.current) return;
      dropEngine();
      fail(cause instanceof Error && cause.message !== 'cancelled' ? cause.message : 'แปลงไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      if (current === version.current) {
        clearTimeout(timer.current);
        setPhase({ kind: 'idle' });
      }
    }
  }

  const showSizeCompare = file && (id === 'video-trim' || id === 'video-compress');

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-brand-600/20 bg-brand-50 p-4 text-sm text-brand-700">
        ไฟล์อยู่บนอุปกรณ์ของคุณ · ไม่อัปโหลดขึ้นเซิร์ฟเวอร์ · ครั้งแรกจะโหลดตัวประมวลผลราว 10 MB
      </div>
      <p className="text-sm text-slate-600">{config.detail}</p>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <FileDrop
          ref={picker}
          id="file-input"
          label="เลือกไฟล์"
          accept={ACCEPT}
          disabled={busy}
          invalid={!!error}
          errorId="file-errors"
          hint={`MP4 MOV M4V WEBM · ไม่เกิน ${MAX_INPUT_MB} MB`}
          onFiles={selectFiles}
        />
        {file && <SelectedFiles files={[file]} onRemove={removeFile} />}
        {preview && (
          <video
            ref={videoRef}
            src={preview}
            controls
            preload="metadata"
            playsInline
            className="max-h-80 w-full rounded-xl bg-black"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              setDuration(Number.isFinite(d) ? d : null);
            }}
            onError={() => setDuration(null)}
          >
            <track kind="captions" />
          </video>
        )}
        {preview && duration === null && (
          <p className="text-xs text-slate-600">
            ดูตัวอย่างไม่ได้ในเบราว์เซอร์นี้ แต่ยังแปลงได้ (จะไม่แสดงเปอร์เซ็นต์ความคืบหน้า)
          </p>
        )}
        {needsRange && (
          <TimeField
            label="เวลาเริ่ม"
            id="start"
            value={start}
            placeholder="0:00"
            canUseCurrent={duration !== null}
            onChange={(next) => {
              clearResult();
              setStart(next);
            }}
            onUseCurrent={() => applyCurrentTime(setStart)}
          />
        )}
        {id === 'video-trim' && (
          <TimeField
            label="เวลาจบ"
            id="end"
            value={end}
            placeholder={duration !== null ? formatTimecode(duration) : 'เช่น 1:30'}
            canUseCurrent={duration !== null}
            onChange={(next) => {
              clearResult();
              setEnd(next);
            }}
            onUseCurrent={() => applyCurrentTime(setEnd)}
          />
        )}
        {id === 'video-trim' && (
          <Checkbox
            label="ตัดแม่นยำถึงวินาที (เข้ารหัสใหม่ ช้ากว่า)"
            checked={precise}
            onChange={(e) => {
              clearResult();
              setPrecise(e.target.checked);
            }}
          />
        )}
        {id === 'video-to-gif' && (
          <Field label="ระยะเวลา" htmlFor="gif-length" hint={`วินาที ไม่เกิน ${MAX_GIF_SECONDS}`}>
            <Input
              id="gif-length"
              value={gifLength}
              inputMode="decimal"
              aria-describedby="gif-length-hint"
              onChange={(e) => {
                clearResult();
                setGifLength(e.target.value);
              }}
            />
          </Field>
        )}
        {id === 'video-to-gif' && (
          <SegmentedControl
            name="gif-width"
            legend="ความกว้าง"
            value={gifWidth}
            options={[
              { value: '240', label: '240 px' },
              { value: '320', label: '320 px' },
              { value: '480', label: '480 px' },
            ]}
            onChange={(next) => {
              clearResult();
              setGifWidth(next);
            }}
          />
        )}
        {id === 'video-to-gif' && (
          <SegmentedControl
            name="gif-fps"
            legend="เฟรมต่อวินาที"
            value={gifFps}
            options={[
              { value: '10', label: '10 fps' },
              { value: '15', label: '15 fps' },
            ]}
            onChange={(next) => {
              clearResult();
              setGifFps(next);
            }}
          />
        )}
        {id === 'video-to-mp3' && (
          <SegmentedControl
            name="bitrate"
            legend="บิตเรต"
            value={bitrate}
            options={[
              { value: '128', label: '128 kbps' },
              { value: '192', label: '192 kbps' },
              { value: '320', label: '320 kbps' },
            ]}
            onChange={(next) => {
              clearResult();
              setBitrate(next);
            }}
          />
        )}
        {id === 'video-compress' && (
          <SegmentedControl
            name="preset"
            legend="ความละเอียดสูงสุด"
            value={preset}
            options={[
              { value: '480', label: '480p' },
              { value: '720', label: '720p' },
              { value: '1080', label: '1080p' },
            ]}
            hint="คลิปที่เล็กกว่าจะไม่ถูกขยาย"
            onChange={(next) => {
              clearResult();
              setPreset(next);
            }}
          />
        )}
      </fieldset>
      <div id="file-errors" ref={errorRef} tabIndex={-1}>
        {error && <ErrorText>{error}</ErrorText>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={run}>
          {config.action}
        </Button>
        {busy && (
          <Button variant="secondary" onClick={cancel}>
            ยกเลิก
          </Button>
        )}
      </div>
      {busy && (
        <div className="space-y-2">
          {phase.kind === 'loading' ? (
            <ProgressBar
              id="progress"
              label="กำลังโหลดตัวประมวลผล"
              value={phase.total ? (phase.loaded / phase.total) * 100 : null}
              detail={
                phase.total
                  ? `${fileSize(phase.loaded)} / ${fileSize(phase.total)}`
                  : 'ครั้งแรกเท่านั้น ครั้งถัดไปเบราว์เซอร์จำไว้แล้ว'
              }
            />
          ) : (
            <ProgressBar
              id="progress"
              label="กำลังแปลง"
              value={phase.kind === 'working' ? phase.percent : null}
              detail={config.slow || precise ? 'บนมือถืออาจใช้เวลาใกล้เคียงความยาวคลิป' : undefined}
            />
          )}
        </div>
      )}
      <div role="status" aria-live="polite" className="text-sm text-slate-600">
        {busy ? 'กำลังประมวลผล… คุณสามารถยกเลิกได้' : notice}
      </div>
      {result && (
        <section aria-label="ผลลัพธ์" className="space-y-3 rounded-xl border border-brand-600/20 bg-brand-50 p-4">
          <p className="break-words font-medium">{result.name}</p>
          <p className="text-sm text-slate-600">
            {showSizeCompare
              ? `ต้นฉบับ ${fileSize(file.size)} · ผลลัพธ์ ${fileSize(result.size)}`
              : `ขนาด ${fileSize(result.size)}`}
          </p>
          {result.mime.startsWith('video/') && (
            <video src={result.url} controls playsInline className="max-h-80 w-full rounded-lg bg-black">
              <track kind="captions" />
            </video>
          )}
          {result.mime.startsWith('audio/') && (
            <audio src={result.url} controls className="w-full">
              <track kind="captions" />
            </audio>
          )}
          {result.mime === 'image/gif' && (
            <img src={result.url} alt="ตัวอย่าง GIF ที่สร้าง" className="mx-auto max-h-72 max-w-full object-contain" />
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
      <p className="text-xs text-slate-500">
        {FFMPEG_CREDIT} ·{' '}
        <a href={FFMPEG_SOURCE} rel="noopener noreferrer" target="_blank" className="underline">
          ซอร์สโค้ด
        </a>
      </p>
    </div>
  );
}
