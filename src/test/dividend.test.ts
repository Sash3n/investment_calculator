import { describe, it, expect } from 'vitest';
import { project, effectiveTaxRate, type DividendInputs } from '../utils/dividend';

const base: DividendInputs = {
  investmentAmount: 200_000, monthlyContribution: 0, dividendYield: 4.5, dividendGrowthRate: 7,
  annualReturnRate: 10, market: 'SA', foreignWithholdingTax: 15, exchangeRate: 18.5,
  drip: false, tfsa: false, years: 20, targetMonthlyIncome: 0,
};

describe('dividend projection', () => {
  it('grows the dividend at the dividend growth rate, not on top of price growth', () => {
    const rows = project(base);
    // No contributions or reinvestment: the dividend in year 20 is year one grown 19 times at 7%
    const expected = rows[0].grossDividend * Math.pow(1.07, 19);
    expect(rows[19].grossDividend).toBeGreaterThan(expected * 0.99);
    expect(rows[19].grossDividend).toBeLessThan(expected * 1.01);
  });
  it('keeps the yield on the portfolio sensible', () => {
    const rows = project({ ...base, monthlyContribution: 2_500, drip: true });
    const last = rows[rows.length - 1];
    expect(last.grossDividend / last.portfolioValue).toBeLessThan(0.06);
  });
  it('applies 20% dividends tax, none in a TFSA', () => {
    expect(effectiveTaxRate('SA', 15)).toBe(0.2);
    expect(effectiveTaxRate('SA', 15, true)).toBe(0);
    expect(effectiveTaxRate('International', 25)).toBe(0.25);
  });
});
