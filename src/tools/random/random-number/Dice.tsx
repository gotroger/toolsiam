/** ตำแหน่งจุดแต้มบนตาราง 3×3 ตามหน้าลูกเต๋ามาตรฐาน */
const PIPS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  6: [
    [0, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2],
  ],
};

/**
 * ลูกเต๋าหนึ่งลูก — วาดจุดแต้มจริงเมื่อไม่เกินหกหน้า
 *
 * ลูกเต๋าบอร์ดเกม 20 หน้าไม่มีหน้าตามาตรฐานให้วาด จึงแสดงเป็นตัวเลขในกรอบเดียวกัน
 * ดีกว่าประดิษฐ์จุดแต้มที่ไม่มีอยู่จริงขึ้นมาเอง
 */
export function Die({ value, rolling }: { value: number; rolling: boolean }) {
  const pips = PIPS[value];
  return (
    <svg
      viewBox="0 0 48 48"
      className={rolling ? 'dice-rolling h-14 w-14' : 'h-14 w-14'}
      role="img"
      aria-label={`ลูกเต๋าได้ ${value}`}
    >
      <rect
        x="1.75"
        y="1.75"
        width="44.5"
        height="44.5"
        rx="10"
        fill="color-mix(in srgb, currentColor 10%, var(--color-surface))"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      {pips ? (
        pips.map(([column, row]) => (
          <circle key={`${column}-${row}`} cx={12 + column * 12} cy={12 + row * 12} r="4.2" fill="currentColor" />
        ))
      ) : (
        <text
          x="24"
          y="25"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="19"
          fontWeight="600"
          fill="currentColor"
        >
          {value}
        </text>
      )}
    </svg>
  );
}

/** เหรียญหนึ่งเหรียญ — หัวใช้ลายวงใน ก้อยใช้ลายขีด แยกกันด้วยรูปทรงไม่ใช่แค่ข้อความ */
export function Coin({ side, flipping }: { side: 'หัว' | 'ก้อย'; flipping: boolean }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={flipping ? 'dice-rolling h-14 w-14' : 'h-14 w-14'}
      role="img"
      aria-label={`เหรียญออก${side}`}
    >
      <circle
        cx="24"
        cy="24"
        r="21"
        fill="color-mix(in srgb, currentColor 10%, var(--color-surface))"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      {side === 'หัว' ? (
        <circle cx="24" cy="24" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" />
      ) : (
        <path d="M14 18h20M14 24h20M14 30h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      )}
    </svg>
  );
}
