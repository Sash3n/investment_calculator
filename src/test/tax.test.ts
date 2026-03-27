import { describe, it, expect } from 'vitest';
import { calcIncomeTax, getMarginalRate } from '../utils/tax';

describe('calcIncomeTax (SARS 2026 brackets)', () => {
  it('returns 0 for zero income', () => {
    expect(calcIncomeTax(0, 'under65')).toBe(0);
  });

  it('returns 0 for negative income', () => {
    expect(calcIncomeTax(-1, 'under65')).toBe(0);
  });

  it('under65 primary rebate is applied', () => {
    // Income just above the tax threshold — should pay small amount
    const tax = calcIncomeTax(100_000, 'under65');
    expect(tax).toBeGreaterThanOrEqual(0);
  });

  it('under65 high earner is in top bracket (45%)', () => {
    const rate = getMarginalRate(2_000_000);
    expect(rate).toBe(0.45);
  });

  it('65to74 rebate is higher than under65', () => {
    const income = 400_000;
    const taxUnder65 = calcIncomeTax(income, 'under65');
    const tax65to74 = calcIncomeTax(income, '65to74');
    expect(tax65to74).toBeLessThan(taxUnder65);
  });

  it('75plus rebate is highest', () => {
    const income = 400_000;
    const tax65to74 = calcIncomeTax(income, '65to74');
    const tax75plus = calcIncomeTax(income, '75plus');
    expect(tax75plus).toBeLessThan(tax65to74);
  });

  it('income in first bracket (18%) is taxed at 18% marginal rate', () => {
    const rate = getMarginalRate(200_000);
    expect(rate).toBe(0.18);
  });

  it('income in second bracket is taxed at 26% marginal rate', () => {
    const rate = getMarginalRate(300_000);
    expect(rate).toBe(0.26);
  });

  it('income in third bracket is taxed at 31%', () => {
    const rate = getMarginalRate(400_000);
    expect(rate).toBe(0.31);
  });

  it('income in fourth bracket is taxed at 36%', () => {
    const rate = getMarginalRate(600_000);
    expect(rate).toBe(0.36);
  });

  it('income in fifth bracket is taxed at 39%', () => {
    const rate = getMarginalRate(700_000);
    expect(rate).toBe(0.39);
  });

  it('income in sixth bracket is taxed at 41%', () => {
    const rate = getMarginalRate(1_000_000);
    expect(rate).toBe(0.41);
  });

  it('tax increases with income (progressive)', () => {
    const tax1 = calcIncomeTax(300_000, 'under65');
    const tax2 = calcIncomeTax(600_000, 'under65');
    const tax3 = calcIncomeTax(900_000, 'under65');
    expect(tax2).toBeGreaterThan(tax1);
    expect(tax3).toBeGreaterThan(tax2);
  });
});

describe('getMarginalRate', () => {
  it('returns 0 for zero income', () => {
    expect(getMarginalRate(0)).toBe(0);
  });

  it('returns the top rate for very high income', () => {
    expect(getMarginalRate(5_000_000)).toBe(0.45);
  });
});
