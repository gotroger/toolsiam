import { useId, useRef, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  command?: boolean;
};
/** Shared clear/focus behavior for discovery and searchable content. */
export function SearchField({ value, onValueChange, label, command = false, id, ...props }: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={`search-field${command ? ' search-field-command' : ''}`}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </svg>
      <input
        {...props}
        ref={ref}
        id={inputId}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className="search-clear"
          aria-label="ล้างคำค้น"
          onClick={() => {
            onValueChange('');
            ref.current?.focus();
          }}
        >
          ×
        </button>
      )}
      {command && (
        <button type="submit" className="search-submit" aria-label="ค้นหาเครื่องมือ">
          <span className="hidden sm:inline">ค้นหา</span>
          <span aria-hidden="true">↵</span>
        </button>
      )}
    </div>
  );
}
