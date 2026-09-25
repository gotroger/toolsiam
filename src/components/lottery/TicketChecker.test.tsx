// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TicketChecker from './TicketChecker';
import { __setRemoteForTests } from '@/lib/lottery-remote';
import type { LotteryDraw } from '@/data/lottery/schema';

const seq = (n: number, start: number) => Array.from({ length: n }, (_, i) => String(start + i).padStart(6, '0'));

/** งวดสมมติ — ไม่ใช่ผลรางวัลจริง */
function drawOf(drawDate: string, first: string, last2: string): LotteryDraw {
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
      threeDigitBack: ['333', '444'],
      twoDigitBack: [last2],
    },
    sourceUrl: 'https://www.glo.or.th/',
    enteredAt: drawDate,
    status: 'validated',
  };
}

const staticDraw = drawOf('2026-09-01', '654321', '99');
const newDraw = drawOf('2026-09-16', '123456', '88');

function check(value: string) {
  fireEvent.change(screen.getByLabelText('หมายเลขสลาก'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'ตรวจรางวัล' }));
}

beforeEach(() => {
  __setRemoteForTests(null);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
});
afterEach(() => vi.unstubAllGlobals());

describe('TicketChecker', () => {
  it('ไม่มีงวดใหม่ใน KV → ตรวจกับงวด static และบอกว่าเป็นงวดไหน', async () => {
    render(<TicketChecker draw={staticDraw} />);
    expect(screen.getByText(/งวดวันที่ 1 กันยายน 2569/)).toBeInTheDocument();
    check('654321');
    expect(await screen.findByText(/ถูกรางวัลที่ 1/)).toBeInTheDocument();
  });

  it('KV มีงวดใหม่กว่า → ตรวจกับงวดใหม่ ผู้ถูกรางวัลงวดวันนี้ต้องไม่ถูกบอกว่าไม่ถูกรางวัล', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ draw: newDraw, fetchedAt: '2026-09-16T09:00:00Z' }))),
    );
    render(<TicketChecker draw={staticDraw} />);
    await screen.findByText(/งวดวันที่ 16 กันยายน 2569/);
    expect(screen.getByText('งวดใหม่ล่าสุด')).toBeInTheDocument();

    check('123456');
    expect(await screen.findByText(/ถูกรางวัลที่ 1/)).toBeInTheDocument();
    expect(screen.queryByText('ไม่ถูกรางวัลในงวดนี้')).not.toBeInTheDocument();
  });

  it('ผลที่ตรวจไปแล้วถูกตรวจใหม่กับงวดใหม่ทันทีที่ข้อมูลมาถึง', async () => {
    let resolve!: (r: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => { resolve = r; })));
    render(<TicketChecker draw={staticDraw} />);
    check('123456');
    expect(await screen.findByText('ไม่ถูกรางวัลในงวดนี้')).toBeInTheDocument();

    resolve(new Response(JSON.stringify({ draw: newDraw, fetchedAt: 'x' })));
    expect(await screen.findByText(/ถูกรางวัลที่ 1/)).toBeInTheDocument();
    expect(screen.getByText(/ผลตรวจกับงวดวันที่ 16 กันยายน 2569/)).toBeInTheDocument();
  });

  it('งวดใน KV ที่ไม่ผ่าน validator ไม่ถูกนำมาใช้ตรวจ', async () => {
    const broken = { ...newDraw, prizes: { ...newDraw.prizes, first: [] } };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ draw: broken, fetchedAt: 'x' })));
    vi.stubGlobal('fetch', fetchMock);
    render(<TicketChecker draw={staticDraw} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    check('654321');
    expect(await screen.findByText(/ถูกรางวัลที่ 1/)).toBeInTheDocument();
    expect(screen.getByText(/ผลตรวจกับงวดวันที่ 1 กันยายน 2569/)).toBeInTheDocument();
  });

  it('สลากเลขซ้ำกันหลายใบแสดงครบทุกใบ และ React ไม่เตือน key ซ้ำ', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<TicketChecker draw={staticDraw} />);
    check('654321\n654321\n12345\n12345');
    await screen.findAllByText(/ถูกรางวัลที่ 1/);
    expect(screen.getAllByText(/ถูกรางวัลที่ 1/)).toHaveLength(2);
    expect(screen.getAllByText(/"12345"/)).toHaveLength(2);
    expect(error.mock.calls.flat().join(' ')).not.toMatch(/same key/);
    error.mockRestore();
  });

  it('กรอกหลายใบในบรรทัดเดียวด้วยเว้นวรรค และใช้เลขไทยได้', async () => {
    render(<TicketChecker draw={staticDraw} />);
    check('๖๕๔๓๒๑ 999000');
    expect(await screen.findByText(/ถูกรางวัลที่ 1/)).toBeInTheDocument();
    expect(screen.getAllByText('ไม่ถูกรางวัลในงวดนี้')).toHaveLength(1);
  });
});
