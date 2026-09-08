import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, Button } from '@/components/ui';

interface Props {
  children: ReactNode;
  /** ชื่อส่วนที่พัง ใช้ในข้อความและใน log — เช่น slug ของเครื่องมือ */
  name?: string;
}
interface State { error: Error | null }

/**
 * กันหน้าเปล่า — ถ้า island ตัวใดตัวหนึ่ง throw ระหว่าง render
 *
 * ก่อนหน้านี้ ToolIsland มีแค่ `<Suspense>` ซึ่งจับได้เฉพาะตอนโหลดโมดูล
 * ถ้าตัวเครื่องมือ throw ตอน render React จะถอด subtree ทิ้งทั้งก้อนเงียบ ๆ
 * ผู้ใช้เห็นกล่องว่างโดยไม่รู้ว่าต้องทำอะไรต่อ และเราไม่รู้เลยว่ามีอะไรพัง
 *
 * เนื้อหารอบ ๆ (วิธีใช้ / FAQ / แผงความน่าเชื่อถือ) เป็น HTML ล้วนจาก ToolShell
 * จึงยังอยู่ครบ — ที่หายไปคือเฉพาะตัวเครื่องมือ กล่องนี้จึงเข้ามาแทนที่ตรงนั้น
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // ไม่มี error tracking service — อย่างน้อยให้ขึ้น console ของผู้ใช้และ session replay ของ Cloudflare
    console.error(`[ToolSiam] ${this.props.name ?? 'component'} พัง:`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Alert tone="danger" title="เครื่องมือนี้ทำงานผิดพลาด">
        <p>
          ลองโหลดหน้าใหม่อีกครั้ง ถ้ายังไม่หายแปลว่าเป็นที่ตัวเว็บ ไม่ใช่ที่ข้อมูลที่คุณกรอก —
          ข้อมูลที่กรอกไว้ไม่ได้ถูกส่งออกไปที่ไหนอยู่แล้ว
        </p>
        <Button className="mt-3" onClick={() => window.location.reload()}>โหลดหน้าใหม่</Button>
      </Alert>
    );
  }
}
