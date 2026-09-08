import { useEffect, useState } from 'react';
import { chineseZodiacFromDate, CHINESE_ZODIAC_MAX_YEAR, CHINESE_ZODIAC_MIN_YEAR } from '@/lib/thai-astro';
import { formatThaiDate } from '@/lib/thai-date';
import { ErrorText, Field, Input, ResultBox, Stat } from '@/components/ui';
import { todayInBangkok } from '@/lib/today';

/** ค้นปีนักษัตรจากวันเกิด โดยใช้ตรุษจีนเป็นเกณฑ์ตัดปี (ล็อกไว้ในแผน §9.4) */
export default function ChineseZodiacFinder() {
  const [birth, setBirth] = useState('');

  useEffect(() => { setBirth(todayInBangkok()); }, []);

  let error = '';
  let result: ReturnType<typeof chineseZodiacFromDate> | null = null;
  if (birth !== '') {
    try { result = chineseZodiacFromDate(birth); } catch (e) { error = (e as Error).message; }
  }

  return (
    <div className="space-y-4">
      <Field
        label="วันเกิดของคุณ"
        htmlFor="cz-birth"
        hint={`รองรับปีเกิด ค.ศ. ${CHINESE_ZODIAC_MIN_YEAR}–${CHINESE_ZODIAC_MAX_YEAR} (พ.ศ. ${CHINESE_ZODIAC_MIN_YEAR + 543}–${CHINESE_ZODIAC_MAX_YEAR + 543})`}
      >
        <Input
          id="cz-birth"
          type="date"
          min={`${CHINESE_ZODIAC_MIN_YEAR}-01-01`}
          max={`${CHINESE_ZODIAC_MAX_YEAR}-12-31`}
          value={birth}
          onChange={(e) => setBirth(e.target.value)}
          aria-describedby="cz-birth-hint"
        />
      </Field>

      {error && <ErrorText>{error}</ErrorText>}

      {result && (
        <>
          <ResultBox label="ปีนักษัตรของคุณ">
            <span aria-hidden="true">{result.animal.emoji}</span> ปี{result.animal.name}
          </ResultBox>

          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="นับเป็นปีนักษัตร ค.ศ." value={String(result.zodiacYear)} />
            <Stat label="ตรุษจีนของปีเกิด" value={formatThaiDate(result.newYearDate, { style: 'medium' })} />
          </div>

          {result.beforeNewYear && (
            <p className="rounded-[10px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              คุณเกิดก่อนวันตรุษจีนของปีนั้น ตามเกณฑ์ปฏิทินจีนจึงยังนับเป็นนักษัตรของปีก่อนหน้า
              ซึ่งต่างจากการนับแบบเริ่มปีวันที่ 1 มกราคม ที่คนไทยหลายคนคุ้นเคย
            </p>
          )}

          <p className="text-sm text-slate-700">{result.animal.summary}</p>
          <ul className="flex flex-wrap gap-2">
            {result.animal.traits.map((t) => (
              <li key={t} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">{t}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
