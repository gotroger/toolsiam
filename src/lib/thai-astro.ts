import { parseIsoDate, weekdayIndex } from '@/lib/date';
import { THAI_DAY_COLORS, THAI_WEEKDAYS } from '@/lib/thai-date';

/**
 * ข้อมูลดวงและความเชื่อไทย — deterministic ล้วน ไม่มีการสุ่มและไม่เรียก AI
 *
 * ทุกอย่างในไฟล์นี้เป็น "ความเชื่อ" ไม่ใช่ข้อเท็จจริงที่ตรวจสอบได้
 * หน้าเว็บที่ใช้ข้อมูลนี้ต้องมี disclaimer เสมอ (§9.5)
 */

/* ------------------------------------------------------------------ *
 * ราศีสากล (Western / Tropical) — ล็อกไว้ในแผน §9.4
 * ------------------------------------------------------------------ */

export type ZodiacElement = 'ไฟ' | 'ดิน' | 'ลม' | 'น้ำ';
export type ZodiacQuality = 'จรราศี' | 'สถิรราศี' | 'อุภัยราศี';

export interface ZodiacSign {
  id: string;
  name: string;
  nameEn: string;
  symbol: string;
  /** วันเริ่มต้นของราศี [เดือน, วัน] */
  from: [number, number];
  to: [number, number];
  element: ZodiacElement;
  /** ดาวเจ้าเรือนตามโหราศาสตร์สากล — ราศีที่มีดาวยุคใหม่ระบุดาวดั้งเดิมไว้ในวงเล็บ */
  planet: string;
  /** คุณภาพของราศี: จร (cardinal) · สถิร (fixed) · อุภัย (mutable) */
  quality: ZodiacQuality;
  /** ลักษณะเด่นตามความเชื่อ */
  traits: string[];
  summary: string;
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  {
    id: 'aries',
    name: 'ราศีเมษ',
    nameEn: 'Aries',
    symbol: '♈',
    from: [3, 21],
    to: [4, 19],
    element: 'ไฟ',
    planet: 'ดาวอังคาร',
    quality: 'จรราศี',
    traits: ['กล้าตัดสินใจ', 'ชอบเป็นผู้เริ่ม', 'ตรงไปตรงมา', 'ใจร้อน'],
    summary:
      'ราศีแรกของจักรราศี ขึ้นชื่อเรื่องความกล้าและพลังในการเริ่มสิ่งใหม่ มักเป็นคนที่ลงมือก่อนแล้วค่อยคิดรายละเอียดทีหลัง',
  },
  {
    id: 'taurus',
    name: 'ราศีพฤษภ',
    nameEn: 'Taurus',
    symbol: '♉',
    from: [4, 20],
    to: [5, 20],
    element: 'ดิน',
    planet: 'ดาวศุกร์',
    quality: 'สถิรราศี',
    traits: ['หนักแน่น', 'รักความมั่นคง', 'รักสวยรักงาม', 'เปลี่ยนใจยาก'],
    summary: 'ราศีที่ให้ค่ากับความมั่นคงและความสบายทางกาย ทำอะไรช้าแต่ชัวร์ และเมื่อตัดสินใจแล้วมักไม่เปลี่ยน',
  },
  {
    id: 'gemini',
    name: 'ราศีเมถุน',
    nameEn: 'Gemini',
    symbol: '♊',
    from: [5, 21],
    to: [6, 20],
    element: 'ลม',
    planet: 'ดาวพุธ',
    quality: 'อุภัยราศี',
    traits: ['ช่างพูด', 'เรียนรู้ไว', 'ปรับตัวเก่ง', 'เบื่อง่าย'],
    summary:
      'ราศีแห่งการสื่อสารและความอยากรู้ ชอบข้อมูลใหม่และคนใหม่ ๆ แต่ต้องระวังการทำหลายอย่างพร้อมกันจนไม่จบสักอย่าง',
  },
  {
    id: 'cancer',
    name: 'ราศีกรกฎ',
    nameEn: 'Cancer',
    symbol: '♋',
    from: [6, 21],
    to: [7, 22],
    element: 'น้ำ',
    planet: 'ดวงจันทร์',
    quality: 'จรราศี',
    traits: ['อ่อนไหว', 'ผูกพันครอบครัว', 'ดูแลคนอื่นเก่ง', 'เก็บความรู้สึก'],
    summary: 'ราศีที่ให้ความสำคัญกับบ้านและคนใกล้ตัวมากที่สุด อ่อนโยนกับคนที่ไว้ใจ แต่ป้องกันตัวเองสูงกับคนแปลกหน้า',
  },
  {
    id: 'leo',
    name: 'ราศีสิงห์',
    nameEn: 'Leo',
    symbol: '♌',
    from: [7, 23],
    to: [8, 22],
    element: 'ไฟ',
    planet: 'ดวงอาทิตย์',
    quality: 'สถิรราศี',
    traits: ['มั่นใจ', 'ใจกว้าง', 'มีเสน่ห์', 'ต้องการการยอมรับ'],
    summary: 'ราศีที่โดดเด่นเวลาอยู่ต่อหน้าคนอื่น มีความเป็นผู้นำและใจกว้างกับคนรอบข้าง แต่ต้องการคำชมมากกว่าที่ยอมรับ',
  },
  {
    id: 'virgo',
    name: 'ราศีกันย์',
    nameEn: 'Virgo',
    symbol: '♍',
    from: [8, 23],
    to: [9, 22],
    element: 'ดิน',
    planet: 'ดาวพุธ',
    quality: 'อุภัยราศี',
    traits: ['ละเอียด', 'มีระบบ', 'ช่วยเหลือคนอื่น', 'คิดมาก'],
    summary: 'ราศีที่มองเห็นรายละเอียดที่คนอื่นมองข้าม เก่งเรื่องการจัดระบบและแก้ปัญหา แต่มักเข้มงวดกับตัวเองเกินไป',
  },
  {
    id: 'libra',
    name: 'ราศีตุลย์',
    nameEn: 'Libra',
    symbol: '♎',
    from: [9, 23],
    to: [10, 22],
    element: 'ลม',
    planet: 'ดาวศุกร์',
    quality: 'จรราศี',
    traits: ['รักความยุติธรรม', 'ประนีประนอม', 'มีรสนิยม', 'ตัดสินใจยาก'],
    summary:
      'ราศีที่มองหาความสมดุลในทุกเรื่อง เก่งเรื่องการเข้ากับคนและมองเห็นทั้งสองด้าน แต่จึงตัดสินใจเรื่องของตัวเองได้ช้า',
  },
  {
    id: 'scorpio',
    name: 'ราศีพิจิก',
    nameEn: 'Scorpio',
    symbol: '♏',
    from: [10, 23],
    to: [11, 21],
    element: 'น้ำ',
    planet: 'ดาวพลูโต (เดิมดาวอังคาร)',
    quality: 'สถิรราศี',
    traits: ['ลึกซึ้ง', 'ทุ่มเท', 'สังเกตเก่ง', 'จริงจังกับความรู้สึก'],
    summary: 'ราศีที่รู้สึกกับทุกอย่างอย่างเข้มข้น ไม่ทำอะไรครึ่ง ๆ กลาง ๆ และมักอ่านคนอื่นออกก่อนที่เจ้าตัวจะพูด',
  },
  {
    id: 'sagittarius',
    name: 'ราศีธนู',
    nameEn: 'Sagittarius',
    symbol: '♐',
    from: [11, 22],
    to: [12, 21],
    element: 'ไฟ',
    planet: 'ดาวพฤหัสบดี',
    quality: 'อุภัยราศี',
    traits: ['รักอิสระ', 'มองโลกกว้าง', 'พูดตรง', 'เบื่อกรอบ'],
    summary: 'ราศีแห่งการเดินทางและการเรียนรู้จากโลกกว้าง มองอนาคตในแง่ดีเสมอ แต่ไม่ชอบถูกผูกมัดด้วยรายละเอียด',
  },
  {
    id: 'capricorn',
    name: 'ราศีมังกร',
    nameEn: 'Capricorn',
    symbol: '♑',
    from: [12, 22],
    to: [1, 19],
    element: 'ดิน',
    planet: 'ดาวเสาร์',
    quality: 'จรราศี',
    traits: ['มีวินัย', 'อดทน', 'มองระยะยาว', 'เก็บความรู้สึก'],
    summary: 'ราศีที่ไต่ขึ้นอย่างช้า ๆ แต่ไม่เคยถอย วางแผนระยะยาวเก่งและรับผิดชอบสูง แต่มักแบกไว้คนเดียวโดยไม่บอกใคร',
  },
  {
    id: 'aquarius',
    name: 'ราศีกุมภ์',
    nameEn: 'Aquarius',
    symbol: '♒',
    from: [1, 20],
    to: [2, 18],
    element: 'ลม',
    planet: 'ดาวยูเรนัส (เดิมดาวเสาร์)',
    quality: 'สถิรราศี',
    traits: ['คิดต่าง', 'ใจกว้าง', 'สนใจส่วนรวม', 'รักษาระยะห่าง'],
    summary:
      'ราศีที่มองอะไรจากมุมที่คนอื่นไม่ได้มอง สนใจภาพใหญ่และความเป็นธรรมของส่วนรวม แต่รักษาพื้นที่ส่วนตัวไว้เสมอ',
  },
  {
    id: 'pisces',
    name: 'ราศีมีน',
    nameEn: 'Pisces',
    symbol: '♓',
    from: [2, 19],
    to: [3, 20],
    element: 'น้ำ',
    planet: 'ดาวเนปจูน (เดิมดาวพฤหัสบดี)',
    quality: 'อุภัยราศี',
    traits: ['เห็นอกเห็นใจ', 'จินตนาการดี', 'อ่อนโยน', 'ไหลตามอารมณ์'],
    summary:
      'ราศีสุดท้ายของจักรราศี รับรู้ความรู้สึกของคนรอบข้างได้ไวมาก มีจินตนาการและความเมตตาสูง แต่ต้องระวังการแบกอารมณ์คนอื่น',
  },
];

