import { useLayoutEffect, useRef } from 'react';
import type {
  ComponentPropsWithRef,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { checkboxField, checkboxRow, cx, field, labelText } from './styles';

export function Input({ className, ...props }: ComponentPropsWithRef<'input'>) {
  return <input {...props} className={cx(field, className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const resize = () => {
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight + 2}px`;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [props.value]);
  return <textarea {...props} ref={ref} className={cx(field, 'resize-none font-mono text-sm', className)} />;
}

/**
 * ช่องเลือกแบบ dropdown — ยังเป็น `<select>` เนทีฟ popup จึงเป็นของ OS
 * มือถือได้ตัวเลือกแบบเนทีฟ และคีย์บอร์ดทำงานเหมือนช่องเลือกทุกที่ในเครื่อง
 *
 * ปิดลูกศรของระบบด้วย `appearance-none` แล้ววาด chevron เองทับไว้ เลือกวิธีนี้แทน
 * `background-image` เพราะ SVG ที่ฝังใน CSS ต้องระบุสีตายตัว ตามธีมมืด/สว่างไม่ได้
 *
 * `wrapperClassName` มีไว้ให้ช่องที่ไม่ต้องการเต็มความกว้าง เพราะ chevron วางตำแหน่ง
 * เทียบกับตัวห่อ ถ้าตัวห่อกว้างกว่า select ลูกศรจะลอยหลุดไปจากช่อง
 */
export function Select({
  className,
  wrapperClassName,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }) {
  return (
    <div className={cx('relative', wrapperClassName ?? 'w-full')}>
      <select {...props} className={cx(field, 'appearance-none pr-10', className)} />
      <svg
        className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-slate-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cx('mb-1', labelText, className)} />;
}

/** ข้อความผิดพลาด — ไม่สื่อด้วยสีอย่างเดียว มีคำว่า "ข้อผิดพลาด" กำกับเสมอ (A6) */
export function ErrorText({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1.5 text-sm text-red-600">
      {/* ไอคอนเส้นชุดเดียวกับที่อื่นของเว็บ — เลิกใช้อิโมจิเพราะแต่ละ OS วาดคนละแบบ */}
      <svg
        className="mt-0.5 h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 4.5 21 19.5H3L12 4.5Zm0 5.5v4.2m0 2.6v.2" />
      </svg>
      <span>
        <span className="font-medium">ข้อผิดพลาด:</span> {children}
      </span>
    </p>
  );
}

/**
 * ห่อ input หนึ่งช่องพร้อม label / hint / error
 *
 * `describedBy` คือ id ที่ต้องผูกกลับเข้า input ด้วย `aria-describedby` (A4)
 * ช่องที่ใช้ `<Input>` ตรง ๆ ต้องส่งเอง ส่วน `<NumberInput>` ผูกให้อัตโนมัติ
 */
export function Field({
  label,
  htmlFor,
  children,
  hint,
  error,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && (
        <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-slate-600">
          {hint}
        </p>
      )}
      {error && <ErrorText id={`${htmlFor}-error`}>{error}</ErrorText>}
    </div>
  );
}

/** id ของ hint/error ที่มีอยู่จริง สำหรับผูกเข้า aria-describedby */
export function describedBy(id: string, opts: { hint?: string; error?: string }): string | undefined {
  const ids = [opts.hint && `${id}-hint`, opts.error && `${id}-error`].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

interface NumberInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'inputMode' | 'id'
> {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  /** บังคับให้เลือก: decimal สำหรับเงิน/ทศนิยม · numeric สำหรับจำนวนเต็ม (A7) */
  mode: 'decimal' | 'numeric';
  hint?: string;
  error?: string;
  /** หน่วยที่แสดงชิดขวาในช่อง เช่น "บาท" "%" "ปี" */
  suffix?: string;
}

/**
 * ช่องกรอกตัวเลข — เป็น `type="text"` โดยตั้งใจ
 *
 * `type="number"` บนมือถือทำให้เลื่อนหน้าจอแล้วค่าเปลี่ยน ตัดคอมมาที่ผู้ใช้ไทยพิมพ์ทิ้ง
 * และแสดง spinner ที่ไม่มีใครใช้ — `inputMode` ให้แป้นตัวเลขได้โดยไม่มีผลข้างเคียงเหล่านั้น
 */
export function NumberInput({
  id,
  label,
  value,
  onValueChange,
  mode,
  hint,
  error,
  suffix,
  className,
  ...props
}: NumberInputProps) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div className="relative">
        <input
          {...props}
          id={id}
          type="text"
          inputMode={mode}
          autoComplete="off"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, { hint, error })}
          className={cx(field, error && 'border-red-400', suffix && 'pr-14', className)}
        />
        {suffix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500"
          >
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

/**
 * ช่องติ๊กพร้อมข้อความ — ห่อ `<input>` ไว้ใน `<label>` เสมอ
 *
 * ผูก label ด้วยการห่อ ไม่ใช่ `htmlFor` เพราะไม่ต้องคิด id ให้ทุกช่อง
 * (id ที่ตั้งเองแล้วซ้ำกันคือสาเหตุที่พบบ่อยที่สุดของ label ที่กดแล้วไปโดนช่องอื่น)
 */
export function Checkbox({
  label,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode }) {
  return (
    <label className={checkboxRow}>
      <input {...props} type="checkbox" className={cx(checkboxField, className)} />
      {label}
    </label>
  );
}
