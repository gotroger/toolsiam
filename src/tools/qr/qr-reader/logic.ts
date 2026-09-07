export type QrKind = 'url' | 'wifi' | 'vcard' | 'promptpay' | 'tel' | 'email' | 'text';

export interface QrField {
  label: string;
  value: string;
}

export interface QrParsed {
  kind: QrKind;
  /** ชื่อประเภทภาษาไทยสำหรับแสดงผล */
  label: string;
  fields: QrField[];
  raw: string;
}

/** ย้อน escape ของสเปก WIFI: (\; \, \: \" \\) */
function unescapeWifi(value: string): string {
  return value.replace(/\\(.)/g, '$1');
}

/** ตัดสตริง WIFI: เป็นคู่ key:value โดยไม่ตัดตรง \; ที่ถูก escape ไว้ */
function splitWifiFields(body: string): string[] {
  const out: string[] = [];
  let current = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '\\') {
      current += ch + (body[i + 1] ?? '');
      i += 1;
    } else if (ch === ';') {
      if (current) out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) out.push(current);
  return out;
}

function parseWifi(raw: string): QrField[] {
  const map = new Map<string, string>();
  for (const part of splitWifiFields(raw.slice(5))) {
    const idx = part.indexOf(':');
    if (idx > 0) map.set(part.slice(0, idx).toUpperCase(), unescapeWifi(part.slice(idx + 1)));
  }
  const encryption = map.get('T') ?? 'nopass';
  return [
    { label: 'ชื่อเครือข่าย', value: map.get('S') ?? '' },
    { label: 'รหัสผ่าน', value: encryption === 'nopass' ? '(ไม่มี)' : (map.get('P') ?? '(ไม่มี)') },
    { label: 'ระบบเข้ารหัส', value: encryption },
    { label: 'เครือข่ายซ่อนชื่อ', value: map.get('H') === 'true' ? 'ใช่' : 'ไม่ใช่' },
  ];
}

function unescapeVCard(value: string): string {
  return value.replace(/\\n/g, '\n').replace(/\\([\\;,])/g, '$1');
}

function parseVCard(raw: string): QrField[] {
  const wanted: { prefix: RegExp; label: string }[] = [
    { prefix: /^FN:/i, label: 'ชื่อ' },
    { prefix: /^ORG:/i, label: 'บริษัท/หน่วยงาน' },
    { prefix: /^TITLE:/i, label: 'ตำแหน่ง' },
    { prefix: /^TEL[^:]*:/i, label: 'เบอร์โทร' },
    { prefix: /^EMAIL[^:]*:/i, label: 'อีเมล' },
    { prefix: /^URL:/i, label: 'เว็บไซต์' },
    { prefix: /^NOTE:/i, label: 'บันทึก' },
  ];
  const fields: QrField[] = [];
  for (const line of raw.split(/\r?\n/)) {
    for (const w of wanted) {
      if (w.prefix.test(line)) {
        fields.push({ label: w.label, value: unescapeVCard(line.replace(w.prefix, '')).trim() });
        break;
      }
    }
  }
  return fields;
}

export function classifyQrText(raw: string): QrParsed {
  const text = raw.trim();

  if (/^WIFI:/i.test(text)) {
    return { kind: 'wifi', label: 'เครือข่าย WiFi', fields: parseWifi(text), raw };
  }
  if (/^BEGIN:VCARD/i.test(text)) {
    return { kind: 'vcard', label: 'นามบัตร (vCard)', fields: parseVCard(text), raw };
  }
  // EMVCo payload ของ PromptPay: ขึ้นต้นด้วย 0002 และมี Application ID ของ PromptPay
  if (/^0002/.test(text) && text.includes('A000000677010111')) {
    return {
      kind: 'promptpay',
      label: 'QR PromptPay',
      fields: [
        { label: 'รูปแบบ', value: 'EMVCo PromptPay' },
        { label: 'ข้อมูลดิบ', value: text },
      ],
      raw,
    };
  }
  if (/^tel:/i.test(text)) {
    return { kind: 'tel', label: 'เบอร์โทรศัพท์', fields: [{ label: 'เบอร์โทร', value: text.slice(4) }], raw };
  }
  if (/^mailto:/i.test(text)) {
    return { kind: 'email', label: 'อีเมล', fields: [{ label: 'อีเมล', value: text.slice(7) }], raw };
  }
  if (/^https?:\/\//i.test(text)) {
    return { kind: 'url', label: 'ลิงก์เว็บไซต์', fields: [{ label: 'ลิงก์', value: text }], raw };
  }
  return { kind: 'text', label: 'ข้อความ', fields: [{ label: 'ข้อความ', value: text }], raw };
}
