import { DatePicker } from '@/components/ui/date-picker';
import { useDateInput } from '@/lib/use-today';
import { compatibleSigns, zodiacFromDate, zodiacRange } from '@/lib/thai-astro';
import { getHoroscopePageUrl } from '@/lib/routes';
import ZodiacBadge from './ZodiacBadge';
import { ErrorText, Field } from '@/components/ui';

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
      <Field label="วันเกิดของคุณ" htmlFor="birth" hint="เลือกวัน เดือน และปี พ.ศ. ได้โดยตรงในปฏิทิน">
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
        <div className="zodiac-result" data-element={sign.element}>
          <header className="daily-result-head">
            <ZodiacBadge sign={sign} size="lg" />
            <div>
              <h2>
                {sign.name} <span className="text-slate-500">({sign.nameEn})</span>
              </h2>
              <p>{zodiacRange(sign)}</p>
            </div>
          </header>
          <p className="mt-4 text-slate-700">{sign.summary}</p>
          <dl className="zodiac-facts">
            <div>
              <dt>ธาตุ</dt>
              <dd>{sign.element}</dd>
            </div>
            <div>
              <dt>ดาวเจ้าเรือน</dt>
              <dd>{sign.planet}</dd>
            </div>
            <div>
              <dt>คุณภาพราศี</dt>
              <dd>{sign.quality}</dd>
            </div>
            <div>
              <dt>เข้ากันดี (ธาตุเดียวกัน)</dt>
              <dd>
                {compatibleSigns(sign)
                  .sameElement.map((s) => s.name)
                  .join(' · ')}
              </dd>
            </div>
            <div>
              <dt>ส่งเสริมกัน</dt>
              <dd>
                {compatibleSigns(sign)
                  .complementary.map((s) => s.name)
                  .join(' · ')}
              </dd>
            </div>
          </dl>
          <ul className="mt-4 flex flex-wrap gap-2">
            {sign.traits.map((t) => (
              <li key={t} className="rounded-full border border-slate-200 bg-surface px-3 py-1 text-xs text-slate-700">
                {t}
              </li>
            ))}
          </ul>
          <a
            href={`${getHoroscopePageUrl('daily')}?sign=${sign.id}`}
            className="mt-5 inline-block text-sm font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            ดูดวง{sign.name}วันนี้ →
          </a>
        </div>
      )}
    </div>
  );
}
