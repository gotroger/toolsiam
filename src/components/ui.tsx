import type {
  ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode,
  SelectHTMLAttributes, TextareaHTMLAttributes,
} from 'react';

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

export function ResultBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-brand-600/20 bg-brand-50 p-4">
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

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
