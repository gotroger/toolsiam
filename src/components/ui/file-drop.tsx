import { useEffect, useRef, useState } from 'react';
import { fileSize } from '@/lib/format';
import { Button } from './button';
import { Label } from './form';
import { cx } from './styles';

/** ไอคอนเส้นชุดเดียวกับที่อื่นของเว็บ — ไม่ใช้อิโมจิเพราะแต่ละ OS วาดคนละแบบ */
function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}

const uploadPath = 'M12 16V4m0 0L8 8m4-4 4 4M4 15v2.5A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V15';
const documentPath = 'M14 3v5h5M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z';

interface FileDropProps {
  id: string;
  /** ข้อความ label ของช่อง — เป็นชื่อที่ screen reader อ่านให้ input ตัวจริง */
  label: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  hint?: string;
  invalid?: boolean;
  /** ข้อความชวนในกรอบ ปรับได้ต่อเครื่องมือ เช่น "ลากรูปที่มี QR มาวางที่นี่" */
  prompt?: string;
  /** id ของกล่องข้อความผิดพลาดที่อยู่นอก component เพื่อผูกกลับเข้า aria-describedby */
  errorId?: string;
  onFiles: (files: FileList) => void;
  ref?: React.Ref<HTMLInputElement>;
}

/**
 * พื้นที่ลากไฟล์มาวาง ใช้ร่วมกันทุกเครื่องมือที่รับไฟล์
 *
 * โครงเป็น `<label>` ห่อ `<input type="file">` ที่ซ่อนแบบ `sr-only` ไม่ใช่ `hidden`
 * เพราะการลากวางเป็นทางเลือกเสริม ไม่ใช่ทางเดียว — คีย์บอร์ดต้อง Tab มาหยุดที่ช่องนี้
 * แล้วกด Enter/Space เปิดหน้าต่างเลือกไฟล์ได้เองตามปกติของเบราว์เซอร์
 * (การใช้ `<div onClick>` เปิด picker จะทำให้คีย์บอร์ดเข้าไม่ถึงเลย)
 *
 * ตัวกรองชนิดและขนาดไฟล์ไม่ได้อยู่ที่นี่ — ผู้เรียกเป็นคนตรวจ เพราะแต่ละเครื่องมือ
 * มีขีดจำกัดและข้อความผิดพลาดของตัวเอง
 */
export function FileDrop({
  id,
  label,
  accept,
  multiple,
  disabled,
  hint,
  invalid,
  prompt,
  errorId,
  onFiles,
  ref,
}: FileDropProps) {
  const [dragging, setDragging] = useState(false);
  /** นับความลึกของ dragenter/dragleave เพราะเมาส์ผ่าน element ลูกก็ยิง dragleave ด้วย */
  const depth = useRef(0);
  function stopDragging() {
    depth.current = 0;
    setDragging(false);
  }
  return (
    <div>
      <Label id={`${id}-label`} htmlFor={id}>
        {label}
      </Label>
      <label
        htmlFor={id}
        data-testid="file-drop-zone"
        data-dragging={dragging}
        className={cx('block', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
        onDragEnter={(e) => {
          e.preventDefault();
          if (disabled) return;
          depth.current++;
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
        }}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1);
          if (!depth.current) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          stopDragging();
          if (disabled) return;
          const dropped = e.dataTransfer?.files;
          if (dropped?.length) onFiles(dropped);
        }}
      >
        {/* input มาก่อน content เพื่อให้ peer-focus วาดวงโฟกัสรอบกรอบได้ */}
        <input
          ref={ref}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="peer sr-only"
          aria-labelledby={`${id}-label`}
          aria-describedby={cx(`${id}-prompt`, hint && `${id}-hint`, errorId)}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            if (e.target.files?.length) onFiles(e.target.files);
          }}
        />
        <div
          className={cx(
            'product-field flex min-h-36 flex-col items-center justify-center gap-2 border-2 border-dashed px-4 py-6',
            'text-center transition-colors duration-150',
            'peer-focus:border-brand-600 peer-focus:ring-2 peer-focus:ring-brand-600/30',
            disabled && 'border-slate-200 bg-slate-100 opacity-60',
            !disabled && dragging && 'border-brand-600 bg-brand-50',
            !disabled && !dragging && 'bg-surface hover:bg-slate-50',
            !disabled && !dragging && (invalid ? 'border-red-400' : 'border-slate-300 hover:border-slate-400'),
          )}
        >
          <Icon
            path={uploadPath}
            className={cx('h-7 w-7 shrink-0', dragging && !disabled ? 'text-brand-600' : 'text-slate-400')}
          />
          <span id={`${id}-prompt`} className="text-sm font-medium text-slate-700">
            {dragging && !disabled ? 'วางไฟล์ได้เลย' : (prompt ?? 'ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์')}
          </span>
          {hint && (
            <span id={`${id}-hint`} className="text-xs text-slate-600">
              {hint}
            </span>
          )}
        </div>
      </label>
    </div>
  );
}

