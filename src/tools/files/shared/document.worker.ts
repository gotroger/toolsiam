import { processDocument } from './document';
import type { Job, WorkerReply } from './types';
self.onmessage = async (event: MessageEvent<Job>) => {
  let reply: WorkerReply;
  try {
    reply = { output: await processDocument(event.data) };
  } catch (error) {
    reply = {
      error:
        error instanceof Error && /[ก-๙]/.test(error.message)
          ? error.message
          : 'อ่านไฟล์ไม่สำเร็จ กรุณาตรวจว่าไฟล์เปิดได้และเป็นชนิดที่รองรับ แล้วลองใหม่',
    };
  }
  self.postMessage(reply);
};
