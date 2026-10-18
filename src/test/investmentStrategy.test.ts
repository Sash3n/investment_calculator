import { describe, it, expect } from 'vitest';
import {
  calcInvestmentStrategy,
  normaliseTaxYear,
  type InvestmentStrategyInputs,
} from '../utils/investmentStrategy';
import { calcIncomeTax } from '../utils/tax';

const base: InvestmentStrategyInputs = {
  monthlyPrimaryGross: 35_000,
  monthlySecondaryGross: 0,
  age: 35,
  taxYear: '2026/27',
  monthlyRA: 2_000,
  monthlyTFSA: 3_000,
  monthlySeparate: 0,
  annualGrowthRate: 10,
  horizonYears: 20,
  tfsaLifetimeContributed: 0,
};

// R150 000/month = R1.8m a year, so 27.5% (R495 000) is above both annual caps
const highEarner: InvestmentStrategyInputs = { ...base, monthlyPrimaryGross: 150_000, monthlyRA: 40_000 };

describe('calcInvestmentStrategy tax years', () => {
  it('caps the RA deduction at R430 000 in 2026/27', () => {
    const r = calcInvestmentStrategy(highEarner);
    expect(r.raAnnualCap).toBe(430_000);
    expect(r.allowableRA).toBe(430_000);
    expect(r.raCapSource).toBe('annualCap');
  });

  it('caps the RA deduction at R350 000 in 2025/26', () => {
    const r = calcInvestmentStrategy({ ...highEarner, taxYear: '2025/26' });
    expect(r.raAnnualCap).toBe(350_000);
    expect(r.allowableRA).toBe(350_000);
  });

  it('uses the TFSA limit of the selected year', () => {
    expect(calcInvestmentStrategy(base).tfsaAnnualLimit).toBe(46_000);
    expect(calcInvestmentStrategy({ ...base, taxYear: '2025/26' }).tfsaAnnualLimit).toBe(36_000);
  });

  it('taxes with the brackets of the selected year', () => {
    const r26 = calcInvestmentStrategy({ ...base, taxYear: '2025/26' });
    const r27 = calcInvestmentStrategy(base);
    const taxable = 35_000 * 12 - 2_000 * 12;
    expect(r26.monthlyPAYE).toBeCloseTo(calcIncomeTax(taxable, 'under65', '2026') / 12, 6);
    expect(r27.monthlyPAYE).toBeCloseTo(calcIncomeTax(taxable, 'under65', '2027') / 12, 6);
  });

  it('treats a saved tax year that is no longer offered as 2026/27', () => {
    expect(normaliseTaxYear('2024/25')).toBe('2026/27');
    const legacy = { ...highEarner, taxYear: '2024/25' } as unknown as InvestmentStrategyInputs;
    expect(calcInvestmentStrategy(legacy).raAnnualCap).toBe(430_000);
  });
});
