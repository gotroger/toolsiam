import { useMemo, useState } from 'react';
import { Button, DataTable, Disclaimer, ErrorText, Field, ResultBox, Select, Stat, Textarea } from '@/components/ui';
import { formatNumber } from '@/lib/format';
import { formatThaiDate } from '@/lib/thai-date';
import { checkTickets } from './check';
import { netPrize, type LotteryKind } from './prize';
import type { Draw, TicketResult } from './types';

/**
 * ตรวจสลากหลายใบพร้อมกัน — island เดียวของ vertical หวย
 *
 * งวดถูกส่งเข้ามาเป็น prop จากหน้า Astro (ข้อมูลถูก build ไปกับหน้าอยู่แล้ว)
 * ไม่มีการเรียก API และเลขสลากที่ผู้ใช้กรอกไม่ออกจากเบราว์เซอร์
 */
export default function LotteryCheck({ draws, lotteryUrl }: { draws: Draw[]; lotteryUrl: string }) {
  const [date, setDate] = useState(draws[0]?.date ?? '');
  const [raw, setRaw] = useState('');
  const [kind, setKind] = useState<LotteryKind>('government');

  const draw = useMemo(() => draws.find((d) => d.date === date), [draws, date]);
  const summary = useMemo(() => (draw ? checkTickets(draw, raw) : undefined), [draw, raw]);
  const net = useMemo(() => netPrize(summary?.total ?? 0, kind), [summary, kind]);

  if (!draw || !summary) {
    return (
      <div className="space-y-3">
        <p className="text-slate-700">
          ยังไม่มีผลรางวัลงวดใดในระบบ จึงยังตรวจสลากไม่ได้ — ดูปฏิทินวันออกรางวัลและโครงสร้างรางวัลได้ที่
          {' '}
          <a href={lotteryUrl} className="text-brand-700 underline underline-offset-2 hover:text-brand-800">
            หน้าหวยและสลากกินแบ่งรัฐบาล
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Field label="งวดที่ต้องการตรวจ" htmlFor="lottery-draw">
        <Select id="lottery-draw" value={date} onChange={(e) => setDate(e.target.value)}>
          {draws.map((d) => (
            <option key={d.date} value={d.date}>{formatThaiDate(d.date, { style: 'medium' })}</option>
          ))}
        </Select>
      </Field>

      <Field
        label="เลขสลาก 6 หลัก"
        htmlFor="lottery-tickets"
        hint="กรอกได้หลายใบ ขึ้นบรรทัดใหม่หรือคั่นด้วยเว้นวรรค รองรับเลขไทยและเลขที่มีขีดคั่น"
      >
        <Textarea
          id="lottery-tickets"
          rows={5}
          value={raw}
          inputMode="numeric"
          placeholder={'123456\n234567'}
          aria-describedby="lottery-tickets-hint"
          onChange={(e) => setRaw(e.target.value)}
        />
      </Field>

      <Field label="ประเภทสลาก (ใช้คำนวณยอดหัก)" htmlFor="lottery-kind">
        <Select id="lottery-kind" value={kind} onChange={(e) => setKind(e.target.value as LotteryKind)}>
          <option value="government">สลากกินแบ่งรัฐบาล — อากรแสตมป์ 1 บาท ต่อ 200 บาท</option>
          <option value="charity">สลากการกุศล — ภาษี 1%</option>
        </Select>
      </Field>

      {summary.invalid.length > 0 && (
        <ErrorText>
          ข้ามเลขที่ไม่ใช่ตัวเลข 6 หลัก {summary.invalid.length} รายการ: {summary.invalid.slice(0, 5).join(', ')}
          {summary.invalid.length > 5 ? ' …' : ''}
        </ErrorText>
      )}

      <ResultBox label={`ผลการตรวจงวด ${formatThaiDate(draw.date, { style: 'medium' })}`}>
        {summary.results.length === 0
          ? 'ยังไม่ได้กรอกเลขสลาก'
          : summary.winners.length === 0
            ? `ตรวจ ${summary.results.length} ใบ ไม่ถูกรางวัล`
            : `ถูกรางวัล ${summary.winners.length} ใบ จาก ${summary.results.length} ใบ รวม ${formatNumber(summary.total)} บาท`}
      </ResultBox>

      {summary.winners.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="เงินรางวัลรวม" value={`${formatNumber(summary.total)} บาท`} />
            <Stat label="หัก" value={`${formatNumber(net.deduction)} บาท`} />
            <Stat label="ได้รับสุทธิ" value={`${formatNumber(net.net)} บาท`} />
          </div>

          <DataTable<TicketResult>
            caption={`รายการสลากที่ถูกรางวัลงวด ${formatThaiDate(draw.date, { style: 'medium' })}`}
            columns={[
              { key: 'ticket', header: 'เลขสลาก', render: (r) => <span className="font-mono">{r.ticket}</span> },
              { key: 'prize', header: 'รางวัลที่ถูก', render: (r) => r.prizes.map((p) => `${p.label} (${p.number})`).join(', ') },
              { key: 'amount', header: 'เงินรางวัล (บาท)', align: 'right', render: (r) => formatNumber(r.total) },
            ]}
            rows={summary.winners}
            rowKey={(r) => r.ticket}
          />
        </>
      )}

      {raw !== '' && (
        <div>
          <Button variant="secondary" onClick={() => setRaw('')}>ล้างเลขที่กรอก</Button>
        </div>
      )}

      <Disclaimer>
        ยอดหักเป็นการคำนวณเพื่อประกอบการตัดสินใจเท่านั้น การขึ้นเงินรางวัลจริงให้ยึดตามประกาศของสำนักงานสลากกินแบ่งรัฐบาล
      </Disclaimer>
    </div>
  );
}
