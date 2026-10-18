import { describe, it, expect } from 'vitest';
import { formatRand, formatRandShort, formatNumber, formatMonths } from '../utils/format';

const NBSP = ' ';
const nb = (s: string) => s.replace(/ /g, NBSP);

describe('formatRand', () => {
  it('groups with non-breaking spaces and uses a decimal comma', () => {
    expect(formatRand(1250000)).toBe(nb('R 1 250 000,00'));
    expect(formatRand(1234567.891)).toBe(nb('R 1 234 567,89'));
    expect(formatRand(999.5, 0)).toBe(nb('R 1 000'));
  });

  it('keeps small amounts ungrouped', () => {
    expect(formatRand(69)).toBe(nb('R 69,00'));
    expect(formatRand(0)).toBe(nb('R 0,00'));
  });

  it('puts the sign before the R and drops it on zero', () => {
    expect(formatRand(-1500)).toBe(nb('-R 1 500,00'));
    expect(formatRand(-0.001)).toBe(nb('R 0,00'));
  });

  it('treats non-finite input as zero', () => {
    expect(formatRand(NaN)).toBe(nb('R 0,00'));
    expect(formatRand(Infinity, 0)).toBe(nb('R 0'));
  });

  it('never contains a breaking space', () => {
    expect(formatRand(123456789.12)).not.toContain(' ');
  });
});

describe('formatRandShort', () => {
  it('abbreviates millions and thousands', () => {
    expect(formatRandShort(1_250_000)).toBe(nb('R 1,3M'));
    expect(formatRandShort(450_000)).toBe(nb('R 450K'));
    expect(formatRandShort(-2_000)).toBe(nb('-R 2K'));
    expect(formatRandShort(800)).toBe(nb('R 800'));
  });
});

describe('formatNumber', () => {
  it('groups like rand amounts', () => {
    expect(formatNumber(1234567)).toBe(nb('1 234 567'));
    expect(formatNumber(1234.5, 1)).toBe(nb('1 234,5'));
    expect(formatNumber(-42)).toBe('-42');
  });
});

describe('formatMonths', () => {
  it('writes years and months in words', () => {
    expect(formatMonths(0)).toBe('0 months');
    expect(formatMonths(1)).toBe('1 month');
    expect(formatMonths(12)).toBe('1 year');
    expect(formatMonths(38)).toBe('3 years 2 months');
  });
});
