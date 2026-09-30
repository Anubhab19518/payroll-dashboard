import { describe, it, expect } from 'vitest';
import { formatCurrency, formatIndianNumber } from '../format-currency';

describe('formatCurrency and formatIndianNumber utilities', () => {
  it('formats standard positive numbers to INR currency', () => {
    expect(formatCurrency(15000)).toContain('15,000');
    expect(formatCurrency(100000)).toContain('1,00,000');
  });

  it('handles null, undefined, and non-number inputs gracefully', () => {
    expect(formatCurrency(null)).toBe('₹ 0');
    expect(formatCurrency(undefined)).toBe('₹ 0');
    expect(formatCurrency('invalid')).toBe('₹ 0');
    expect(formatCurrency('')).toBe('₹ 0');
  });

  it('formats string numbers correctly', () => {
    expect(formatCurrency('25000')).toContain('25,000');
  });

  it('formats numbers with formatIndianNumber', () => {
    expect(formatIndianNumber(15000)).toBe('15,000');
    expect(formatIndianNumber(100000)).toBe('1,00,000');
    expect(formatIndianNumber(null)).toBe('0');
    expect(formatIndianNumber(undefined)).toBe('0');
    expect(formatIndianNumber('invalid')).toBe('0');
  });
});