/**
 * ราศีจากวันเกิด — ราศีมังกรคาบข้ามปีจึงต้องตรวจสองช่วง
 * รับ ISO date เพราะ input ทั้งเว็บส่งต่อกันเป็น YYYY-MM-DD (§27)
 */
export function zodiacFromDate(iso: string): ZodiacSign {
  parseIsoDate(iso); // ตรวจว่าเป็นวันที่ที่มีจริง
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));

  const sign = ZODIAC_SIGNS.find((s) => {
    const [fromM, fromD] = s.from;
    const [toM, toD] = s.to;
    const afterStart = month === fromM && day >= fromD;
    const beforeEnd = month === toM && day <= toD;
    return afterStart || beforeEnd;
  });
  if (!sign) throw new Error(`หาราศีของวันที่ ${iso} ไม่ได้`);
  return sign;
}

/**
 * สัญลักษณ์ราศีแบบตัวอักษร — ต่อ U+FE0E บังคับ text presentation
 * ไม่งั้น macOS/iOS วาดเป็นอิโมจิกล่องม่วงซึ่งคุมสีไม่ได้และต่างกันทุก OS (§15.2)
 */
export function zodiacGlyph(sign: ZodiacSign): string {
  return `${sign.symbol}\uFE0E`;
}

const THAI_MONTH_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

