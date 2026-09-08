import { useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Field, Input } from './form';

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
