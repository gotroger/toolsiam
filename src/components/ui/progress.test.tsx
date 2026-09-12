// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './progress';

describe('ProgressBar', () => {
  it('รายงานค่าเป็น progressbar พร้อมป้ายเปอร์เซ็นต์', () => {
    render(<ProgressBar id="p" label="กำลังแปลง" value={42.6} detail="เหลืออีกไม่นาน" />);
    const bar = screen.getByRole('progressbar', { name: 'กำลังแปลง' });
    expect(bar).toHaveAttribute('aria-valuenow', '43');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(screen.getByText('43%')).toBeInTheDocument();
    expect(screen.getByText('เหลืออีกไม่นาน')).toBeInTheDocument();
  });

  it('ค่า null = ไม่ทราบความคืบหน้า ไม่มี aria-valuenow และไม่มีเปอร์เซ็นต์', () => {
    render(<ProgressBar id="p" label="กำลังโหลด" value={null} />);
    const bar = screen.getByRole('progressbar', { name: 'กำลังโหลด' });
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(bar.querySelector('.product-progress-fill')).toHaveClass('product-progress-indeterminate');
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('บีบค่าให้อยู่ใน 0–100', () => {
    render(<ProgressBar id="p" label="x" value={140} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});
