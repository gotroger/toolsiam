import { useId, useMemo, useRef, useState } from 'react';
import type {
  ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode,
  SelectHTMLAttributes, TextareaHTMLAttributes,
} from 'react';
import type { RateSource } from '@/tools/types';
import { COPY_FAILED_MESSAGE, COPY_FEEDBACK_MS, copyText } from '@/lib/clipboard';

const field =
  'w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 ' +
  'transition-colors duration-150 placeholder:text-slate-400 hover:border-slate-400 ' +
  'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30 disabled:bg-slate-100';

function cx(...parts: (string | undefined | false)[]) {
  return parts.filter(Boolean).join(' ');
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(field, className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(field, 'font-mono text-sm', className)} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(field, className)} />;
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cx('mb-1 block text-sm font-medium text-slate-700', className)} />;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' };
export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const styles =
    variant === 'primary'
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50';
  return (
    <button
      type="button"
      {...props}
      className={cx('rounded-[10px] px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', styles, className)}
    />
  );
}

/**
 * กล่องผลลัพธ์ — ทุกเครื่องมือคำนวณสดขณะพิมพ์ ผู้ใช้ screen reader จึงต้องได้ยินค่าที่เปลี่ยน (A5)
 */
export function ResultBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-brand-600/20 bg-brand-50 p-4" aria-live="polite">
      <div className="text-xs font-medium text-brand-700">{label}</div>
      <div className="mt-1 break-words text-lg font-semibold">{children}</div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

/** ข้อความผิดพลาด — ไม่สื่อด้วยสีอย่างเดียว มีคำว่า "ข้อผิดพลาด" กำกับเสมอ (A6) */
export function ErrorText({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1.5 text-sm text-red-600">
      <span aria-hidden="true">⚠</span>
      <span><span className="font-medium">ข้อผิดพลาด:</span> {children}</span>
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
  label, htmlFor, children, hint, error,
}: { label: string; htmlFor: string; children: ReactNode; hint?: string; error?: string }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-slate-600">{hint}</p>}
      {error && <ErrorText id={`${htmlFor}-error`}>{error}</ErrorText>}
    </div>
  );
}

