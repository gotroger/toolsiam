import type { CategoryId } from '@/tools/types';

/**
 * แหล่งความจริงเดียวของ URL ทั้งเว็บ (§14 ของแผน)
 *
 * ห้าม hardcode path string ที่อื่น — มี test ใน routes.test.ts ที่ scan ทั้ง src/
 * แล้วบังคับว่าไม่มี path เก่าของ Phase ก่อนหน้าหลงเหลือ (นอกจาก public/_redirects และไฟล์ทดสอบ)
 */
export const SITE = 'https://toolsiam.com';

export const getHomeUrl = () => '/';
/** หน้ารวม primitive สำหรับคนทำเว็บ — ไม่ได้เชื่อมจากเมนู และไม่เข้า sitemap */
export const getDesignSystemUrl = () => '/design-system';
export const getToolsUrl = () => '/tools';
export const getToolUrl = (slug: string) => `/tools/${slug}`;

/* --- สมาชิกและพรีเมียม (spec 2026-09-19-membership-premium-design) --- */
/** หน้าขายพรีเมียม static index ได้ — ไม่ใช่ /pricing ที่ปลดระวางไปแล้ว (มีกฎ 301 ชี้มาที่นี่) */
export const getPremiumUrl = () => '/premium';
/** หน้าบัญชี — noindex เพราะเนื้อหาขึ้นกับผู้ใช้ */
export const getAccountUrl = () => '/account';
export const getPrivacyUrl = () => '/privacy';
export const getTermsUrl = () => '/terms';
/** เริ่ม OAuth กับ Google — `next` คือ path ที่จะกลับไปหลังล็อกอิน (ต้องขึ้นต้นด้วย /) */
export const getLoginUrl = (next?: string) =>
  next ? `/api/auth/google/start?next=${encodeURIComponent(next)}` : '/api/auth/google/start';
export const getGoogleCallbackPath = () => '/api/auth/google/callback';
/** ออกจากระบบต้องเป็น POST (ฟอร์ม) — GET ธรรมดาจะโดน Origin check ปฏิเสธ */
export const getLogoutUrl = () => '/api/auth/logout';
export const getMeApiUrl = () => '/api/me';
export const getCheckoutApiUrl = () => '/api/billing/checkout';
export const getBillingStatusUrl = (ref: string) => `/api/billing/status?ref=${encodeURIComponent(ref)}`;
export const getBillingHistoryUrl = () => '/api/billing/history';
export const getBillingWebhookPath = () => '/api/billing/webhook';

/** หมวดที่เป็น vertical จะมี landingPath ของตัวเอง (เพิ่มจริงที่ Phase 0B) */
export const getCategoryUrl = (c: { id: CategoryId; landingPath?: string }) => c.landingPath ?? `/categories/${c.id}`;

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
