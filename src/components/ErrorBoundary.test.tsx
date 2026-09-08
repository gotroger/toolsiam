// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function Boom(): React.ReactNode {
  throw new Error('พังตอน render');
}

describe('ErrorBoundary', () => {
  // React log error ที่จับได้ออก console เสมอ — ปิดเสียงไว้ไม่ให้ output เทสต์รก
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('ส่งลูกผ่านไปตามปกติเมื่อไม่มีอะไรพัง', () => {
    render(<ErrorBoundary name="x"><p>เนื้อหาปกติ</p></ErrorBoundary>);
    expect(screen.getByText('เนื้อหาปกติ')).toBeInTheDocument();
  });

  it('แสดงกล่องแจ้งแทนหน้าเปล่าเมื่อลูก throw ตอน render', () => {
    render(<ErrorBoundary name="word-count"><Boom /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('เครื่องมือนี้ทำงานผิดพลาด');
    expect(screen.getByRole('button', { name: 'โหลดหน้าใหม่' })).toBeInTheDocument();
  });

  it('log ชื่อส่วนที่พังออก console เพื่อให้ตามรอยได้', () => {
    render(<ErrorBoundary name="word-count"><Boom /></ErrorBoundary>);
    const logged = (console.error as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .join('\n');
    expect(logged).toContain('[ToolSiam] word-count พัง');
  });
});
