import { DatePicker } from '@/components/ui/date-picker';
import { useDateInput } from '@/lib/use-today';
import { zodiacFromDate } from '@/lib/thai-astro';
import { ErrorText, Field, ResultBox } from '@/components/ui';

const MIN_DATE = '1900-01-01';
const MAX_DATE = '2200-12-31';

/** ค้นราศีจากวันเกิด — ส่วน interactive เล็ก ๆ บนหน้าที่เนื้อหาหลักเป็น HTML อยู่แล้ว (§9.5 SEO) */
export default function ZodiacFinder() {
  const [birth, setBirth] = useDateInput();

  let error = '';
  let sign: ReturnType<typeof zodiacFromDate> | null = null;
  if (birth !== '') {
    try {
      sign = zodiacFromDate(birth);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  return (
    <div className="space-y-4">
      <Field label="วันเกิดของคุณ" htmlFor="birth" hint="ช่องวันที่ใช้ปฏิทินปี ค.ศ. ให้ลบ 543 จากปี พ.ศ. ก่อน">
        <DatePicker
          id="birth"
          min={MIN_DATE}
          max={MAX_DATE}
          value={birth}
          onValueChange={setBirth}
          aria-describedby="birth-hint"
        />
      </Field>

      {error && <ErrorText>{error}</ErrorText>}

      {sign && (
        <>
          <ResultBox label="ราศีของคุณ">
            <span aria-hidden="true">{sign.symbol}</span> {sign.name} ({sign.nameEn}) · ธาตุ{sign.element}
          </ResultBox>
          <p className="text-sm text-slate-700">{sign.summary}</p>
          <ul className="flex flex-wrap gap-2">
            {sign.traits.map((t) => (
              <li key={t} className="rounded-lg border border-slate-200 bg-surface px-2.5 py-1 text-xs text-slate-600">
                {t}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
