export type OcrLanguage = 'tha+eng' | 'tha' | 'eng';

/** ผลของรูปหนึ่งรูป — error มีค่าเมื่อรูปนั้นอ่านไม่ได้ (ไม่ทำให้ทั้งชุดล้ม) */
export interface OcrPageResult {
  name: string;
  text: string;
  confidence: number;
  error?: string;
}

export interface EngineHooks {
  /** โหลด core + โมเดลภาษา (0–1) */
  onLoad(fraction: number): void;
  /** อ่านรูปปัจจุบัน (0–1) */
  onProgress(fraction: number): void;
}

export interface OcrEngine {
  recognize(image: Blob | HTMLCanvasElement, language: OcrLanguage): Promise<{ text: string; confidence: number }>;
  terminate(): void;
}
