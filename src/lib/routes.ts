import type { CategoryId } from '@/tools/types';

/**
 * แหล่งความจริงเดียวของ URL ทั้งเว็บ (§14 ของแผน)
 *
 * ห้าม hardcode path string ที่อื่น — มี test ใน routes.test.ts ที่ scan ทั้ง src/
 * แล้วบังคับว่าไม่มี path เก่าของ Phase ก่อนหน้าหลงเหลือ (นอกจาก public/_redirects และไฟล์ทดสอบ)
 */
export const SITE = 'https://toolsiam.com';

export const getHomeUrl = () => '/';
export const getToolsUrl = () => '/tools';
export const getToolUrl = (slug: string) => `/tools/${slug}`;

/** หมวดที่เป็น vertical จะมี landingPath ของตัวเอง (เพิ่มจริงที่ Phase 0B) */
export const getCategoryUrl = (c: { id: CategoryId; landingPath?: string }) =>
  c.landingPath ?? `/categories/${c.id}`;

/* --- vertical: route ยังไม่มีจนถึง Phase 3/4 แต่ล็อกรูปแบบ URL ไว้ที่นี่ที่เดียว --- */
export const getLotteryUrl = () => '/lottery';
export const getLotteryCheckUrl = () => '/lottery/check';
export const getLotteryLatestUrl = () => '/lottery/results';
export const getLotteryArchiveUrl = () => '/lottery/archive';
export const getLotteryDrawUrl = (drawDate: string) => `/lottery/results/${drawDate}`;

export const getDreamUrl = () => '/dream';
export const getDreamEntryUrl = (slug: string) => `/dream/${slug}`;

export const getHoroscopeUrl = () => '/horoscope';
export const getHoroscopePageUrl = (page: string) => `/horoscope/${page}`;
export const getZodiacSignUrl = (sign: string) => `/horoscope/zodiac/${sign}`;

/** URL เต็มสำหรับ canonical / og:url / JSON-LD */
export const absoluteUrl = (path: string) => new URL(path, SITE).toString();
