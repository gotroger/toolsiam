import { describe, expect, it } from 'vitest';
import { parseYoutubeId, THUMBNAIL_SIZES, thumbnailUrl } from './logic';

describe('parseYoutubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ?feature=share', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=x', 'dQw4w9WgXcQ'],
    ['  dQw4w9WgXcQ  ', 'dQw4w9WgXcQ'],
  ])('%s → %s', (input, id) => expect(parseYoutubeId(input)).toBe(id));

  it.each([
    'https://vimeo.com/123',
    'https://www.youtube.com/',
    'abc',
    'dQw4w9WgXc',
    'https://youtube.com/watch?v=too-long-id-x',
    '',
  ])('%s → null', (input) => expect(parseYoutubeId(input)).toBeNull());
});

describe('thumbnailUrl', () => {
  it('มี 4 ขนาดและชี้ไป i.ytimg.com', () => {
    expect(THUMBNAIL_SIZES.map((s) => s.key)).toEqual(['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault']);
    expect(thumbnailUrl('dQw4w9WgXcQ', 'hqdefault')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
});
