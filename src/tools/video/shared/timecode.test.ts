import { describe, expect, it } from 'vitest';
import { formatTimecode, parseTimecode } from './timecode';

describe('parseTimecode', () => {
  it.each([
    ['90', 90],
    ['1:30', 90],
    ['01:30.5', 90.5],
    ['1:02:03', 3723],
    ['0:00', 0],
    ['12.25', 12.25],
    [' 2:05 ', 125],
  ])('%s → %s', (text, seconds) => expect(parseTimecode(text)).toBe(seconds));

  it.each(['', 'abc', '-5', '1:60', '1:2:3:4', '1:', ':30', '1.5:20', '1:60:00'])('%s → error', (text) =>
    expect(() => parseTimecode(text)).toThrow(/รูปแบบเวลา/),
  );
});

describe('formatTimecode', () => {
  it.each([
    [0, '0:00'],
    [90, '1:30'],
    [90.5, '1:30.5'],
    [3723, '1:02:03'],
    [59.94, '0:59.9'],
  ])('%s → %s', (s, text) => expect(formatTimecode(s)).toBe(text));
});
