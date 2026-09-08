import type { ReactNode } from 'react';

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
    <div className="rounded-[10px] border border-slate-200 bg-surface p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

/**
 * กล่องข้อความสถานะ — กล่องเตือน/แจ้งเตือนของทั้งเว็บมาจากที่นี่ที่เดียว
 *
 * `note` คือคำเตือนเชิงข้อมูล (ต้องรู้ไว้) · `danger` คือสิ่งที่พังไปแล้ว (ต้องลงมือ)
 * ไอคอนต่างกันด้วยรูปทรง ไม่ใช่แค่สี — ผู้ใช้ที่แยกสีไม่ได้ต้องอ่านออกเหมือนกัน (A6)
 */
export function Alert({
  tone = 'note', title, children,
}: { tone?: 'note' | 'danger'; title?: string; children: ReactNode }) {
  const styles = tone === 'danger'
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-amber-200 bg-amber-50 text-amber-900';
  // note = วงกลมมีเครื่องหมายตกใจ · danger = สามเหลี่ยม
  const path = tone === 'danger'
    ? 'M12 4.5 21 19.5H3L12 4.5Zm0 5.5v4.2m0 2.6v.2'
    : 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm0 7.3v5.4m0-8.2v.2';

  return (
    <div role={tone === 'danger' ? 'alert' : undefined} className={`flex items-start gap-2 rounded-[10px] border p-3 text-sm ${styles}`}>
      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d={path} />
      </svg>
      <div>
        {title && <p className="font-medium">{title}</p>}
        <div className={title ? 'mt-1' : undefined}>{children}</div>
      </div>
    </div>
  );
}

/** คำเตือนใต้ผลลัพธ์ — ใช้กับเครื่องมือการเงิน หวย ดวง และทำนายฝัน (§17.3) */
export function Disclaimer({ children }: { children: ReactNode }) {
  return <Alert tone="note">{children}</Alert>;
}

/**
 * สถานะ "ไม่พบอะไรเลย" — เดิมเขียนซ้ำคนละหน้าตาในหน้าค้นหาเครื่องมือ ค้นฝัน และรายการที่ค้นได้
 *
 * ต้องมีทางออกเสมอ (`action`) กล่องที่บอกว่าไม่เจอแล้วปล่อยผู้ใช้ค้างคือทางตัน
 */
export function EmptyState({
  title, description, action,
}: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-surface px-6 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M10.8 4a6.8 6.8 0 1 1 0 13.6 6.8 6.8 0 0 1 0-13.6Zm4.9 11.7L20 20" />
        </svg>
      </div>
      <h2 className="mt-4 font-medium text-slate-900">{title}</h2>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
