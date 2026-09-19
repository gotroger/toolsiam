/**
 * ไอคอนเฉพาะตัวของเครื่องมือแต่ละชิ้น — ทุกเครื่องมือต้องมีของตัวเอง ห้ามตกไปใช้ไอคอนหมวด
 *
 * เหตุผล: พอเครื่องมือในหมวดเดียวกันมีหลายชิ้น (PDF 8 ชิ้น) ไอคอนหมวดซ้ำกันทั้งแถวจนลายตา
 * แยกไม่ออกว่าใบไหนคืออะไร · `tool-glyphs.test.ts` บังคับว่าครบและไม่ซ้ำกัน
 *
 * กติกาเดียวกับไอคอนหมวด (§15.2): viewBox 24 · เส้นล้วน · currentColor · สีมาจากหมวดผ่าน CSS
 */
const CALENDAR =
  'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12Zm0 3.5h16M8.5 3v4m7-4v4';
const DOC = 'M6 3h9l4 4v14H6V3Zm8 0v5h5';
const QR_EYES = 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Z';

export const TOOL_GLYPHS: Record<string, string> = {
  // เอกสาร / PDF
  'pdf-merge': 'M4 3h6v7H4V3Zm0 11h6v7H4v-7ZM14 8h6v9h-6V8ZM10 6.5h2v4h2M10 17.5h2v-4',
  'pdf-extract': 'M11 21H5V3h9l3 3v6M14 3v3h3M14 16h7m-3-3 3 3-3 3',
  'pdf-remove-pages': `${DOC}M9.5 12l5 5m0-5-5 5`,
  'pdf-rotate': 'M7 9h7l3 3v9H7V9ZM4 9a7 7 0 0 1 7-6h3m-2-2 2 2-2 2',
  'images-to-pdf': 'M3 4h9v8H3V4Zm0 6 3-3 3 3M14 12h4l3 3v6h-7v-9ZM7 15v4h4m-2-2 2 2-2 2',
  'excel-to-csv': 'M3 4h12v12H3V4Zm0 4h12M3 12h12M7 4v12M11 4v12M16 20h5m-2-2 2 2-2 2',
  'csv-to-excel': 'M3 5h7M3 9h7M3 13h5M13 9h8v11h-8V9Zm0 4h8m-8 3.5h8M17 9v11M6 16v4h4m-2-2 2 2-2 2',
  'word-to-text': `${DOC}M9 12h6M12 12v6`,
  // รูปภาพ
  'image-compress': 'M3 4h18v16H3V4ZM7.5 8.5l3 3m0-2.5v2.5H8M16.5 15.5l-3-3m0 2.5v-2.5H16',
  'image-resize': 'M3 3h18v18H3V3Zm0 10h8v8M14 6h4v4m0-4-5 5',
  'image-convert': 'M3 3h8v8H3V3Zm10 10h8v8h-8v-8ZM15 4h3a2 2 0 0 1 2 2v3M9 20H6a2 2 0 0 1-2-2v-3',
  'image-rotate': 'M4 9h11v11H4V9Zm0 8 3-3 3 3 2-2 3 3M19 13V8a4 4 0 0 0-4-4h-3m2-2-2 2 2 2',
  // การเงิน
  'thai-income-tax': `${DOC}M9 12h7M9 16h5`,
  'net-salary': 'M3 7h18v13H3V7Zm0 0 14-4v4M16 12h5v4h-5v-4Z',
  'social-security': 'M12 3 4.5 6v5.5c0 4.5 3 8 7.5 9.5 4.5-1.5 7.5-5 7.5-9.5V6L12 3Zm0 5.5v6m-3-3h6',
  'severance-pay': 'M3 7h18v14H3V7Zm5 0V3h8v4M3 12h18M10 12v3h4v-3',
  'ot-calculator': 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 4v6h5',
  'work-tenure': 'M3 8h18v12H3V8Zm5 0V4h8v4M12 11v3.5l2.5 1.5',
  'wht-calculator': 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3.5 5.5h.01M14.5 13.5h.01M15 8l-6 6',
  'compound-interest': 'M3 20h18M4 16l5-5 4 3 7-8m-4 0h4v4',
  // บ้านและรถ
  'loan-installment': 'M3 20h18M5 20V5m4.7 15V9m4.6 11v-7M19 20v-3',
  'home-loan': 'm3 10 9-7 9 7M5 9v12h14V9M10 21v-8h4v8',
  'car-loan': 'm5 9 2-5h10l2 5M3 10h18v8H3v-8Zm2 8v3m14-3v3M6 13h2m8 0h2',
  'credit-card-debt': 'M3 6h18v12H3V6Zm0 4h18M6.5 14.5h4',
  'flat-effective-rate':
    'M19 5 5 19M6.5 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm11 11a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z',
  // ค้าขาย
  'vat-wht': 'M6 3h12v18H6V3Zm3 3.5h6v3H9v-3ZM9 13.5h.01M12 13.5h.01M15 13.5h.01M9 17h.01M12 17h.01M15 17h.01',
  'baht-text': 'M4 6h5a2.5 2.5 0 0 1 0 5H4m0 0h5.5a2.5 2.5 0 0 1 0 5H4V6Zm3-2v14M15 8h6M15 12h6M15 16h4',
  'profit-margin': 'M11 4a8.5 8.5 0 1 0 9 9h-9V4Zm3-1a7.5 7.5 0 0 1 7 7h-7V3Z',
  'selling-price': 'M3 12V4h8l10 10-8 8L3 12Zm4.5-4.5h.01',
  'shop-profit':
    'M4 9 5.5 4h13L20 9M4.5 10v10h15V10M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9M10 20v-5h4v5',
  // ชีวิตประจำวัน
  'word-count': 'M4 6h16M4 10h16M4 14h8M4 18h5M17.5 14v6m-3-3h6',
  'thai-numerals': 'M4 8l2.5-2v12M4 18h5M13 9h8m-2.5-2.5L21 9l-2.5 2.5M21 15h-8m2.5-2.5L13 15l2.5 2.5',
  'text-lines': 'M4 6h10M4 12h7M4 18h4M17 5v14m-3-3 3 3 3-3',
  'thai-id-check': 'M3 5h18v14H3V5Zm4 5a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm-1 6c.5-2 5.5-2 6 0M14.5 12l2 2 3-4',
  'electricity-bill': 'm13 2-9 12h7l-1 8 10-13h-8l1-7Z',
  'fuel-cost':
    'M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M6.5 7h5v4h-5V7ZM14 12h2a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 0 3 0V9l-3-3',
  'json-formatter':
    'M8 4c-2 0-3 1-3 3v2c0 1.5-1 3-2 3 1 0 2 1.5 2 3v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1.5 1 3 2 3-1 0-2 1.5-2 3v2c0 2-1 3-3 3',
  // วันเวลา
  'age-days':
    'M4 20v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7M3 20h18M4 15.5c2 1.5 3.5 1.5 5.3 0s3.6-1.5 5.4 0 3.3 1.5 5.3 0M12 11V7m0-3.5V4',
  'date-add': `${CALENDAR}M12 12.5v5m-2.5-2.5h5`,
  'thai-year-convert': 'M4 9h13m-3-3 3 3-3 3M20 15H7m3-3-3 3 3 3',
  'thai-holidays': `${CALENDAR}M9 14.5l2 2 4-4`,
  // QR / PromptPay
  'promptpay-qr': `${QR_EYES}M15 14h3a1.5 1.5 0 0 1 0 3h-3m0 0h3.5a1.5 1.5 0 0 1 0 3H15v-6Zm2-1v8`,
  'qr-generator': `${QR_EYES}M17 14v6m-3-3h6`,
  'qr-reader': 'M4 8V5a1 1 0 0 1 1-1h3m8 0h3a1 1 0 0 1 1 1v3m0 8v3a1 1 0 0 1-1 1h-3m-8 0H5a1 1 0 0 1-1-1v-3M3 12h18',
  // ที่ดิน
  'land-unit-convert': 'M3 16 16 3l5 5L8 21l-5-5Zm4-4 2 2m1-5 2 2m1-5 2 2',
  'land-price':
    'M12 17s-5-4.5-5-8a5 5 0 1 1 10 0c0 3.5-5 8-5 8Zm0-9.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM5 16.5 3.5 21h17L19 16.5',
  // วิดีโอและเสียง
  'video-trim':
    'M6 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 11a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM8 8l12 10M8 16 20 6',
  'video-to-mp3': 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  'video-to-gif': 'M7 7h14v12H7V7ZM3 15V4h13M12 10.5v5l4-2.5-4-2.5Z',
  'video-compress': 'M4 4h16v16H4V4Zm8 3v4m-2-2 2 2 2-2M12 17v-4m-2 2 2-2 2 2',
  'youtube-thumbnail': 'M3 4h18v12H3V4Zm7 3.5v5l4.5-2.5L10 7.5ZM12 18v3.5m-2.5-2L12 22l2.5-2.5',
  'clean-share-link':
    'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1',
};
