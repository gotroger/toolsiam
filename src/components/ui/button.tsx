import { useState } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { COPY_FAILED_MESSAGE, COPY_FEEDBACK_MS, copyText } from '@/lib/clipboard';
import { cx } from './styles';
import { ErrorText } from './form';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' };
export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const styles =
    variant === 'primary'
      ? 'bg-action text-white hover:bg-action-hover'
      : 'border border-slate-300 bg-surface text-slate-700 hover:bg-slate-50';
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'product-button px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        styles,
        className,
      )}
    />
  );
}

/** ปุ่มคัดลอก — จัดการสถานะ "คัดลอกแล้ว" และกรณีคัดลอกไม่สำเร็จให้เหมือนกันทุกเครื่องมือ */
export function CopyButton({ text, label = 'คัดลอก', disabled }: { text: string; label?: string; disabled?: boolean }) {
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
      <span className="sr-only" aria-live="polite">
        {copied ? 'คัดลอกแล้ว' : ''}
      </span>
      {failed && <ErrorText>{COPY_FAILED_MESSAGE}</ErrorText>}
    </div>
  );
}
