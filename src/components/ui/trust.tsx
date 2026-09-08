import type { RateSource } from '@/tools/types';
import { Disclaimer } from './feedback';

/**
 * แผงความน่าเชื่อถือของเครื่องมือการเงิน (§17.2)
 *
 * `lastVerifiedAt` แสดงให้ผู้ใช้เห็นเพื่อสร้างความเชื่อมั่น แต่ไม่เข้า structured data
 * — `dateModified` มาจาก `contentUpdatedAt` เท่านั้น (§16.2)
 */
export function TrustPanel({
  rates = [], assumptions = [], disclaimer,
}: { rates?: RateSource[]; assumptions?: string[]; disclaimer?: string }) {
  if (rates.length === 0 && assumptions.length === 0 && !disclaimer) return null;

  return (
    <section aria-labelledby="trust-panel-heading" className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm">
      <h2 id="trust-panel-heading" className="text-base font-medium text-slate-900">ข้อมูลที่ใช้คำนวณ</h2>

      {assumptions.length > 0 && (
        <div className="mt-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">สมมติฐานที่ใช้คำนวณ</h3>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700">
            {assumptions.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </div>
      )}

      {rates.length > 0 && (
        <div className="mt-3 space-y-3">
          {rates.map((r) => (
            <div key={`${r.sourceUrl}-${r.effectiveFrom}`} className="rounded-[10px] border border-slate-200 bg-white p-3">
              <p className="text-slate-800">{r.summary}</p>
              <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
                <div className="flex gap-1"><dt className="text-slate-500">มีผลตั้งแต่</dt><dd>{r.effectiveFrom}</dd></div>
                <div className="flex gap-1"><dt className="text-slate-500">ตรวจข้อมูลล่าสุด</dt><dd>{r.lastVerifiedAt}</dd></div>
              </dl>
              <p className="mt-2 text-xs">
                <span className="text-slate-500">แหล่งข้อมูล: </span>
                <a
                  href={r.sourceUrl}
                  rel="nofollow noopener"
                  target="_blank"
                  className="text-brand-700 underline underline-offset-2 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                >
                  {r.sourceName}
                </a>
              </p>
            </div>
          ))}
        </div>
      )}

      {disclaimer && <div className="mt-3"><Disclaimer>{disclaimer}</Disclaimer></div>}
    </section>
  );
}
