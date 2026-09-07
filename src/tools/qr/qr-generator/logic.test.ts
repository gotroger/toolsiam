import { describe, it, expect } from 'vitest';
import { normalizeUrl, buildWifiPayload, buildVCardPayload, buildQrPayload } from './logic';

describe('normalizeUrl', () => {
  it('เติม https:// ให้อัตโนมัติเมื่อไม่มี scheme', () => {
    expect(normalizeUrl('toolsiam.com')).toBe('https://toolsiam.com');
    expect(normalizeUrl('  toolsiam.com/t/qr-generator ')).toBe('https://toolsiam.com/t/qr-generator');
  });

  it('ไม่แตะ scheme ที่มีอยู่แล้ว', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    expect(normalizeUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
  });

  it('ค่าว่าง → error', () => {
    expect(() => normalizeUrl('   ')).toThrow();
  });
});

describe('buildWifiPayload', () => {
  it('รูปแบบมาตรฐาน WIFI:', () => {
    expect(buildWifiPayload({ ssid: 'ToolSiam', password: 'secret123', encryption: 'WPA' }))
      .toBe('WIFI:T:WPA;S:ToolSiam;P:secret123;;');
  });

  it('เครือข่ายไม่มีรหัสผ่านไม่ต้องมีฟิลด์ P', () => {
    expect(buildWifiPayload({ ssid: 'Free WiFi', encryption: 'nopass' }))
      .toBe('WIFI:T:nopass;S:Free WiFi;;');
  });

  it('เครือข่ายซ่อนชื่อเพิ่ม H:true', () => {
    expect(buildWifiPayload({ ssid: 'Hidden', password: 'p', encryption: 'WPA', hidden: true }))
      .toBe('WIFI:T:WPA;S:Hidden;P:p;H:true;;');
  });

  it('escape อักขระพิเศษ \\ ; , : "', () => {
    expect(buildWifiPayload({ ssid: 'Cafe;1', password: 'a:b,c"d\\e', encryption: 'WPA' }))
      .toBe('WIFI:T:WPA;S:Cafe\\;1;P:a\\:b\\,c\\"d\\\\e;;');
  });

  it('ไม่มี SSID หรือมีรหัสผ่านว่างทั้งที่เลือกเข้ารหัส → error', () => {
    expect(() => buildWifiPayload({ ssid: '  ', password: 'x', encryption: 'WPA' })).toThrow();
    expect(() => buildWifiPayload({ ssid: 'Net', password: '', encryption: 'WPA' })).toThrow();
  });
});

describe('buildVCardPayload', () => {
  it('สร้าง vCard 3.0 ที่มีชื่อและเบอร์', () => {
    const v = buildVCardPayload({ firstName: 'สมชาย', lastName: 'ใจดี', phone: '0812345678' });
    const lines = v.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCARD');
    expect(lines[1]).toBe('VERSION:3.0');
    expect(lines).toContain('N:ใจดี;สมชาย;;;');
    expect(lines).toContain('FN:สมชาย ใจดี');
    expect(lines).toContain('TEL;TYPE=CELL:0812345678');
    expect(lines[lines.length - 1]).toBe('END:VCARD');
  });

  it('ใส่เฉพาะฟิลด์ที่กรอก', () => {
    const v = buildVCardPayload({ firstName: 'Ann' });
    expect(v).not.toContain('TEL');
    expect(v).not.toContain('EMAIL');
    expect(v).toContain('FN:Ann');
  });

  it('เว็บไซต์ถูกเติม https:// และ escape เครื่องหมาย ;', () => {
    const v = buildVCardPayload({ firstName: 'A', org: 'ToolSiam; Co', website: 'toolsiam.com' });
    expect(v).toContain('ORG:ToolSiam\\; Co');
    expect(v).toContain('URL:https://toolsiam.com');
  });

  it('ไม่มีทั้งชื่อและนามสกุล → error', () => {
    expect(() => buildVCardPayload({ firstName: ' ', lastName: '' })).toThrow();
  });
});

describe('buildQrPayload', () => {
  it('ข้อความธรรมดาส่งผ่านตรง ๆ', () => {
    expect(buildQrPayload({ kind: 'text', text: 'สวัสดี ToolSiam' })).toBe('สวัสดี ToolSiam');
  });

  it('โหมด url เรียก normalizeUrl', () => {
    expect(buildQrPayload({ kind: 'url', url: 'toolsiam.com' })).toBe('https://toolsiam.com');
  });

  it('โหมด wifi และ vcard ส่งต่อให้ตัวสร้างที่ถูกต้อง', () => {
    expect(buildQrPayload({ kind: 'wifi', wifi: { ssid: 'N', encryption: 'nopass' } })).toBe('WIFI:T:nopass;S:N;;');
    expect(buildQrPayload({ kind: 'vcard', vcard: { firstName: 'A' } })).toContain('BEGIN:VCARD');
  });

  it('ข้อความว่าง → error', () => {
    expect(() => buildQrPayload({ kind: 'text', text: '   ' })).toThrow();
  });
});