/** ช่วงวันเกิดของราศี เช่น "21 มี.ค. – 19 เม.ย." */
export function zodiacRange(sign: ZodiacSign): string {
  return `${sign.from[1]} ${THAI_MONTH_SHORT[sign.from[0] - 1]} – ${sign.to[1]} ${THAI_MONTH_SHORT[sign.to[0] - 1]}`;
}

/** ธาตุที่ตำราสากลถือว่าส่งเสริมกัน: ไฟ–ลม และ ดิน–น้ำ */
const COMPLEMENT: Record<ZodiacElement, ZodiacElement> = { ไฟ: 'ลม', ลม: 'ไฟ', ดิน: 'น้ำ', น้ำ: 'ดิน' };

/** ราศีที่เข้ากันตามหลักธาตุ — ธาตุเดียวกันเข้ากันดีที่สุด ธาตุคู่ส่งเสริมรองลงมา */
export function compatibleSigns(sign: ZodiacSign): { sameElement: ZodiacSign[]; complementary: ZodiacSign[] } {
  return {
    sameElement: ZODIAC_SIGNS.filter((s) => s.element === sign.element && s.id !== sign.id),
    complementary: ZODIAC_SIGNS.filter((s) => s.element === COMPLEMENT[sign.element]),
  };
}

export function zodiacById(id: string): ZodiacSign | undefined {
  return ZODIAC_SIGNS.find((s) => s.id === id);
}

/* ------------------------------------------------------------------ *
 * ปีนักษัตร — เปลี่ยนปีที่ตรุษจีน (ล็อกไว้ในแผน §9.4)
 * ------------------------------------------------------------------ */

export interface ChineseZodiacAnimal {
  id: string;
  name: string;
  nameEn: string;
  traits: string[];
  summary: string;
}

