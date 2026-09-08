import { useId, useLayoutEffect, useRef, useState, type AriaAttributes, type KeyboardEvent } from 'react';
import { addDays, daysInMonth, parseIsoDate, shiftDate, weekdayIndex } from '@/lib/date';
import { todayInBangkok } from '@/lib/today';
import { cx, field } from './styles';

const MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];
const WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const parts = (date: string) => date.split('-').map(Number);
function valid(date: string) {
  try {
    parseIsoDate(date);
    return true;
  } catch {
    return false;
  }
}
export function dateLabel(date: string) {
  if (!valid(date)) return 'เลือกวันที่';
  const [y, m, d] = parts(date);
  return `${d} ${MONTHS[m - 1]} ${y + 543}`;
}
export function shiftCalendarMonth(date: string, delta: number) {
  return shiftDate(date, delta, 'month');
}
interface Props extends AriaAttributes {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
}

/** Shared Thai calendar. Display Buddhist years; retain ISO Gregorian values for tool logic. */
export function DatePicker({
  id,
  value,
  onValueChange,
  min = '1900-01-01',
  max = '2200-12-31',
  disabled,
  required,
  name,
  className,
  ...aria
}: Props) {
  const uid = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(min);
  const [today, setToday] = useState('');
  const focusDay = useRef(false);
  const clamp = (date: string) => (date < min ? min : date > max ? max : date);
  const [year, month] = parts(cursor);
  const first = iso(year, month, 1);
  const offset = weekdayIndex(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i - offset));
  const years = Array.from(
    { length: Number(max.slice(0, 4)) - Number(min.slice(0, 4)) + 1 },
    (_, i) => Number(min.slice(0, 4)) + i,
  );
  const close = () => {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  };
  const choose = (date: string) => {
    onValueChange(date);
    close();
  };
  const move = (date: string, focus = false) => {
    focusDay.current = focus;
    setCursor(clamp(date));
  };

  useLayoutEffect(() => {
    if (!open || !dialog.current) return;
    const panel = dialog.current;
    if (!panel.open) panel.showModal();
    const position = () => {
      const box = trigger.current?.getBoundingClientRect();
      if (!box) return;
      const width = Math.min(360, window.innerWidth - 24);
      panel.style.width = `${width}px`;
      panel.style.left = `${Math.max(12, Math.min(box.left, window.innerWidth - width - 12))}px`;
      panel.style.top = `${Math.max(12, Math.min(box.bottom + 8, window.innerHeight - panel.offsetHeight - 12))}px`;
    };
    position();
    panel.querySelector<HTMLButtonElement>('[data-date][tabindex="0"]')?.focus({ preventScroll: true });
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open]);
  useLayoutEffect(() => {
    if (focusDay.current) {
      dialog.current?.querySelector<HTMLButtonElement>(`[data-date="${cursor}"]`)?.focus({ preventScroll: true });
      focusDay.current = false;
    }
  }, [cursor]);
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    let next: string;
    switch (event.key) {
      case 'ArrowLeft':
        next = addDays(date, -1);
        break;
      case 'ArrowRight':
        next = addDays(date, 1);
        break;
      case 'ArrowUp':
        next = addDays(date, -7);
        break;
      case 'ArrowDown':
        next = addDays(date, 7);
        break;
      case 'Home':
        next = addDays(date, -weekdayIndex(date));
        break;
      case 'End':
        next = addDays(date, 6 - weekdayIndex(date));
        break;
      case 'PageUp':
        next = shiftCalendarMonth(date, event.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        next = shiftCalendarMonth(date, event.shiftKey ? 12 : 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    move(next, true);
  };
  return (
    <>
      <button
        {...aria}
        type="button"
        id={id}
        ref={trigger}
        className={cx(field, 'date-trigger', className)}
        disabled={disabled}
        aria-describedby={[aria['aria-describedby'], `${uid}-value`].filter(Boolean).join(' ')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? uid : undefined}
        onClick={() => {
          const now = todayInBangkok();
          setToday(now);
          setCursor(clamp(valid(value) ? value : now));
          setOpen(true);
        }}
      >
        <span id={`${uid}-value`} className={!value ? 'text-slate-500' : undefined}>
          {dateLabel(value)}
        </span>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M7 3v4m10-4v4M3 11h18m-12 4h3m3 0h3m-9 3h3" />
        </svg>
      </button>
      {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
      {open && (
        <dialog
          ref={dialog}
          id={uid}
          className="date-dialog"
          aria-labelledby={`${uid}-title`}
          aria-describedby={`${uid}-help`}
          onKeyDown={(event) => {
            if (event.key !== 'Tab') return;
            const controls = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(':is(button, select):not(:disabled)'),
            ).filter((element) => element.tabIndex >= 0);
            const first = controls[0],
              last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClose={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const r = event.currentTarget.getBoundingClientRect();
            if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)
              close();
          }}
        >
          <div className="date-dialog-heading">
            <div>
              <h2 id={`${uid}-title`}>เลือกวันที่</h2>
              <p>
                ปฏิทิน พ.ศ. <span>· ค.ศ. {year}</span>
              </p>
            </div>
            <button type="button" className="date-icon-button" aria-label="ปิดปฏิทิน" onClick={close}>
              ×
            </button>
          </div>
          <div className="date-navigation">
            <button
              type="button"
              className="date-icon-button"
              aria-label="เดือนก่อนหน้า"
              disabled={first.slice(0, 7) <= min.slice(0, 7)}
              onClick={() => move(shiftCalendarMonth(cursor, -1))}
            >
              ‹
            </button>
            <select
              aria-label="เดือน"
              value={month}
              onChange={(event) =>
                move(
                  iso(
                    year,
                    Number(event.target.value),
                    Math.min(parts(cursor)[2], daysInMonth(year, Number(event.target.value))),
                  ),
                )
              }
            >
              {MONTHS.map((m, i) => (
                <option
                  key={m}
                  value={i + 1}
                  disabled={iso(year, i + 1, daysInMonth(year, i + 1)) < min || iso(year, i + 1, 1) > max}
                >
                  {m}
                </option>
              ))}
            </select>
            <select
              aria-label="ปี พ.ศ."
              value={year}
              onChange={(event) =>
                move(
                  iso(
                    Number(event.target.value),
                    month,
                    Math.min(parts(cursor)[2], daysInMonth(Number(event.target.value), month)),
                  ),
                )
              }
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y + 543}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="date-icon-button"
              aria-label="เดือนถัดไป"
              disabled={first.slice(0, 7) >= max.slice(0, 7)}
              onClick={() => move(shiftCalendarMonth(cursor, 1))}
            >
              ›
            </button>
          </div>
          <p className="sr-only" aria-live="polite">
            {MONTHS[month - 1]} {year + 543}
          </p>
          <table className="date-grid" role="grid" aria-label={`${MONTHS[month - 1]} ${year + 543}`}>
            <thead>
              <tr>
                {WEEKDAYS.map((day, i) => (
                  <th key={day} scope="col" abbr={day}>
                    {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][i]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }, (_, row) => (
                <tr key={row}>
                  {cells.slice(row * 7, row * 7 + 7).map((date) => (
                    <td key={date} aria-selected={date === value}>
                      <button
                        type="button"
                        data-date={date}
                        data-outside={date.slice(0, 7) !== first.slice(0, 7)}
                        aria-label={dateLabel(date)}
                        aria-current={date === today ? 'date' : undefined}
                        tabIndex={date === cursor ? 0 : -1}
                        disabled={date < min || date > max}
                        onKeyDown={(event) => keyboard(event, date)}
                        onClick={() => choose(date)}
                      >
                        {parts(date)[2]}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="date-footer">
            <button type="button" disabled={required || !value} onClick={() => choose('')}>
              ล้างวันที่
            </button>
            <button
              type="button"
              className="date-today"
              disabled={!today || today < min || today > max}
              onClick={() => choose(today)}
            >
              วันนี้
            </button>
          </div>
          <p id={`${uid}-help`} className="date-keyboard-help">
            ใช้ปุ่มลูกศรเลือกวัน · Enter ยืนยัน · Esc ปิด
          </p>
        </dialog>
      )}
    </>
  );
}
