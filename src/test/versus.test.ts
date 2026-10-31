import { describe, it, expect } from 'vitest';
import { calcExtraPaymentVsInvesting, buildVersusModel, findBreakEvenReturn } from '../utils/investing';
import type { InvestingInputs } from '../types';

const cases: Record<string, InvestingInputs> = {
  'page defaults': { loanBalance: 900_000, interestRate: 11.25, remainingTermYears: 18, extraMonthlyAmount: 3_000, investmentVehicle: 'satrix40', expectedReturn: 13, cgtRate: 18, inflationRate: 5 },
  'small bond, low return': { loanBalance: 400_000, interestRate: 10.75, remainingTermYears: 10, extraMonthlyAmount: 1_000, investmentVehicle: 'custom', expectedReturn: 6, cgtRate: 12, inflationRate: 5 },
  'large bond, TFSA-like (no CGT)': { loanBalance: 2_500_000, interestRate: 10.75, remainingTermYears: 25, extraMonthlyAmount: 10_000, investmentVehicle: 'custom', expectedReturn: 14, cgtRate: 0, inflationRate: 5 },
};

describe('Versus view figures match the calculator', () => {
  for (const [name, inputs] of Object.entries(cases)) {
    it(name, () => {
      const result = calcExtraPaymentVsInvesting(inputs);
      const model = buildVersusModel(inputs, result);
      expect(model.bond.total).toBe(result.bondRouteValue);
      expect(model.bond.interestSaved).toBe(result.interestSaved);
      expect(model.bond.monthsEarly).toBe(result.monthsSaved);
      expect(model.invest.total).toBe(result.afterTaxPortfolioValue);
      expect(model.invest.beforeTax - model.invest.cgt).toBeCloseTo(result.afterTaxPortfolioValue, 6);
      expect(model.winner).toBe(result.winner);
      expect(model.margin).toBe(result.winnerAmount);
      expect(Math.abs(model.invest.total - model.bond.total)).toBeCloseTo(model.margin, 6);
    });
  }
});

describe('findBreakEvenReturn', () => {
  for (const [name, inputs] of Object.entries(cases)) {
    it(`splits the winners for ${name}`, () => {
      const be = findBreakEvenReturn(inputs);
      expect(be).not.toBeNull();
      const below = calcExtraPaymentVsInvesting({ ...inputs, expectedReturn: be! - 0.25 });
      const above = calcExtraPaymentVsInvesting({ ...inputs, expectedReturn: be! + 0.25 });
      expect(below.winner).toBe('bond');
      expect(above.winner).toBe('investing');
    });
  }

  it('sits above the bond rate when gains are taxed', () => {
    expect(findBreakEvenReturn(cases['page defaults'])!).toBeGreaterThan(11.25);
  });

  it('sits close to the bond rate when gains are not taxed', () => {
    expect(findBreakEvenReturn(cases['large bond, TFSA-like (no CGT)'])!).toBeCloseTo(10.75, 0);
  });

  it('is null when there is no extra payment', () => {
    expect(findBreakEvenReturn({ ...cases['page defaults'], extraMonthlyAmount: 0 })).toBeNull();
  });
});