/** เรียงตามลำดับนักษัตร โดยปี ค.ศ. 1900 เป็นปีชวด */
export const CHINESE_ZODIAC: ChineseZodiacAnimal[] = [
  {
    id: 'rat',
    name: 'ชวด (หนู)',
    nameEn: 'Rat',
    traits: ['ไหวพริบดี', 'ประหยัด', 'ปรับตัวเก่ง'],
    summary: 'ตามความเชื่อ คนปีชวดมีไหวพริบและมองเห็นโอกาสก่อนคนอื่น เก่งเรื่องการเก็บออมและวางแผนล่วงหน้า',
  },
  {
    id: 'ox',
    name: 'ฉลู (วัว)',
    nameEn: 'Ox',
    traits: ['อดทน', 'ขยัน', 'หนักแน่น'],
    summary: 'ตามความเชื่อ คนปีฉลูทำงานหนักอย่างเงียบ ๆ และเชื่อถือได้ แต่เปลี่ยนความคิดยากเมื่อตัดสินใจไปแล้ว',
  },
  {
    id: 'tiger',
    name: 'ขาล (เสือ)',
    nameEn: 'Tiger',
    traits: ['กล้าหาญ', 'มั่นใจ', 'ชอบท้าทาย'],
    summary: 'ตามความเชื่อ คนปีขาลกล้าเสี่ยงและไม่ยอมแพ้ มักเป็นผู้นำโดยธรรมชาติแต่ต้องระวังความหุนหัน',
  },
  {
    id: 'rabbit',
    name: 'เถาะ (กระต่าย)',
    nameEn: 'Rabbit',
    traits: ['สุภาพ', 'รอบคอบ', 'รักสงบ'],
    summary: 'ตามความเชื่อ คนปีเถาะละมุนละม่อมและเข้ากับคนง่าย เลี่ยงความขัดแย้งและมักได้รับความเมตตาจากผู้ใหญ่',
  },
  {
    id: 'dragon',
    name: 'มะโรง (งูใหญ่)',
    nameEn: 'Dragon',
    traits: ['มีบารมี', 'ทะเยอทะยาน', 'มีพลัง'],
    summary: 'ตามความเชื่อ คนปีมะโรงโดดเด่นและมีพลังดึงดูด มักได้รับโอกาสใหญ่แต่ต้องระวังความมั่นใจเกินตัว',
  },
  {
    id: 'snake',
    name: 'มะเส็ง (งูเล็ก)',
    nameEn: 'Snake',
    traits: ['ลึกซึ้ง', 'ช่างสังเกต', 'สุขุม'],
    summary: 'ตามความเชื่อ คนปีมะเส็งคิดก่อนพูดและอ่านสถานการณ์ขาด มักเก็บความคิดไว้กับตัวจนคนอื่นคาดเดายาก',
  },
  {
    id: 'horse',
    name: 'มะเมีย (ม้า)',
    nameEn: 'Horse',
    traits: ['รักอิสระ', 'กระตือรือร้น', 'เข้าสังคมเก่ง'],
    summary: 'ตามความเชื่อ คนปีมะเมียมีพลังงานสูงและไม่ชอบอยู่นิ่ง เข้ากับคนได้ทุกวงแต่เบื่อกรอบเร็ว',
  },
  {
    id: 'goat',
    name: 'มะแม (แพะ)',
    nameEn: 'Goat',
    traits: ['อ่อนโยน', 'มีศิลปะ', 'เห็นใจคนอื่น'],
    summary: 'ตามความเชื่อ คนปีมะแมมีความละเอียดอ่อนทางความรู้สึกและรสนิยมดี ทำงานสร้างสรรค์ได้ดีกว่างานที่ต้องแข่งขัน',
  },
  {
    id: 'monkey',
    name: 'วอก (ลิง)',
    nameEn: 'Monkey',
    traits: ['ฉลาด', 'ยืดหยุ่น', 'มีอารมณ์ขัน'],
    summary: 'ตามความเชื่อ คนปีวอกแก้ปัญหาเฉพาะหน้าเก่งและเรียนรู้ไว มักหาทางออกที่คนอื่นนึกไม่ถึง',
  },
  {
    id: 'rooster',
    name: 'ระกา (ไก่)',
    nameEn: 'Rooster',
    traits: ['ตรงไปตรงมา', 'มีระเบียบ', 'ขยัน'],
    summary: 'ตามความเชื่อ คนปีระกาพูดตรงและใส่ใจรายละเอียด ทำงานเป็นระบบแต่บางครั้งเข้มงวดกับคนรอบข้าง',
  },
  {
    id: 'dog',
    name: 'จอ (สุนัข)',
    nameEn: 'Dog',
    traits: ['ซื่อสัตย์', 'ยุติธรรม', 'ปกป้องคนที่รัก'],
    summary: 'ตามความเชื่อ คนปีจอให้ค่ากับความซื่อสัตย์และความถูกต้อง เป็นเพื่อนที่พึ่งพาได้แต่ไว้ใจคนช้า',
  },
  {
    id: 'pig',
    name: 'กุน (หมู)',
    nameEn: 'Pig',
    traits: ['ใจดี', 'จริงใจ', 'มีน้ำใจ'],
    summary: 'ตามความเชื่อ คนปีกุนใจกว้างและไม่คิดร้ายกับใคร มักมีกินมีใช้แต่ต้องระวังการถูกเอาเปรียบ',
  },
];

