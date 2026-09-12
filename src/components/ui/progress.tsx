import { cx, labelText } from './styles';

/**
 * แถบความคืบหน้า — ใช้กับงานที่นานเกินจะให้ผู้ใช้จ้องปุ่ม (โหลด engine, แปลงวิดีโอ)
 *
 * `value` เป็นเปอร์เซ็นต์ 0–100 หรือ `null` เมื่อยังบอกไม่ได้ (indeterminate)
 * เป็น div role=progressbar ไม่ใช่ <progress> เพราะ <progress> จัดสีข้ามเบราว์เซอร์ไม่ได้
 * แอนิเมชันของ indeterminate อยู่ใน product.css และปิดเมื่อ prefers-reduced-motion
 */
export function ProgressBar({
  id,
  label,
  value,
  detail,
}: {
  id: string;
  label: string;
  value: number | null;
  detail?: string;
}) {
  const percent = value === null ? null : Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span id={`${id}-label`} className={labelText}>
          {label}
        </span>
        {percent !== null && (
          <span className="rounded-md bg-brand-50 px-2 py-0.5 text-sm font-medium tabular-nums text-brand-700">
            {percent}%
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-labelledby={`${id}-label`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        className="product-progress"
      >
        <div
          className={cx('product-progress-fill', percent === null && 'product-progress-indeterminate')}
          style={percent === null ? undefined : { width: `${percent}%` }}
        />
      </div>
      {detail && <p className="mt-1 text-xs text-slate-600">{detail}</p>}
    </div>
  );
}
