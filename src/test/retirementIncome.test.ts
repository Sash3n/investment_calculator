import { describe, it, expect } from 'vitest';
import { calcRetirementIncomeGoal, simulateRetirementSavings, findRequiredMonthly, simulateDrawdown } from '../utils/retirementIncome';

const baseInputs = {
  currentAge:             30,
  retirementAge:          50,
  desiredMonthlyIncome:   100_000,
  swr:                    0.04,
  currentSavings:         0,
  annualReturnPercent:    11,
  annualInflationPercent: 5.5,
  contributionEscalation: 0,
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

  it('escalating contributions reduce the required starting monthly amount', () => {
    const flat       = calcRetirementIncomeGoal(baseInputs);
    const escalating = calcRetirementIncomeGoal({ ...baseInputs, contributionEscalation: 5 });
    expect(escalating.requiredMonthly).toBeLessThan(flat.requiredMonthly);
  });

  it('the drawdown simulation starts at the nest egg balance and depletes or sustains over the horizon', () => {
    const result = calcRetirementIncomeGoal(baseInputs);
    expect(result.drawdown.length).toBeGreaterThan(0);
    expect(result.drawdown[result.drawdown.length - 1].balance).toBeGreaterThanOrEqual(0);
  });
});

describe('simulateDrawdown', () => {
  it('sustains a balance when withdrawals are well below the safe withdrawal rate', () => {
    const { rows, depletionAge } = simulateDrawdown(10_000_000, 10_000, 8, 5, 60, 40);
    expect(depletionAge).toBeNull();
    expect(rows[rows.length - 1].balance).toBeGreaterThan(0);
  });

  it('depletes a balance when withdrawals exceed what the balance can sustain', () => {
    const { depletionAge } = simulateDrawdown(1_000_000, 50_000, 5, 5, 60, 40);
    expect(depletionAge).not.toBeNull();
    expect(depletionAge).toBeGreaterThan(60);
  });
});