/**
 * วันตรุษจีนของแต่ละปี ค.ศ. (เดือน-วัน) — ใช้ตัดสินว่าคนเกิดต้นปีเข้านักษัตรปีไหน
 *
 * ✅ verify ครบทั้ง 101 ปีแล้วเมื่อ 8 ก.ย. 2569 (VF5) — ตรงกับแหล่งทางการทุกปี ไม่มีปีไหนคลาดเคลื่อน
 *
 * แหล่งอ้างอิง: Gregorian-Lunar Calendar Conversion Table ของหอสังเกตการณ์ฮ่องกง (Hong Kong Observatory)
 *   https://www.hko.gov.hk/en/gts/time/calendar/text/files/T<ปี ค.ศ.>e.txt
 * วันตรุษจีนคือแถวที่ระบุ "1st Lunar Month" ของแต่ละปี
 *
 * ตารางเดียวกันนี้ถูกคัดลอกไปไว้ใน thai-astro.test.ts เป็นสำเนาอิสระ ถ้าใครแก้ตัวเลขที่นี่เทสต์จะแดงทันที
 * คนที่เกิดปลายมกราคมถึงกลางกุมภาพันธ์เท่านั้นที่ผลจะเปลี่ยนถ้าวันคลาดเคลื่อน จึงต้องคุมไว้แน่น
 */
const CHINESE_NEW_YEAR: Record<number, [number, number]> = {
  1940: [2, 8],
  1941: [1, 27],
  1942: [2, 15],
  1943: [2, 5],
  1944: [1, 25],
  1945: [2, 13],
  1946: [2, 2],
  1947: [1, 22],
  1948: [2, 10],
  1949: [1, 29],
  1950: [2, 17],
  1951: [2, 6],
  1952: [1, 27],
  1953: [2, 14],
  1954: [2, 3],
  1955: [1, 24],
  1956: [2, 12],
  1957: [1, 31],
  1958: [2, 18],
  1959: [2, 8],
  1960: [1, 28],
  1961: [2, 15],
  1962: [2, 5],
  1963: [1, 25],
  1964: [2, 13],
  1965: [2, 2],
  1966: [1, 21],
  1967: [2, 9],
  1968: [1, 30],
  1969: [2, 17],
  1970: [2, 6],
  1971: [1, 27],
  1972: [2, 15],
  1973: [2, 3],
  1974: [1, 23],
  1975: [2, 11],
  1976: [1, 31],
  1977: [2, 18],
  1978: [2, 7],
  1979: [1, 28],
  1980: [2, 16],
  1981: [2, 5],
  1982: [1, 25],
  1983: [2, 13],
  1984: [2, 2],
  1985: [2, 20],
  1986: [2, 9],
  1987: [1, 29],
  1988: [2, 17],
  1989: [2, 6],
  1990: [1, 27],
  1991: [2, 15],
  1992: [2, 4],
  1993: [1, 23],
  1994: [2, 10],
  1995: [1, 31],
  1996: [2, 19],
  1997: [2, 7],
  1998: [1, 28],
  1999: [2, 16],
  2000: [2, 5],
  2001: [1, 24],
  2002: [2, 12],
  2003: [2, 1],
  2004: [1, 22],
  2005: [2, 9],
  2006: [1, 29],
  2007: [2, 18],
  2008: [2, 7],
  2009: [1, 26],
  2010: [2, 14],
  2011: [2, 3],
  2012: [1, 23],
  2013: [2, 10],
  2014: [1, 31],
  2015: [2, 19],
  2016: [2, 8],
  2017: [1, 28],
  2018: [2, 16],
  2019: [2, 5],
  2020: [1, 25],
  2021: [2, 12],
  2022: [2, 1],
  2023: [1, 22],
  2024: [2, 10],
  2025: [1, 29],
  2026: [2, 17],
  2027: [2, 6],
  2028: [1, 26],
  2029: [2, 13],
  2030: [2, 3],
  2031: [1, 23],
  2032: [2, 11],
  2033: [1, 31],
  2034: [2, 19],
  2035: [2, 8],
  2036: [1, 28],
  2037: [2, 15],
  2038: [2, 4],
  2039: [1, 24],
  2040: [2, 12],
};

