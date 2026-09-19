import { zodiacGlyph, type ZodiacSign } from '@/lib/thai-astro';

/** สัญลักษณ์ราศีในวงกลมสีประจำธาตุ — สีมาจาก `data-element` ใน product.css */
export default function ZodiacBadge({ sign, size = 'md' }: { sign: ZodiacSign; size?: 'md' | 'lg' }) {
  return (
    <span className={`zodiac-badge zodiac-badge-${size}`} data-element={sign.element} aria-hidden="true">
      {zodiacGlyph(sign)}
    </span>
  );
}
