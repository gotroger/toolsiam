import { useMemo, useState } from 'react';
import { checkTickets, parseTicketInput } from '@/lib/lottery';
import type { LotteryDraw } from '@/data/lottery/schema';
import { Button, ErrorText, Field, ResultBox, Textarea } from '@/components/ui';
import { formatBaht } from '@/lib/format';
import { formatThaiDate } from '@/lib/thai-date';
import { useLiveDraw } from '@/lib/lottery-remote';
import DrawMetaLine from './DrawMetaLine';

/**
 * ตรวจสลาก — ทำงานในเบราว์เซอร์ทั้งหมด ข้อมูลงวดถูก build เข้าหน้ามาแล้ว (§28.1 ข้อ 5)
 * หมายเลขที่ผู้ใช้กรอกไม่ถูกส่งออกไปที่ไหนเลย
 *
 * `draw` คืองวดที่ build ไว้ ถ้า KV มีงวดที่ใหม่กว่า (cron ดึงมาหลัง deploy) จะตรวจกับงวดนั้นแทน
 * และบอกชัดว่ากำลังตรวจกับงวดไหน — ผลที่ตรวจไปแล้วถูกตรวจใหม่กับงวดใหม่ทันทีที่ข้อมูลมาถึง
 * เพราะเก็บ "ข้อความที่กดตรวจ" ไว้ ไม่ได้เก็บผลลัพธ์ที่คำนวณกับงวดเก่า
 */
export default function TicketChecker({ draw }: { draw: LotteryDraw }) {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const { remote } = useLiveDraw(draw.drawDate);
  const active = remote?.draw ?? draw;

  const checked = useMemo(
    () => (submitted === null ? null : checkTickets(parseTicketInput(submitted), active)),
    [submitted, active],
  );

  return (
    <div className="space-y-4">
      <DrawMetaLine draw={active} prefix="ตรวจกับงวดวันที่" fresh={remote !== null} />

      <Field
        label="หมายเลขสลาก"
        htmlFor="tickets"
        hint="กรอกได้หลายใบ คั่นด้วยการขึ้นบรรทัดใหม่ เว้นวรรค หรือจุลภาค · เลข 6 หลักรวมศูนย์นำหน้า · ใช้เลขไทยได้"
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

      <Button onClick={() => setSubmitted(input)} disabled={input.trim() === ''}>ตรวจรางวัล</Button>

      {checked && (
        <div aria-live="polite" className="space-y-3">
          <p className="text-sm text-slate-600">
            ผลตรวจกับงวดวันที่ {formatThaiDate(active.drawDate, { style: 'medium' })}
          </p>

          {checked.results.length > 0 && (
            <ResultBox label="รวมเงินรางวัลทั้งหมด">
              {formatBaht(checked.totalAmount)} บาท
            </ResultBox>
          )}

          {/* key เป็น index — ผู้ใช้มีสลากเลขเดียวกันหลายใบได้ และเลขรางวัลในประเภทเดียวกันซ้ำกันได้ */}
          {checked.results.map((r, i) => (
            <div key={i} className="rounded-[10px] border border-slate-200 bg-surface p-3">
              <p className="text-sm tabular-nums text-slate-900">{r.ticket}</p>
              {r.wins.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">ไม่ถูกรางวัลในงวดนี้</p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                  {r.wins.map((w, j) => (
                    <li key={j}>
                      ถูก{w.prize.name} (เลข {w.matched}) — {formatBaht(w.amount)} บาท
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {checked.errors.map((e, i) => (
            <ErrorText key={i}>{`"${e.input}" — ${e.message}`}</ErrorText>
          ))}

          {checked.results.length === 0 && checked.errors.length === 0 && (
            <p className="text-sm text-slate-600">ยังไม่ได้กรอกหมายเลขสลาก</p>
          )}
        </div>
      )}
    </div>
  );
}
