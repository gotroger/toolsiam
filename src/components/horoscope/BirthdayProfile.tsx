import { useEffect, useState } from 'react';
import {
  chineseZodiacFromDate, CHINESE_ZODIAC_MAX_YEAR, CHINESE_ZODIAC_MIN_YEAR,
  dayColorsFromDate, numerologyFromDate, zodiacFromDate,
} from '@/lib/thai-astro';
import { formatThaiDate } from '@/lib/thai-date';
import { ErrorText, Field, Input, ResultBox, Stat } from '@/components/ui';
import { todayInBangkok } from '@/lib/today';
import { getHoroscopePageUrl } from '@/lib/routes';

/**
 * หน้ารวมดวงจากวันเกิด — เรียก logic ของหน้าย่อยทุกหน้ามาแสดงในที่เดียว
 * ไม่มี logic ของตัวเอง เพื่อไม่ให้ผลลัพธ์ขัดกับหน้าย่อยเมื่อแก้ตำราในอนาคต
 */
export default function BirthdayProfile() {
  const [birth, setBirth] = useState('');

  useEffect(() => { setBirth(todayInBangkok()); }, []);

  let error = '';
  let sign: ReturnType<typeof zodiacFromDate> | null = null;
  let colors: ReturnType<typeof dayColorsFromDate> | null = null;
  let numbers: ReturnType<typeof numerologyFromDate> | null = null;
  let chinese: ReturnType<typeof chineseZodiacFromDate> | null = null;
  let chineseError = '';

  if (birth !== '') {
    try {
      sign = zodiacFromDate(birth);
      colors = dayColorsFromDate(birth);
      numbers = numerologyFromDate(birth);
    } catch (e) {
      error = (e as Error).message;
    }
    // ปีนักษัตรมีช่วงปีที่รองรับจำกัดกว่าส่วนอื่น จึงแยก error ไม่ให้ล้มทั้งหน้า
    try {
      chinese = chineseZodiacFromDate(birth);
    } catch (e) {
      chineseError = (e as Error).message;
    }
  }

  return (
    <div className="space-y-5">
      <Field label="วันเกิดของคุณ" htmlFor="bd-birth" hint="ช่องวันที่ใช้ปฏิทินปี ค.ศ. ให้ลบ 543 จากปี พ.ศ. ก่อน">
        <Input id="bd-birth" type="date" min="1900-01-01" max="2200-12-31" value={birth} onChange={(e) => setBirth(e.target.value)} aria-describedby="bd-birth-hint" />
      </Field>

      {error && <ErrorText>{error}</ErrorText>}

      {sign && colors && numbers && (
        <>
          <ResultBox label="สรุปดวงจากวันเกิด">
            {formatThaiDate(birth)} · <span aria-hidden="true">{sign.symbol}</span> {sign.name}
            {chinese && <> · ปี{chinese.animal.name}</>}
          </ResultBox>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="ราศี" value={`${sign.name} (ธาตุ${sign.element})`} />
            <Stat label="ปีนักษัตร" value={chinese ? `ปี${chinese.animal.name}` : 'นอกช่วงที่รองรับ'} />
            <Stat label="เกิดวัน" value={`${colors.weekdayName} · สี${colors.birthColor}`} />
            <Stat label="เลขชีวิต" value={String(numbers.lifePath)} />
          </div>

          {chineseError && (
            <p className="rounded-[10px] border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              ส่วนปีนักษัตรรองรับปีเกิด ค.ศ. {CHINESE_ZODIAC_MIN_YEAR}–{CHINESE_ZODIAC_MAX_YEAR} เท่านั้น
              เพราะต้องใช้วันตรุษจีนของแต่ละปีเป็นเกณฑ์ตัดปี ส่วนอื่นยังคำนวณให้ครบ
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-[10px] border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">ลักษณะตามราศี</h3>
              <p className="mt-1.5 text-sm text-slate-700">{sign.summary}</p>
              <p className="mt-2 text-xs text-slate-500">
                ดูรายละเอียดที่ <a className="text-brand-700 underline underline-offset-2" href={getHoroscopePageUrl('zodiac')}>หน้าราศีจากวันเกิด</a>
              </p>
            </section>

            <section className="rounded-[10px] border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">สีมงคลประจำวันเกิด</h3>
              <ul className="mt-1.5 space-y-0.5 text-sm text-slate-700">
                <li>การงาน: {colors.work.join(' · ')}</li>
                <li>การเงิน: {colors.money.join(' · ')}</li>
                <li>ความรัก: {colors.love.join(' · ')}</li>
                <li>โชคลาภ: {colors.luck.join(' · ')}</li>
              </ul>
              <p className="mt-2 text-xs text-slate-500">
                ดูรายละเอียดที่ <a className="text-brand-700 underline underline-offset-2" href={getHoroscopePageUrl('lucky-color')}>หน้าสีมงคลประจำวัน</a>
              </p>
            </section>

            <section className="rounded-[10px] border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">เลขศาสตร์วันเกิด</h3>
              <p className="mt-1.5 text-sm text-slate-700">{numbers.meaning}</p>
              <p className="mt-2 text-xs text-slate-500">
                ดูวิธีคำนวณที่ <a className="text-brand-700 underline underline-offset-2" href={getHoroscopePageUrl('numerology')}>หน้าเลขศาสตร์วันเกิด</a>
              </p>
            </section>

            {chinese && (
              <section className="rounded-[10px] border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">ปีนักษัตร</h3>
                <p className="mt-1.5 text-sm text-slate-700">{chinese.animal.summary}</p>
                <p className="mt-2 text-xs text-slate-500">
                  ตรุษจีนของปีเกิดคือ {formatThaiDate(chinese.newYearDate, { style: 'medium' })} ·{' '}
                  <a className="text-brand-700 underline underline-offset-2" href={getHoroscopePageUrl('chinese-zodiac')}>ดูรายละเอียด</a>
                </p>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
