import { useEffect, useState } from 'react';
import { describeDate, formatThaiDate, toBuddhistYear, toChristianYear } from '@/lib/thai-date';
import { Button, Field, Input, ResultBox, Stat } from '@/components/ui';

const MIN_DATE = '1900-01-01';
const MAX_DATE = '2200-12-31';

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** ข้อความดิบของทั้งสองช่อง + ช่องที่ผู้ใช้กำลังพิมพ์ (ช่องนั้นจะไม่ถูกเขียนทับ) */
interface YearState {
  ce: string;
  be: string;
  lastEdited: 'ce' | 'be';
}

const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, 4);

/** พิมพ์ในช่อง ค.ศ. → เติมช่อง พ.ศ. ให้ (ถ้าแปลงไม่ได้ ปล่อยว่างไว้ ไม่แก้ข้อความที่พิมพ์) */
function fromCe(raw: string): YearState {
  let be = '';
  try {
    be = String(toBuddhistYear(Number(raw)));
  } catch {
    be = '';
  }
  return { ce: raw, be: raw === '' ? '' : be, lastEdited: 'ce' };
}

/** พิมพ์ในช่อง พ.ศ. → เติมช่อง ค.ศ. ให้ */
function fromBe(raw: string): YearState {
  let ce = '';
  try {
    ce = String(toChristianYear(Number(raw)));
  } catch {
    ce = '';
  }
  return { ce: raw === '' ? '' : ce, be: raw, lastEdited: 'be' };
}

export default function ThaiYearConvertTool() {
  const [year, setYear] = useState<YearState>({ ce: '', be: '', lastEdited: 'ce' });
  const [date, setDate] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const iso = todayIso();
    setDate(iso);
    setYear(fromCe(iso.slice(0, 4)));
  }, []);

  // แจ้งเตือนเฉพาะตอนที่ช่องที่พิมพ์มีค่าแล้วแต่แปลงไม่ได้
  let yearError = '';
  if (year.lastEdited === 'be' && year.be !== '' && year.ce === '') {
    yearError = 'ปี พ.ศ. ต้องมากกว่า 543';
  } else if (year.lastEdited === 'ce' && year.ce !== '' && year.be === '') {
    yearError = 'ปี ค.ศ. ต้องมากกว่า 0';
  }

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
          <Input
            id="ce"
            inputMode="numeric"
            autoComplete="off"
            value={year.ce}
            onChange={(e) => setYear(fromCe(digitsOnly(e.target.value)))}
          />
        </Field>
        <Field label="ปี พ.ศ." htmlFor="be">
          <Input
            id="be"
            inputMode="numeric"
            autoComplete="off"
            value={year.be}
            onChange={(e) => setYear(fromBe(digitsOnly(e.target.value)))}
          />
        </Field>
      </div>

      {yearError && <p className="text-sm text-red-600">{yearError}</p>}

      <Field label="เลือกวันที่เพื่อดูรายละเอียด" htmlFor="date">
        <Input
          id="date"
          type="date"
          min={MIN_DATE}
          max={MAX_DATE}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
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