export const CHINESE_ZODIAC_MIN_YEAR = 1940;
export const CHINESE_ZODIAC_MAX_YEAR = 2040;

export interface ChineseZodiacResult {
  animal: ChineseZodiacAnimal;
  /** ปีนักษัตรที่เข้า (อาจไม่ใช่ปีเกิดตามปฏิทินสากล) */
  zodiacYear: number;
  /** วันตรุษจีนของปีนั้นในรูป YYYY-MM-DD */
  newYearDate: string;
  /** เกิดก่อนตรุษจีนของปีตัวเอง จึงถูกนับเป็นนักษัตรของปีก่อนหน้า */
  beforeNewYear: boolean;
}

/**
 * ปีนักษัตรจากวันเกิด โดยใช้ตรุษจีนเป็นเกณฑ์เปลี่ยนปี
 *
 * คนที่เกิดวันที่ 1 ม.ค. – ก่อนตรุษจีน จะยังเป็นนักษัตรของปีก่อนหน้า
 * ซึ่งต่างจากการนับแบบ 1 มกราคม และแบบสงกรานต์ที่คนไทยบางกลุ่มใช้
 */
export function chineseZodiacFromDate(iso: string): ChineseZodiacResult {
  parseIsoDate(iso);
  const year = Number(iso.slice(0, 4));
  if (year < CHINESE_ZODIAC_MIN_YEAR || year > CHINESE_ZODIAC_MAX_YEAR) {
    throw new Error(`รองรับปีเกิด ค.ศ. ${CHINESE_ZODIAC_MIN_YEAR}–${CHINESE_ZODIAC_MAX_YEAR} เท่านั้น`);
  }
  const [m, d] = CHINESE_NEW_YEAR[year];
  const newYearDate = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const beforeNewYear = iso < newYearDate;
  const zodiacYear = beforeNewYear ? year - 1 : year;

  // ค.ศ. 1900 เป็นปีชวด และวนรอบละ 12 ปี
  const index = (((zodiacYear - 1900) % 12) + 12) % 12;
  return { animal: CHINESE_ZODIAC[index], zodiacYear, newYearDate, beforeNewYear };
}