/** นามสกุลไฟล์แบบสั้นสำหรับไทล์ไอคอน เช่น "PDF" "XLSX" */
function extensionOf(name: string) {
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase().slice(0, 4) : 'FILE';
}

/**
 * ไทล์ 48px ของไฟล์หนึ่งไฟล์ — รูปจริงถ้าเป็นไฟล์รูป ไม่อย่างนั้นเป็นไอคอนพร้อมนามสกุล
 *
 * object URL สร้างครั้งเดียวตอน mount ด้วย lazy initializer ของ useState แล้วคืนใน
 * cleanup ของ effect จึงไม่มีทั้งการ setState ใน effect และการอ่าน ref ระหว่าง render
 * แยกเป็น component ต่อไฟล์เพราะอายุของ URL ผูกกับอายุของแถวพอดี
 */
function Thumbnail({ file }: { file: File }) {
  const isImage = file.type.startsWith('image/');
  const [url] = useState(() => (isImage ? URL.createObjectURL(file) : ''));
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  if (!isImage) {
    return (
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500"
      >
        <Icon path={documentPath} className="h-5 w-5" />
        <span className="text-[10px] font-medium leading-none">{extensionOf(file.name)}</span>
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={`ตัวอย่าง ${file.name}`}
      className="size-12 shrink-0 rounded-lg border border-slate-200 object-cover"
    />
  );
}

/**
 * รายการไฟล์ที่เลือกไว้ พร้อมรูปตัวอย่างของไฟล์รูปภาพ
 *
 * ส่ง `onMove` มาก็ต่อเมื่อลำดับไฟล์มีผลกับผลลัพธ์ (เช่น รวม PDF) — ปุ่มขึ้น/ลง
 * ใช้ได้ทั้งเมาส์ คีย์บอร์ดและ screen reader ต่างจากการลากสลับลำดับอย่างเดียว
 */
export function SelectedFiles({
  files,
  onRemove,
  onMove,
}: {
  files: File[];
  onRemove: (index: number) => void;
  onMove?: (index: number, target: number) => void;
}) {
  if (!files.length) return null;
  return (
    <ol className="space-y-2" aria-label="ไฟล์ที่เลือกตามลำดับ">
      {files.map((file, index) => (
        <li
          key={`${index}-${file.name}`}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-surface p-3"
        >
          <Thumbnail file={file} />
          <span className="min-w-0 flex-1 basis-40 break-words text-sm">
            {index + 1}. {file.name} <span className="text-slate-500">({fileSize(file.size)})</span>
          </span>
          <span className="ml-auto flex shrink-0 flex-wrap gap-2">
            {onMove && (
              <>
                <Button
                  variant="secondary"
                  disabled={index === 0}
                  aria-label={`เลื่อน ${file.name} ขึ้น`}
                  onClick={() => onMove(index, index - 1)}
                >
                  ขึ้น
                </Button>
                <Button
                  variant="secondary"
                  disabled={index === files.length - 1}
                  aria-label={`เลื่อน ${file.name} ลง`}
                  onClick={() => onMove(index, index + 1)}
                >
                  ลง
                </Button>
              </>
            )}
            <Button variant="secondary" aria-label={`นำ ${file.name} ออกจากรายการ`} onClick={() => onRemove(index)}>
              นำออก
            </Button>
          </span>
        </li>
      ))}
    </ol>
  );
}
