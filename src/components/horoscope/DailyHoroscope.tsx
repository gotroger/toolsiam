import { useState, useSyncExternalStore } from 'react';
import { useTodayInBangkok } from '@/lib/use-today';
import { ZODIAC_SIGNS, zodiacById, zodiacRange } from '@/lib/thai-astro';
import { DAILY_CATEGORIES, DAILY_POOL, type DailyCategory } from '@/content/horoscope/daily-pool';
import { pickForGroup } from '@/lib/seeded';
import { formatThaiDate } from '@/lib/thai-date';
import ZodiacBadge from './ZodiacBadge';
import ErrorBoundary from '@/components/ErrorBoundary';

/**
 * ดวงรายวัน 12 ราศี (§9.5)
 *
 * รันฝั่ง client **หลัง mount** โดยตั้งใจ ไม่ใช่ตอน build — หน้า static ที่ build วันนี้
 * จะค้างอยู่ที่เนื้อหาของวันที่ build ถ้าคำนวณตอน build · pattern เดียวกับที่ repo ใช้อยู่แล้ว
 * ในการ seed ค่าวันที่หลัง mount เพื่อกัน hydration mismatch
 *
 * ผลลัพธ์ deterministic 100%: seed = หมวด + วันที่ไทย และ index เลื่อนตามลำดับราศี
 * จึงไม่มีการสุ่ม ไม่เรียก AI และไม่มีค่าใช้จ่ายฝั่งเซิร์ฟเวอร์
 */
const STORAGE_KEY = 'toolsiam-zodiac-sign';

/** ไอคอนเส้นของสี่ด้าน — viewBox 24 เหมือนชุดไอคอนกลาง */
const ASPECT_ICONS: Record<DailyCategory, string> = {
  love: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  money:
    'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm2.5 6.5a2.5 2 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1.1 1.8 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2a2.5 2 0 0 1-2.5-1.5M12 6v12',
  work: 'M3 8h18v12H3V8Zm5 0V4h8v4M3 13h18',
  health: 'M3 12h4l2.5-6 4 12 2.5-6h5',
};

const subscribe = () => () => {};

/**
 * ราศีตั้งต้นของผู้ใช้คนนี้: ?sign= ในลิงก์ (มาจากหน้ารวม) > ราศีที่เคยเลือกไว้ในเครื่องนี้
 * อ่านผ่าน useSyncExternalStore แบบเดียวกับ `useTodayInBangkok` — ฝั่ง server คืน null
 * HTML ที่ build ไว้จึงเหมือนกันทุกคน ไม่มี hydration mismatch และไม่ต้อง setState ใน effect
 */
function readPreferredSign(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get('sign');
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // โหมดส่วนตัวบางเบราว์เซอร์ปิด storage — ไม่จำก็ยังใช้งานได้ครบ
  }
  return [fromUrl, saved].find((id) => id && zodiacById(id)) ?? null;
}

function DailyHoroscopeInner({ initialSign }: { initialSign?: string }) {
  const preferred = useSyncExternalStore(subscribe, readPreferredSign, () => null);
  // เก็บเฉพาะค่าที่ผู้ใช้กดเลือกในรอบนี้ (null = ยังไม่ได้กด) แล้ว fallback ตามลำดับ
  const [chosen, setChosen] = useState<string | null>(null);
  const signId = chosen ?? preferred ?? initialSign ?? ZODIAC_SIGNS[0].id;

  const choose = (id: string) => {
    setChosen(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ดูคอมเมนต์ใน readPreferredSign
    }
  };

  // "วันนี้" ต้องเป็นวันไทยเสมอ ผู้ใช้ทุกประเทศจึงเห็นดวงของวันเดียวกัน (§27 D2)
  const today = useTodayInBangkok();

  const signIndex = Math.max(
    0,
    ZODIAC_SIGNS.findIndex((s) => s.id === signId),
  );
  const sign = ZODIAC_SIGNS[signIndex];

  return (
    <div>
      <fieldset>
        <legend className="text-sm font-medium text-slate-900">เลือกราศีของคุณ</legend>
        <div className="zodiac-picker mt-3">
          {ZODIAC_SIGNS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="zodiac-option"
              data-element={s.element}
              aria-pressed={s.id === signId}
              onClick={() => choose(s.id)}
            >
              <ZodiacBadge sign={s} />
              <span className="zodiac-option-name">{s.name.replace('ราศี', '')}</span>
              <span className="zodiac-option-range">{zodiacRange(s)}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="daily-result" data-element={sign.element} aria-live="polite">
        <header className="daily-result-head">
          <ZodiacBadge sign={sign} size="lg" />
          <div>
            <h2>ดวง{sign.name}วันนี้</h2>
            <p>
              {today === '' ? 'กำลังอ่านวันที่ตามเวลาประเทศไทย…' : formatThaiDate(today, { style: 'full' })} · ธาตุ
              {sign.element}
            </p>
          </div>
        </header>

        {today !== '' && (
          <div className="daily-aspects">
            {DAILY_CATEGORIES.map((c) => (
              <article key={c.id} className="daily-aspect" data-aspect={c.id}>
                <h3>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={ASPECT_ICONS[c.id as DailyCategory]} />
                  </svg>
                  {c.label}
                </h3>
                <p>
                  {pickForGroup(DAILY_POOL[c.id as DailyCategory], `${c.id}-${today}`, signIndex, ZODIAC_SIGNS.length)}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-600">
        เปลี่ยนทุกเที่ยงคืนตามเวลาประเทศไทย · เปิดกี่ครั้งในวันเดียวกันก็ได้ข้อความเดิม ·
        เครื่องนี้จะจำราศีที่เลือกไว้ให้
      </p>
    </div>
  );
}

/** ห่อด้วย ErrorBoundary แบบเดียวกับ island ของเครื่องมือ — พังแล้วยังเหลือข้อความบอกผู้ใช้ ไม่ใช่กล่องว่าง */
export default function DailyHoroscope(props: { initialSign?: string }) {
  return (
    <ErrorBoundary name="horoscope-daily-horoscope">
      <DailyHoroscopeInner {...props} />
    </ErrorBoundary>
  );
}
