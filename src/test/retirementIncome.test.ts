import { describe, it, expect } from 'vitest';
import { calcRetirementIncomeGoal, simulateRetirementSavings, findRequiredMonthly } from '../utils/retirementIncome';

const baseInputs = {
  currentAge:             30,
  retirementAge:          50,
  desiredMonthlyIncome:   100_000,
  swr:                    0.04,
  currentSavings:         0,
  annualReturnPercent:    11,
  annualInflationPercent: 5.5,
};

describe('simulateRetirementSavings', () => {
  it('returns the lump sum unchanged when no contributions and no time', () => {
    const { finalBalance } = simulateRetirementSavings(0, 0, 11, 500_000);
    expect(finalBalance).toBe(500_000);
  });

  it('grows balance with monthly contributions', () => {
    const { finalBalance } = simulateRetirementSavings(5_000, 10, 11, 0);
    expect(finalBalance).toBeGreaterThan(5_000 * 12 * 10);
  });
});

describe('findRequiredMonthly', () => {
  it('returns 0 when the lump sum already exceeds the target', () => {
    expect(findRequiredMonthly(1_000_000, 10, 11, 2_000_000)).toBe(0);
  });

  it('converges to a monthly amount that reaches the target', () => {
    const target = 10_000_000;
    const years = 20;
    const rate = 11;
    const pmt = findRequiredMonthly(target, years, rate, 0);
    const { finalBalance } = simulateRetirementSavings(pmt, years, rate, 0);
    expect(finalBalance).toBeCloseTo(target, 0);
  });
});

describe('calcRetirementIncomeGoal', () => {
  it('clamps years to at least 1 when retirement age is not after current age', () => {
    const result = calcRetirementIncomeGoal({ ...baseInputs, retirementAge: baseInputs.currentAge });
    expect(result.years).toBe(1);
  });

  it('produces a positive required monthly contribution for a realistic goal', () => {
    const result = calcRetirementIncomeGoal(baseInputs);
    expect(result.requiredMonthly).toBeGreaterThan(0);
  });

  it('lump sum target sustains the desired income at the chosen SWR', () => {
    const result = calcRetirementIncomeGoal(baseInputs);
    expect(result.lumpSumTarget * baseInputs.swr).toBeCloseTo(result.futureAnnualIncome, 0);
  });

  it('reaching the lump sum target via simulation matches the computed target', () => {
    const result = calcRetirementIncomeGoal(baseInputs);
    expect(result.finalBalance).toBeCloseTo(result.lumpSumTarget, 0);
  });

  it('a higher desired income requires a larger lump sum and higher monthly contribution', () => {
    const lower = calcRetirementIncomeGoal(baseInputs);
    const higher = calcRetirementIncomeGoal({ ...baseInputs, desiredMonthlyIncome: 200_000 });
    expect(higher.lumpSumTarget).toBeGreaterThan(lower.lumpSumTarget);
    expect(higher.requiredMonthly).toBeGreaterThan(lower.requiredMonthly);
  });

  it('existing savings reduce the required monthly contribution', () => {
    const noSavings = calcRetirementIncomeGoal(baseInputs);
    const withSavings = calcRetirementIncomeGoal({ ...baseInputs, currentSavings: 1_000_000 });
    expect(withSavings.requiredMonthly).toBeLessThan(noSavings.requiredMonthly);
  });

  it('a higher SWR reduces the lump sum needed (more income drawn per Rand saved)', () => {
    const conservative = calcRetirementIncomeGoal({ ...baseInputs, swr: 0.03 });
    const traditional  = calcRetirementIncomeGoal({ ...baseInputs, swr: 0.04 });
    expect(traditional.lumpSumTarget).toBeLessThan(conservative.lumpSumTarget);
  });
});
