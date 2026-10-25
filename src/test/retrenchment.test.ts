import { describe, it, expect } from 'vitest';
import { calcUIF, noticeWeeks, calcLumpSumTax } from '../utils/retrenchment';

describe('noticeWeeks (BCEA section 37)', () => {
  it('gives 1 week up to six months, 2 weeks up to a year and 4 weeks from a year', () => {
    expect(noticeWeeks(0.25)).toBe(1);
    expect(noticeWeeks(0.5)).toBe(1);
    expect(noticeWeeks(0.75)).toBe(2);
    expect(noticeWeeks(1)).toBe(4);
    expect(noticeWeeks(3)).toBe(4);
  });
});

describe('calcUIF', () => {
  it('pays 38% at the income ceiling', () => {
    const u = calcUIF(45_000, 5);
    expect(u.replacementRate).toBeCloseTo(38.0, 0);
    // R17 712 a month is R582.31 a day; 38% of that over a month is about R6 730
    expect(u.monthlyBenefit).toBeGreaterThan(6_650);
    expect(u.monthlyBenefit).toBeLessThan(6_800);
  });
  it('replaces more of a low income, up to 60%', () => {
    // R3 000 a month is R98.63 a day: 29.2 + 7173.92 / 331.55 = 50.8%
    expect(calcUIF(3_000, 5).replacementRate).toBeCloseTo(50.8, 1);
    expect(calcUIF(100, 5).replacementRate).toBeLessThanOrEqual(60);
  });
  it('builds one credit day per four days worked, up to 365', () => {
    expect(calcUIF(15_000, 1).creditDays).toBe(91);
    expect(calcUIF(15_000, 10).creditDays).toBe(365);
  });
  it('pays days after the first 238 at 20%', () => {
    const u = calcUIF(15_000, 10);
    const daily = (15_000 * 12) / 365;
    expect(u.totalBenefit).toBeCloseTo(238 * daily * u.replacementRate / 100 + 127 * daily * 0.2, 0);
  });
});

describe('calcLumpSumTax', () => {
  it('taxes nothing up to R550 000 and 18% above it', () => {
    expect(calcLumpSumTax(550_000)).toBe(0);
    expect(calcLumpSumTax(650_000)).toBe(18_000);
  });
});
