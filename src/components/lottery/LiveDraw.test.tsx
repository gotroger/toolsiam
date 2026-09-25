// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LiveResults from './LiveResults';
import LatestSummary from './LatestSummary';
import LiveDrawNotice from './LiveDrawNotice';
import { __setRemoteForTests } from '@/lib/lottery-remote';
import type { LotteryDraw } from '@/data/lottery/schema';

const seq = (n: number, start: number) => Array.from({ length: n }, (_, i) => String(start + i).padStart(6, '0'));

/** งวดสมมติ — ไม่ใช่ผลรางวัลจริง */
function drawOf(drawDate: string, first: string): LotteryDraw {
  const n = Number(first);
  return {
    drawDate,
    prizes: {
      first: [first],
      firstNear: [String(n - 1).padStart(6, '0'), String(n + 1).padStart(6, '0')],
      second: seq(5, 200_000),
      third: seq(10, 300_000),
      fourth: seq(50, 400_000),
      fifth: seq(100, 500_000),
      threeDigitFront: ['111', '222'],
      threeDigitBack: ['333', '333'],
      twoDigitBack: ['77'],
    },
    sourceUrl: 'https://www.glo.or.th/',
    enteredAt: drawDate,
    status: 'validated',
  };
}

const staticDraw = drawOf('2026-09-01', '654321');
const newDraw = drawOf('2026-09-16', '123456');

const serve = (body: unknown) =>
  vi.stubGlobal('fetch', vi.fn(async () => (body ? new Response(JSON.stringify(body)) : new Response(null, { status: 204 }))));

/** ตั้ง "วันนี้" ตามเวลาไทย — 12:00 น. ของวันที่ระบุ */
const today = (date: string) => vi.setSystemTime(new Date(`${date}T05:00:00Z`));

beforeEach(() => {
  __setRemoteForTests(null);
  vi.useFakeTimers({ toFake: ['Date'] });
  serve(null);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('LiveResults — หน้า /lottery/results', () => {
  it('ไม่มีงวดใหม่ → แสดงตารางผลครบของงวด static', async () => {
    render(<LiveResults draw={staticDraw} />);
    expect(screen.getByText('654321')).toBeInTheDocument();
    expect(screen.getByText(/งวดวันที่ 1 กันยายน 2569/)).toBeInTheDocument();
  });

  it('KV มีงวดใหม่กว่า → แสดงตารางผลครบของงวดใหม่ ไม่ใช่แค่รางวัลที่ 1', async () => {
    serve({ draw: newDraw, fetchedAt: 'x' });
    render(<LiveResults draw={staticDraw} />);
    expect(await screen.findByText('123456')).toBeInTheDocument();
    expect(screen.queryByText('654321')).not.toBeInTheDocument();
    expect(screen.getByText('งวดใหม่ล่าสุด')).toBeInTheDocument();
    expect(screen.getByText(/งวดวันที่ 16 กันยายน 2569/)).toBeInTheDocument();
    // รางวัลอื่นครบ เช่นรางวัลที่ 5 และเลขท้าย 3 ตัวที่ซ้ำกันได้
    expect(screen.getByText('รางวัลที่ 5')).toBeInTheDocument();
    expect(screen.getAllByText('333')).toHaveLength(2);
  });
});

describe('LatestSummary — การ์ดผลงวดล่าสุดในหน้า /lottery', () => {
  it('KV มีงวดใหม่กว่า → การ์ดสลับเป็นงวดใหม่', async () => {
    serve({ draw: newDraw, fetchedAt: 'x' });
    render(<LatestSummary draw={staticDraw} />);
    expect(screen.getByText('654321')).toBeInTheDocument();
    expect(await screen.findByText('123456')).toBeInTheDocument();
  });
});

describe('LiveDrawNotice — เตือนเมื่อข้อมูลไม่ใช่งวดล่าสุด', () => {
  it('พ้นวันออกรางวัลตามกำหนดแล้วยังไม่มีผลงวดนั้น → เตือนตั้งแต่วันถัดไป', async () => {
    today('2026-09-17');
    render(<LiveDrawNotice staticDrawDate="2026-09-01" />);
    expect(await screen.findByText(/ยังไม่มีผลงวดวันที่ 16 กันยายน 2569/)).toBeInTheDocument();
  });

  it('ในวันออกรางวัลเองยังไม่เตือน', async () => {
    today('2026-09-16');
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<LiveDrawNotice staticDrawDate="2026-09-01" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
  });

  it('KV มีงวดที่คาดไว้แล้ว → ไม่เตือน', async () => {
    today('2026-09-17');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ draw: newDraw, fetchedAt: 'x' })));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<LiveDrawNotice staticDrawDate="2026-09-01" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
  });

  it('ยังถาม KV ไม่เสร็จ → ไม่เตือนก่อน (กันคำเตือนโผล่วาบแล้วหายไป)', () => {
    today('2026-10-10');
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
    const { container } = render(<LiveDrawNotice staticDrawDate="2026-09-01" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('เก่าเกิน 18 วัน → เตือนแบบเดิม', async () => {
    today('2026-09-25');
    render(<LiveDrawNotice staticDrawDate="2026-09-01" />);
    expect(await screen.findByText(/ยังไม่ถูกอัปเดต/)).toBeInTheDocument();
  });
});
