import { cx } from './styles';

export interface SegmentedOption {
  value: string;
  label: string;
}

/**
 * ตัวเลือกแบบแถบติดกัน สำหรับชุดตัวเลือกสั้น 2–4 ตัวที่อยากให้เห็นครบและกดครั้งเดียวจบ
 *
 * ข้างในเป็น `<input type="radio">` จริงที่ซ่อนด้วย `sr-only` ครอบด้วย fieldset/legend
 * จึงได้พฤติกรรม radio group ของเบราว์เซอร์มาทั้งชุด — ลูกศรเลื่อนตัวเลือก มีเพียงตัวที่
 * เลือกอยู่ใน Tab order และ screen reader อ่านว่า "1 จาก 3" ให้เอง โดยไม่ต้องเขียน ARIA เอง
 *
 * ชุดตัวเลือกที่ป้ายยาว (เช่น "90 องศา" "จุลภาค (,)") ให้ใช้ Select ต่อไป เพราะสามช่อง
 * บนจอ 375px จะบีบจนอ่านไม่ออก
 */
export function SegmentedControl({
  name,
  legend,
  value,
  options,
  onChange,
  hint,
  disabled,
}: {
  name: string;
  legend: string;
  value: string;
  options: SegmentedOption[];
  onChange: (value: string) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} aria-describedby={hint ? `${name}-hint` : undefined}>
      <legend className="mb-1 block text-sm font-medium text-slate-700">{legend}</legend>
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={cx('min-w-0 flex-1', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                disabled={disabled}
                className="peer sr-only"
                onChange={() => onChange(option.value)}
              />
              <span
                className={cx(
                  'flex min-h-9 items-center justify-center truncate rounded-lg px-3 py-1.5 text-center text-sm',
                  'transition-colors duration-150',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600/40',
                  // คลาสพื้นหลังต้องออกมาชุดเดียว ลำดับใน className ไม่ได้ตัดสินว่าสีไหนชนะ
                  //
                  // ตัวที่เลือกใช้สี action พื้นทึบตัวอักษรขาว ชุดเดียวกับ .category-pill ที่ถูกเลือก
                  // เคยลองแบบ "เม็ดขาวยกขึ้น" แล้วพัง เพราะธีมมืดกลับด้าน: surface (#161616) มืดกว่า
                  // ราง slate-100 (#202020) ต่างกันแค่ 1.11:1 มองไม่ออกว่าเลือกอันไหนอยู่
                  selected
                    ? 'bg-action font-medium text-white shadow-sm'
                    : cx('bg-transparent text-slate-600', !disabled && 'hover:text-slate-900'),
                )}
              >
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
      {hint && (
        <p id={`${name}-hint`} className="mt-1 text-xs text-slate-600">
          {hint}
        </p>
      )}
    </fieldset>
  );
}