/** วันตรุษจีนของปีที่กำหนด — ใช้แสดงบนหน้าเว็บว่าเกณฑ์ตัดปีคือวันไหน */
export function chineseNewYearOf(year: number): string | null {
  const entry = CHINESE_NEW_YEAR[year];
  if (!entry) return null;
  return `${year}-${String(entry[0]).padStart(2, '0')}-${String(entry[1]).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ *
 * สีมงคลประจำวันเกิด — ต่อยอด THAI_DAY_COLORS ที่มีอยู่แล้ว
 * ------------------------------------------------------------------ */

export interface DayColors {
  weekdayIndex: number;
  /** ชื่อวันเกิด — คนเกิดวันพุธหลัง 18:00 น. ได้ "พุธกลางคืน" */
  weekdayName: string;
  /** สีประจำวันเกิดตามคติไทย */
  birthColor: string;
  /** true เมื่อคำนวณแบบพุธกลางคืน (ราหู) */
  wednesdayNight: boolean;
  work: string[];
  money: string[];
  love: string[];
  luck: string[];
  /** สีกาลกิณี — สีที่ความเชื่อว่าควรเลี่ยง */
  avoid: string[];
}

/**
 * สีมงคลตามหลัก **ทักษา** ของโหราศาสตร์ไทย — คำนวณจากกฎ ไม่ใช่ตารางที่พิมพ์มือ
 *
 * ดาวแปดดวงเรียงเป็นวงตามทิศ: อาทิตย์ → จันทร์ → อังคาร → พุธ → เสาร์ → พฤหัสบดี → ราหู → ศุกร์
 * นับเริ่มจากดาวประจำวันเกิดเวียนไปตามวง ได้ตำแหน่ง บริวาร · อายุ · เดช · ศรี · มูละ · อุตสาหะ · มนตรี · กาลกิณี
 * สีของดาวที่ตกตำแหน่งนั้นคือสีของเรื่องนั้น — สีของดาวกาลกิณีคือสีที่ควรเลี่ยง
 *
 * ราหูคือคนเกิด **วันพุธกลางคืน** (หลัง 18:00 น.) ซึ่งตำราไทยนับเป็นอีกวันหนึ่ง แยกจากพุธกลางวัน
 * ตารางเดิมที่พิมพ์มือมีจุดขัดกันเอง (วันจันทร์มีสีแดงทั้งในสีเสริมการงานและสีที่ควรเลี่ยง) จึงเปลี่ยนมาใช้กฎ
 */
const TAKSA_RING = ['sun', 'moon', 'mars', 'mercury', 'saturn', 'jupiter', 'rahu', 'venus'] as const;
type TaksaPlanet = (typeof TAKSA_RING)[number];

const PLANET_COLORS: Record<TaksaPlanet, string[]> = {
  sun: ['แดง'],
  moon: ['เหลือง', 'ขาวนวล'],
  mars: ['ชมพู'],
  mercury: ['เขียว'],
  saturn: ['ม่วง', 'ดำ'],
  jupiter: ['ส้ม'],
  rahu: ['เทา', 'ดำ'],
  venus: ['ฟ้า', 'น้ำเงิน'],
};

/** ดาวประจำวันเกิด เรียงตาม weekdayIndex 0 = อาทิตย์ … 6 = เสาร์ */
const WEEKDAY_PLANET: TaksaPlanet[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];

const TAKSA_ROLES = ['บริวาร', 'อายุ', 'เดช', 'ศรี', 'มูละ', 'อุตสาหะ', 'มนตรี', 'กาลกิณี'] as const;
export type TaksaRole = (typeof TAKSA_ROLES)[number];

/** ดาวที่ตกแต่ละตำแหน่งทักษาของคนเกิดใต้ดาว `birth` */
function taksaOf(birth: TaksaPlanet): Record<TaksaRole, TaksaPlanet> {
  const start = TAKSA_RING.indexOf(birth);
  return Object.fromEntries(
    TAKSA_ROLES.map((role, i) => [role, TAKSA_RING[(start + i) % TAKSA_RING.length]]),
  ) as Record<TaksaRole, TaksaPlanet>;
}

export function dayColorsFromDate(iso: string, opts: { wednesdayNight?: boolean } = {}): DayColors {
  const wd = weekdayIndex(iso);
  // ตัวเลือกพุธกลางคืนมีผลเฉพาะวันพุธ — วันอื่นส่งมาก็ไม่เปลี่ยนผล
  const night = wd === 3 && opts.wednesdayNight === true;
  const taksa = taksaOf(night ? 'rahu' : WEEKDAY_PLANET[wd]);
  const avoid = PLANET_COLORS[taksa.กาลกิณี];
  // สีดำเป็นของทั้งเสาร์และราหู — ถ้าดาวใดดาวหนึ่งเป็นกาลกิณี ต้องไม่โผล่ในสีเสริมของอีกดวง
  const colors = (...roles: TaksaRole[]) => [
    ...new Set(roles.flatMap((r) => PLANET_COLORS[taksa[r]]).filter((c) => !avoid.includes(c))),
  ];
  return {
    weekdayIndex: wd,
    weekdayName: night ? 'พุธกลางคืน' : THAI_WEEKDAYS[wd],
    birthColor: night ? 'เทา' : THAI_DAY_COLORS[wd],
    wednesdayNight: night,
    work: colors('อุตสาหะ', 'มนตรี'),
    money: colors('มูละ', 'ศรี'),
    love: colors('บริวาร'),
    luck: colors('ศรี', 'เดช'),
    avoid,
  };
}

/* ------------------------------------------------------------------ *
 * เลขศาสตร์วันเกิด — deterministic ล้วน
 * ------------------------------------------------------------------ */

export interface NumerologyResult {
  /** ผลบวกเลขทุกหลักของวันเกิดจนเหลือหลักเดียว (คงเลขนำโชค 11 และ 22 ไว้) */
  lifePath: number;
  /** ขั้นตอนการบวกเพื่อให้ผู้ใช้ตรวจตามได้ */
  steps: string[];
  meaning: string;
  strengths: string[];
  watchOut: string;
}

/** ความหมายของเลขชีวิตตามความเชื่อเลขศาสตร์ */
const LIFE_PATH_MEANING: Record<number, Omit<NumerologyResult, 'lifePath' | 'steps'>> = {
  1: {
    meaning: 'เลขของผู้เริ่มต้น เชื่อกันว่าเป็นคนที่ต้องนำด้วยตัวเองมากกว่าตามคนอื่น',
    strengths: ['ตัดสินใจเร็ว', 'พึ่งพาตัวเองได้'],
    watchOut: 'ระวังการยึดความคิดตัวเองจนไม่ฟังใคร',
  },
  2: {
    meaning: 'เลขของผู้ประสาน เชื่อกันว่าโดดเด่นเวลาทำงานร่วมกับคนอื่นมากกว่าลุยเดี่ยว',
    strengths: ['เข้าใจคน', 'ประนีประนอมเก่ง'],
    watchOut: 'ระวังการยอมจนละเลยความต้องการของตัวเอง',
  },
  3: {
    meaning: 'เลขของการสื่อสาร เชื่อกันว่ามีเสน่ห์ในการพูดและงานสร้างสรรค์',
    strengths: ['สื่อสารเก่ง', 'มองโลกในแง่ดี'],
    watchOut: 'ระวังเริ่มหลายอย่างแล้วไม่จบสักอย่าง',
  },
  4: {
    meaning: 'เลขของความมั่นคง เชื่อกันว่าสร้างอะไรได้ยั่งยืนเพราะทำอย่างเป็นระบบ',
    strengths: ['มีวินัย', 'เชื่อถือได้'],
    watchOut: 'ระวังยึดกรอบเดิมจนปรับตัวช้า',
  },
  5: {
    meaning: 'เลขของความเปลี่ยนแปลง เชื่อกันว่าชีวิตมีจังหวะเปลี่ยนบ่อยและปรับตัวได้ดี',
    strengths: ['ยืดหยุ่น', 'กล้าลองสิ่งใหม่'],
    watchOut: 'ระวังเปลี่ยนบ่อยจนไม่มีอะไรลงหลักปักฐาน',
  },
  6: {
    meaning: 'เลขของการดูแล เชื่อกันว่าเป็นที่พึ่งของครอบครัวและคนรอบข้าง',
    strengths: ['รับผิดชอบ', 'อบอุ่น'],
    watchOut: 'ระวังแบกเรื่องของคนอื่นจนลืมดูแลตัวเอง',
  },
  7: {
    meaning: 'เลขของการค้นหา เชื่อกันว่าชอบคิดลึกและต้องการเวลาอยู่กับตัวเอง',
    strengths: ['วิเคราะห์เก่ง', 'ช่างสังเกต'],
    watchOut: 'ระวังคิดมากจนไม่ได้ลงมือ',
  },
  8: {
    meaning: 'เลขของการบริหาร เชื่อกันว่าเกี่ยวข้องกับอำนาจ เงิน และความรับผิดชอบใหญ่',
    strengths: ['มองภาพใหญ่', 'จัดการทรัพยากรเก่ง'],
    watchOut: 'ระวังให้ค่ากับผลลัพธ์จนมองข้ามคน',
  },
  9: {
    meaning: 'เลขของการให้ เชื่อกันว่ามีใจกว้างและสนใจเรื่องส่วนรวมมากกว่าตัวเอง',
    strengths: ['เห็นอกเห็นใจ', 'มองการณ์ไกล'],
    watchOut: 'ระวังคาดหวังกับคนอื่นสูงเกินจริง',
  },
  11: {
    meaning: 'เลขคู่ที่ความเชื่อถือว่าเป็นเลขพิเศษ ผสมความไวต่อความรู้สึกเข้ากับความเป็นผู้นำ',
    strengths: ['สัญชาตญาณดี', 'สร้างแรงบันดาลใจ'],
    watchOut: 'ระวังความกดดันจากความคาดหวังของตัวเอง',
  },
  22: {
    meaning: 'เลขคู่ที่ความเชื่อถือว่าเป็นเลขของนักสร้าง ผสมวิสัยทัศน์เข้ากับความสามารถลงมือจริง',
    strengths: ['วางแผนใหญ่ได้', 'ลงรายละเอียดเป็น'],
    watchOut: 'ระวังตั้งเป้าใหญ่จนกดดันตัวเองเกินไป',
  },
};

/** บวกเลขทุกหลักจนเหลือหลักเดียว ยกเว้น 11 และ 22 ที่ความเชื่อถือว่าเป็นเลขพิเศษ */
function reduceDigits(n: number): { value: number; steps: string[] } {
  const steps: string[] = [];
  let current = n;
  while (current > 9 && current !== 11 && current !== 22) {
    const digits = String(current).split('').map(Number);
    const sum = digits.reduce((a, b) => a + b, 0);
    steps.push(`${digits.join(' + ')} = ${sum}`);
    current = sum;
  }
  return { value: current, steps };
}

export function numerologyFromDate(iso: string): NumerologyResult {
  parseIsoDate(iso);
  const digits = iso.replace(/-/g, '').split('').map(Number);
  const total = digits.reduce((a, b) => a + b, 0);
  const steps = [`${digits.join(' + ')} = ${total}`];
  const reduced = reduceDigits(total);
  steps.push(...reduced.steps);

  return { lifePath: reduced.value, steps, ...LIFE_PATH_MEANING[reduced.value] };
}
