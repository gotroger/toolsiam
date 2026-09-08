// @vitest-environment jsdom
import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker, dateLabel, shiftCalendarMonth } from './date-picker';

// jsdom has no dialog top layer; browser QA verifies modal focus trapping/Escape.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

function Harness({ initial = '2024-01-31', min = '1900-01-01', max = '2200-12-31' } = {}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="date">วันเริ่มงาน</label>
      <DatePicker id="date" value={value} onValueChange={setValue} min={min} max={max} />
      <output data-testid="value">{value}</output>
    </>
  );
}

describe('Thai DatePicker', () => {
  it('wraps Tab and Shift+Tab inside the calendar', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'วันเริ่มงาน' }));
    const last = screen.getByRole('button', { name: 'วันนี้' });
    expect(last).not.toBeDisabled();
    last.focus();
    expect(last).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'ปิดปฏิทิน' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });
  it('displays Buddhist years and clamps month navigation across leap days', () => {
    expect(dateLabel('2024-02-29')).toBe('29 กุมภาพันธ์ 2567');
    expect(shiftCalendarMonth('2024-01-31', 1)).toBe('2024-02-29');
    expect(shiftCalendarMonth('2024-02-29', 12)).toBe('2025-02-28');
    expect(shiftCalendarMonth('2024-01-31', -1)).toBe('2023-12-31');
  });
  it('keeps calendar controls absent until opened, selects ISO date and restores focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'วันเริ่มงาน' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(trigger);
    expect(screen.getByRole('button', { name: '31 มกราคม 2567' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'เดือนถัดไป' }));
    await user.click(screen.getByRole('button', { name: '29 กุมภาพันธ์ 2567' }));
    expect(screen.getByTestId('value')).toHaveTextContent('2024-02-29');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('changes month/year directly and preserves the value until a day is chosen', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'วันเริ่มงาน' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'ปี พ.ศ.' }), '1990');
    await user.selectOptions(screen.getByRole('combobox', { name: 'เดือน' }), '8');
    expect(screen.getByTestId('value')).toHaveTextContent('2024-01-31');
    await user.click(screen.getByRole('button', { name: '20 สิงหาคม 2533' }));
    expect(screen.getByTestId('value')).toHaveTextContent('1990-08-20');
  });
  it('supports keyboard cross-month navigation and Enter selection', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'วันเริ่มงาน' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: '1 กุมภาพันธ์ 2567' })).toHaveFocus();
    await user.keyboard('{PageDown}');
    expect(screen.getByRole('button', { name: '1 มีนาคม 2567' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('value')).toHaveTextContent('2024-03-01');
  });
  it('constrains days, month navigation and Today to the allowed range', async () => {
    const user = userEvent.setup();
    render(<Harness initial="2024-02-15" min="2024-02-10" max="2024-02-20" />);
    await user.click(screen.getByRole('button', { name: 'วันเริ่มงาน' }));
    expect(screen.getByRole('button', { name: '9 กุมภาพันธ์ 2567' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '21 กุมภาพันธ์ 2567' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'เดือนก่อนหน้า' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'เดือนถัดไป' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'วันนี้' })).toBeDisabled();
    await user.keyboard('{Home}{ArrowLeft}{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('button', { name: '10 กุมภาพันธ์ 2567' })).toHaveFocus();
  });
  it('cancel leaves the value intact and clear emits an empty value', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'วันเริ่มงาน' });
    await user.click(trigger);
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(trigger).toHaveFocus();
    expect(screen.getByTestId('value')).toHaveTextContent('2024-01-31');
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'ล้างวันที่' }));
    expect(screen.getByTestId('value')).toBeEmptyDOMElement();
  });
  it('handles an empty value and exposes exactly one tabbable date', async () => {
    const user = userEvent.setup();
    render(<Harness initial="" />);
    await user.click(screen.getByRole('button', { name: 'วันเริ่มงาน' }));
    const grid = screen.getByRole('grid');
    expect(
      within(grid)
        .getAllByRole('button')
        .filter((e) => e.tabIndex === 0),
    ).toHaveLength(1);
  });
});
