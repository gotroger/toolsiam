import type { FileToolId } from '../catalog';
export interface Options {
  pages: string;
  angle: number;
  sheet: number;
  delimiter: string;
  format: string;
  quality: number;
  width: number;
  flip: boolean;
}
export interface Job {
  id: FileToolId;
  files: File[];
  options: Options;
}
export interface Output {
  blob: Blob;
  name: string;
  summary: string;
  text?: string;
}
export type WorkerReply = { output: Output; error?: never } | { error: string; output?: never };
