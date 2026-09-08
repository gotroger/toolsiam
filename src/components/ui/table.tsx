import type { ReactNode } from 'react';
import { cx } from './styles';

export interface Column<Row> {
  key: string;
  header: string;
  /** จัดชิดขวาสำหรับตัวเลข */
  align?: 'left' | 'right';
  render: (row: Row) => ReactNode;
}

/** ตารางข้อมูล — เลื่อนแนวนอนได้บนจอเล็กโดยตัวมันเอง ไม่ทำให้ทั้งหน้าเลื่อน */
export function DataTable<Row>({
  columns,
  rows,
  caption,
  rowKey,
}: {
  columns: Column<Row>[];
  rows: Row[];
  caption: string;
  rowKey: (row: Row, i: number) => string;
}) {
  return (
    <div
      className="overflow-x-auto rounded-[10px] border border-slate-200"
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-slate-50 text-slate-600">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cx(
                  'border-b border-slate-200 px-3 py-2 font-medium',
                  c.align === 'right' ? 'text-right' : 'text-left',
                )}
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
                  className={cx(
                    'border-b border-slate-100 px-3 py-2 text-slate-700',
                    c.align === 'right' && 'text-right tabular-nums',
                  )}
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
