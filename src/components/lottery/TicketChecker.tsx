import { useState } from 'react';
import { checkTickets } from '@/lib/lottery';
import type { LotteryDraw } from '@/data/lottery/schema';
import { Button, ErrorText, Field, ResultBox, Textarea } from '@/components/ui';
import { formatBaht } from '@/lib/format';

/**
 * ตรวจสลาก — ทำงานในเบราว์เซอร์ทั้งหมด ข้อมูลงวดถูก build เข้าหน้ามาแล้ว (§28.1 ข้อ 5)
 * หมายเลขที่ผู้ใช้กรอกไม่ถูกส่งออกไปที่ไหนเลย
 */
export default function TicketChecker({ draw }: { draw: LotteryDraw }) {
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState<ReturnType<typeof checkTickets> | null>(null);

  function run() {
    setChecked(checkTickets(input.split('\n'), draw));
  }

  return (
    <div className="space-y-4">
      <Field
        label="หมายเลขสลาก"
        htmlFor="tickets"
        hint="กรอกได้หลายใบ บรรทัดละหนึ่งหมายเลข · เลข 6 หลักรวมศูนย์นำหน้า"
      >
        <Textarea
          id="tickets"
          rows={4}
          value={input}
          placeholder={'123456\n098765'}
          onChange={(e) => setInput(e.target.value)}
          aria-describedby="tickets-hint"
        />
      </Field>

      <Button onClick={run} disabled={input.trim() === ''}>ตรวจรางวัล</Button>

      {checked && (
        <div aria-live="polite" className="space-y-3">
          {checked.results.length > 0 && (
            <ResultBox label="รวมเงินรางวัลทั้งหมด">
              {formatBaht(checked.totalAmount)} บาท
            </ResultBox>
          )}

          {checked.results.map((r) => (
            <div key={r.ticket} className="rounded-[10px] border border-slate-200 bg-white p-3">
              <p className="text-sm tabular-nums text-slate-900">{r.ticket}</p>
              {r.wins.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">ไม่ถูกรางวัลในงวดนี้</p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                  {r.wins.map((w) => (
                    <li key={`${w.prize.id}-${w.matched}`}>
                      ถูก{w.prize.name} (เลข {w.matched}) — {formatBaht(w.amount)} บาท
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {checked.errors.map((e) => (
            <ErrorText key={e.input}>{`"${e.input}" — ${e.message}`}</ErrorText>
          ))}

          {checked.results.length === 0 && checked.errors.length === 0 && (
            <p className="text-sm text-slate-600">ยังไม่ได้กรอกหมายเลขสลาก</p>
          )}
        </div>
      )}
    </div>
  );
}
