import { describe, expect, it } from 'vitest';
import { formatDate, money, orderCode } from '../format';

describe('format helpers', () => {
  it('formats VND with Vietnamese grouping', () => {
    expect(money(1250000)).toBe('1.250.000₫');
    expect(money(null)).toBe('0₫');
  });

  it('pads order codes like the order confirmation page', () => {
    expect(orderCode(7)).toBe('VELA00007');
    expect(orderCode(12345)).toBe('VELA12345');
  });

  it('reads naive API timestamps as UTC (Ho Chi Minh is UTC+7)', () => {
    expect(formatDate('2026-10-25T20:00:00')).toBe(formatDate('2026-10-25T20:00:00Z'));
    expect(formatDate('2026-10-25T20:00:00')).toContain('26');
  });
});
