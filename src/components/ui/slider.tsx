import { cx, labelText } from './styles';

/**
 * รางเลื่อนค่าตัวเลข พร้อมป้ายค่าปัจจุบันชิดขวาของ label
 *
 * เป็น `<input type="range">` จริง ลูกศร Home/End PageUp/PageDown จึงทำงานเองตามปกติ
 * ส่วนที่ระบายสีคำนวณเป็นเปอร์เซ็นต์ส่งเข้า custom property `--slider-fill`
 * แล้วให้ `.product-slider` ใน product.css เอาไปวาดราง เพราะ ::-webkit-slider-thumb
 * และ ::-moz-range-thumb เขียนด้วยคลาส utility ไม่ได้
 */
export function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  disabled,
  onValueChange,
}: {
  id: string;
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
}) {
  const parsed = Number(value);
  // ค่าที่อ่านไม่ได้หรือหลุดขอบเขตต้องไม่ทำให้รางระบายเกิน 0–100%
  const ratio = Number.isFinite(parsed) && max > min ? Math.min(1, Math.max(0, (parsed - min) / (max - min))) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={labelText}>
          {label}
        </label>
        <span
          data-testid="slider-value"
          className={cx(
            'rounded-md px-2 py-0.5 text-sm font-medium tabular-nums',
            disabled ? 'bg-slate-100 text-slate-500' : 'bg-brand-50 text-brand-700',
          )}
        >
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={`${value}${suffix}`}
        style={{ '--slider-fill': `${Math.round(ratio * 100)}%` } as React.CSSProperties}
        className="product-slider w-full"
        onChange={(e) => onValueChange(e.target.value)}
      />
    </div>
  );
}