/** id ของ hint/error ที่มีอยู่จริง สำหรับผูกเข้า aria-describedby */
export function describedBy(id: string, opts: { hint?: string; error?: string }): string | undefined {
  const ids = [opts.hint && `${id}-hint`, opts.error && `${id}-error`].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'inputMode' | 'id'> {
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
  id, label, value, onValueChange, mode, hint, error, suffix, className, ...props
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
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

export interface TabItem {
  id: string;
  label: string;
}

/**
 * Tabs ตาม WAI-ARIA — ลูกศรซ้าย/ขวา + Home/End ย้ายแท็บ, Tab ออกจากชุดแท็บไปยัง panel (A2)
 * ใช้ roving tabindex: มีแท็บเดียวที่ tabIndex=0
 */
export function Tabs({
  tabs, value, onChange, label, idPrefix,
}: { tabs: TabItem[]; value: string; onChange: (id: string) => void; label: string; idPrefix?: string }) {
  const auto = useId();
  const prefix = idPrefix ?? auto;
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function move(delta: number) {
    const i = tabs.findIndex((t) => t.id === value);
    const next = tabs[(i + delta + tabs.length) % tabs.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 rounded-[10px] bg-slate-100 p-1">
      {tabs.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            type="button"
            role="tab"
            id={tabId(prefix, t.id)}
            aria-selected={selected}
            aria-controls={tabPanelId(prefix, t.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
              else if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
              else if (e.key === 'Home') { e.preventDefault(); onChange(tabs[0].id); refs.current[tabs[0].id]?.focus(); }
              else if (e.key === 'End') { e.preventDefault(); const last = tabs[tabs.length - 1]; onChange(last.id); refs.current[last.id]?.focus(); }
            }}
            className={cx(
              'flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1',
              selected ? 'bg-white text-brand-700 shadow-[0_1px_2px_0_rgb(16_24_40/0.06)]' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function tabId(prefix: string, id: string) { return `${prefix}-tab-${id}`; }
function tabPanelId(prefix: string, id: string) { return `${prefix}-panel-${id}`; }

export function TabPanel({
  id, active, idPrefix, children,
}: { id: string; active: boolean; idPrefix: string; children: ReactNode }) {
  if (!active) return null;
  return (
    <div role="tabpanel" id={tabPanelId(idPrefix, id)} aria-labelledby={tabId(idPrefix, id)} tabIndex={0}>
      {children}
    </div>
  );
}

/** ปุ่มคัดลอก — จัดการสถานะ "คัดลอกแล้ว" และกรณีคัดลอกไม่สำเร็จให้เหมือนกันทุกเครื่องมือ */
export function CopyButton({
  text, label = 'คัดลอก', disabled,
}: { text: string; label?: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run() {
    const ok = await copyText(text);
    setFailed(!ok);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }

  return (
    <div>
      <Button variant="secondary" onClick={run} disabled={disabled || !text}>
        {copied ? `${label}แล้ว ✓` : label}
      </Button>
      <span className="sr-only" aria-live="polite">{copied ? 'คัดลอกแล้ว' : ''}</span>
      {failed && <ErrorText>{COPY_FAILED_MESSAGE}</ErrorText>}
    </div>
  );
}

export interface Column<Row> {
  key: string;
  header: string;
  /** จัดชิดขวาสำหรับตัวเลข */
  align?: 'left' | 'right';
  render: (row: Row) => ReactNode;
}

/** ตารางข้อมูล — เลื่อนแนวนอนได้บนจอเล็กโดยตัวมันเอง ไม่ทำให้ทั้งหน้าเลื่อน */
export function DataTable<Row>({
  columns, rows, caption, rowKey,
}: { columns: Column<Row>[]; rows: Row[]; caption: string; rowKey: (row: Row, i: number) => string }) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-slate-200">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-slate-50 text-slate-600">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cx('border-b border-slate-200 px-3 py-2 font-medium', c.align === 'right' ? 'text-right' : 'text-left')}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)} className="even:bg-slate-50/60">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cx('border-b border-slate-100 px-3 py-2 text-slate-700', c.align === 'right' && 'text-right tabular-nums')}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** คำเตือนใต้ผลลัพธ์ — ใช้กับเครื่องมือการเงิน หวย ดวง และทำนายฝัน (§17.3) */
export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-[10px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <span aria-hidden="true">ℹ️</span>
      <span>{children}</span>
    </p>
  );
}

/**
 * แผงความน่าเชื่อถือของเครื่องมือการเงิน (§17.2)
 *
 * `lastVerifiedAt` แสดงให้ผู้ใช้เห็นเพื่อสร้างความเชื่อมั่น แต่ไม่เข้า structured data
 * — `dateModified` มาจาก `contentUpdatedAt` เท่านั้น (§16.2)
 */
export function TrustPanel({
  rates = [], assumptions = [], disclaimer,
}: { rates?: RateSource[]; assumptions?: string[]; disclaimer?: string }) {
  if (rates.length === 0 && assumptions.length === 0 && !disclaimer) return null;

  return (
    <section aria-labelledby="trust-panel-heading" className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm">
      <h2 id="trust-panel-heading" className="text-base font-semibold text-slate-900">ข้อมูลที่ใช้คำนวณ</h2>

      {assumptions.length > 0 && (
        <div className="mt-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">สมมติฐานที่ใช้คำนวณ</h3>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700">
            {assumptions.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </div>
      )}

      {rates.length > 0 && (
        <div className="mt-3 space-y-3">
          {rates.map((r) => (
            <div key={`${r.sourceUrl}-${r.effectiveFrom}`} className="rounded-[10px] border border-slate-200 bg-white p-3">
              <p className="text-slate-800">{r.summary}</p>
              <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
                <div className="flex gap-1"><dt className="text-slate-500">มีผลตั้งแต่</dt><dd>{r.effectiveFrom}</dd></div>
                <div className="flex gap-1"><dt className="text-slate-500">ตรวจข้อมูลล่าสุด</dt><dd>{r.lastVerifiedAt}</dd></div>
              </dl>
              <p className="mt-2 text-xs">
                <span className="text-slate-500">แหล่งข้อมูล: </span>
                <a
                  href={r.sourceUrl}
                  rel="nofollow noopener"
                  target="_blank"
                  className="text-brand-700 underline underline-offset-2 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                >
                  {r.sourceName}
                </a>
              </p>
            </div>
          ))}
        </div>
      )}

      {disclaimer && <div className="mt-3"><Disclaimer>{disclaimer}</Disclaimer></div>}
    </section>
  );
}

/**
 * รายการที่ค้นได้ — ใช้กับรายการยาวอย่างวันหยุด ทำนายฝัน และรายชื่อเครื่องมือ
 * ค้นแบบ substring ธรรมดา (ไม่ใช้ fuzzy) เพราะผู้ใช้พิมพ์คำไทยตรง ๆ และไม่ต้องโหลด index เพิ่ม
 */
export function SearchableList<Item>({
  items, search, renderItem, itemKey, label, placeholder, emptyMessage = 'ไม่พบรายการที่ตรงกับคำค้น',
}: {
  items: Item[];
  /** ข้อความที่ใช้ค้นของแต่ละรายการ */
  search: (item: Item) => string;
  renderItem: (item: Item) => ReactNode;
  itemKey: (item: Item) => string;
  label: string;
  placeholder?: string;
  emptyMessage?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const matched = useMemo(
    () => (q === '' ? items : items.filter((it) => search(it).toLowerCase().includes(q))),
    [items, q, search],
  );

  return (
    <div className="space-y-3">
      <Field label={label} htmlFor={id} hint={`มีทั้งหมด ${items.length} รายการ`}>
        <Input
          id={id}
          type="search"
          value={query}
          placeholder={placeholder}
          onChange={(e) => setQuery(e.target.value)}
          aria-describedby={`${id}-hint ${id}-count`}
        />
      </Field>
      <p id={`${id}-count`} aria-live="polite" className="text-xs text-slate-600">
        {q === '' ? '' : `พบ ${matched.length} รายการ`}
      </p>
      {matched.length === 0
        ? <p className="text-sm text-slate-600">{emptyMessage}</p>
        : <ul className="space-y-2">{matched.map((it) => <li key={itemKey(it)}>{renderItem(it)}</li>)}</ul>}
    </div>
  );
}
