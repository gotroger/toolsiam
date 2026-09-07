import { useEffect, useState } from 'react';
import { BE_OFFSET, describeDate, formatThaiDate } from './logic';
import { Button, Field, Input, ResultBox, Stat } from '@/components/ui';

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function ThaiYearConvertTool() {
  const [ce, setCe] = useState('2026');
  const [date, setDate] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDate(todayIso());
  }, []);

  const ceNum = Number(ce);
  const beText = Number.isInteger(ceNum) && ceNum > 0 ? String(ceNum + BE_OFFSET) : '';

  let info: ReturnType<typeof describeDate> | null = null;
  let error = '';
  if (date !== '') {
    try {
      info = describeDate(date);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ปี ค.ศ." htmlFor="ce">
          <Input id="ce" inputMode="numeric" value={ce} onChange={(e) => setCe(e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Field label="ปี พ.ศ." htmlFor="be">
          <Input
            id="be"
            inputMode="numeric"
            value={beText}
            onChange={(e) => {
              const be = Number(e.target.value.replace(/\D/g, ''));
              setCe(be > BE_OFFSET ? String(be - BE_OFFSET) : '');
            }}
          />
        </Field>
      </div>

      <Field label="เลือกวันที่เพื่อดูรายละเอียด" htmlFor="date">
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {info && (
        <>
          <ResultBox label="วันที่ภาษาไทย">{info.fullThai}</ResultBox>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="วันในสัปดาห์" value={`วัน${info.weekdayName}`} />
            <Stat label="สีประจำวัน" value={info.dayColor} />
            <Stat label="วันที่ของปี" value={`${info.dayOfYear} / ${info.isLeapYear ? 366 : 365}`} />
            <Stat label="แบบสั้น" value={info.shortThai} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => copy(info!.fullThai)}>{copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกแบบเต็ม'}</Button>
            <Button variant="secondary" onClick={() => copy(formatThaiDate(info!.iso, { style: 'short' }))}>
              คัดลอกแบบสั้น
            </Button>
            <Button variant="secondary" onClick={() => copy(formatThaiDate(info!.iso, { era: 'ce' }))}>
              คัดลอกแบบ ค.ศ.
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
