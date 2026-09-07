export type WifiEncryption = 'WPA' | 'WEP' | 'nopass';

export interface WifiInput {
  ssid: string;
  password?: string;
  encryption: WifiEncryption;
  /** เครือข่ายที่ซ่อนชื่อ */
  hidden?: boolean;
}

export interface VCardInput {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  org?: string;
  title?: string;
  website?: string;
  note?: string;
}

export type QrInput =
  | { kind: 'text'; text: string }
  | { kind: 'url'; url: string }
  | { kind: 'wifi'; wifi: WifiInput }
  | { kind: 'vcard'; vcard: VCardInput };

export function normalizeUrl(raw: string): string {
  const url = raw.trim();
  if (!url) throw new Error('กรุณากรอกลิงก์');
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

/** escape ตามสเปก MECARD/WIFI: อักขระ \ ; , : " ต้องนำหน้าด้วย backslash */
function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

export function buildWifiPayload(input: WifiInput): string {
  const ssid = input.ssid.trim();
  if (!ssid) throw new Error('กรุณากรอกชื่อเครือข่าย (SSID)');

  const parts = [`T:${input.encryption}`, `S:${escapeWifi(ssid)}`];
  if (input.encryption !== 'nopass') {
    const password = input.password ?? '';
    if (!password) throw new Error('กรุณากรอกรหัสผ่าน หรือเลือก "ไม่มีรหัสผ่าน"');
    parts.push(`P:${escapeWifi(password)}`);
  }
  if (input.hidden) parts.push('H:true');
  return `WIFI:${parts.join(';')};;`;
}

/** escape ตามสเปก vCard: \ ; , และขึ้นบรรทัดใหม่ */
function escapeVCard(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export function buildVCardPayload(input: VCardInput): string {
  const first = (input.firstName ?? '').trim();
  const last = (input.lastName ?? '').trim();
  if (!first && !last) throw new Error('กรุณากรอกชื่อหรือนามสกุลอย่างน้อยหนึ่งช่อง');

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCard(last)};${escapeVCard(first)};;;`,
    `FN:${escapeVCard([first, last].filter(Boolean).join(' '))}`,
  ];

  const push = (key: string, value: string | undefined) => {
    const v = (value ?? '').trim();
    if (v) lines.push(`${key}:${escapeVCard(v)}`);
  };

  push('ORG', input.org);
  push('TITLE', input.title);
  push('TEL;TYPE=CELL', input.phone);
  push('EMAIL', input.email);
  if ((input.website ?? '').trim()) lines.push(`URL:${escapeVCard(normalizeUrl(input.website!))}`);
  push('NOTE', input.note);

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export function buildQrPayload(input: QrInput): string {
  switch (input.kind) {
    case 'text': {
      const text = input.text.trim();
      if (!text) throw new Error('กรุณากรอกข้อความ');
      return text;
    }
    case 'url':
      return normalizeUrl(input.url);
    case 'wifi':
      return buildWifiPayload(input.wifi);
    case 'vcard':
      return buildVCardPayload(input.vcard);
  }
}
