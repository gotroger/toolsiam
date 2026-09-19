import type { LuckyNumbers } from '@/content/dream/lucky-numbers';

/** เลขนำโชคแบบย่อบนการ์ด — ใช้ทั้งในหน้า Astro และใน island ค้นหา จึงเป็น React ล้วนไม่มี state */
export default function LuckyBalls({ numbers, size = 'sm' }: { numbers: LuckyNumbers; size?: 'sm' | 'lg' }) {
  return (
    <span className={`lucky-balls lucky-balls-${size}`} aria-label={`เลขนำโชค ${numbers.digits.join(' ')}`}>
      {numbers.digits.map((d) => (
        <span key={d} className="lucky-ball" aria-hidden="true">
          {d}
        </span>
      ))}
    </span>
  );
}
