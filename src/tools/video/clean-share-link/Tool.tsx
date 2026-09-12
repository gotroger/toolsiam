import { useState } from 'react';
import { cleanLinks, MAX_LINES } from './logic';
import { CopyButton, Field, Stat, Textarea } from '@/components/ui';

export default function CleanShareLinkTool() {
  const [text, setText] = useState('');
  const results = cleanLinks(text);
  const removed = results.reduce((sum, r) => sum + r.removed.length, 0);
  const output = results.map((r) => r.cleaned).join('\n');

  return (
    <div className="space-y-4">
      <Field label="ลิงก์ต้นฉบับ" htmlFor="links" hint={`บรรทัดละ 1 ลิงก์ สูงสุด ${MAX_LINES} บรรทัด`}>
        <Textarea
          id="links"
          rows={6}
          value={text}
          aria-describedby="links-hint"
          onChange={(e) => setText(e.target.value)}
          placeholder="https://youtu.be/…?si=…"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="ลิงก์" value={results.length} />
        <Stat label="พารามิเตอร์ที่ตัดออก" value={removed} />
      </div>

      {results.length > 0 && (
        <ul className="space-y-2 text-sm" aria-label="ผลลัพธ์รายลิงก์">
          {results.map((r, i) => (
            <li key={`${i}-${r.input}`} className="rounded-[10px] border border-slate-200 bg-surface p-3">
              <div className="break-all font-medium">{r.cleaned}</div>
              <div className="mt-1 text-xs text-slate-600">
                {!r.ok
                  ? 'ไม่ใช่ลิงก์ http/https'
                  : (r.note ?? (r.removed.length ? `ตัดออก: ${r.removed.join(', ')}` : 'ไม่มีอะไรให้ตัด'))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Field label="ลิงก์ที่ล้างแล้ว" htmlFor="out">
        <Textarea id="out" rows={6} value={output} readOnly />
      </Field>
      <CopyButton text={output} label="คัดลอกทั้งหมด" />
    </div>
  );
}
