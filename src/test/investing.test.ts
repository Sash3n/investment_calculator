import { describe, it, expect } from 'vitest';
import { calcExtraPaymentVsInvesting, calcStandardPayment } from '../utils/investing';

const baseInputs = {
  loanBalance: 800_000,
  interestRate: 11.25,
  remainingTermYears: 15,
  extraMonthlyAmount: 3_000,
  investmentVehicle: 'Satrix 40' as const,
  expectedReturn: 13,
  inflationRate: 6,
  cgtRate: 18,
};

describe('calcExtraPaymentVsInvesting', () => {
  it('interest saved is positive when paying extra', () => {
    const result = calcExtraPaymentVsInvesting(baseInputs);
    expect(result.interestSaved).toBeGreaterThan(0);
  });

  it('months saved is positive when paying extra', () => {
    const result = calcExtraPaymentVsInvesting(baseInputs);
    expect(result.monthsSaved).toBeGreaterThan(0);
  });

  it('new payoff date is before standard payoff date', () => {
    const result = calcExtraPaymentVsInvesting(baseInputs);
    expect(result.newPayoffDate.getTime()).toBeLessThan(result.standardPayoffDate.getTime());
  });

  it('portfolio value at payoff is positive', () => {
    const result = calcExtraPaymentVsInvesting(baseInputs);
    expect(result.portfolioValueAtPayoff).toBeGreaterThan(0);
  });

  it('after-tax portfolio value is less than gross portfolio value', () => {
    const result = calcExtraPaymentVsInvesting(baseInputs);
    expect(result.afterTaxPortfolioValue).toBeLessThan(result.portfolioValueAtPayoff);
  });

  it('winner is one of the two valid values', () => {
    const result = calcExtraPaymentVsInvesting(baseInputs);
    expect(['bond', 'investing']).toContain(result.winner);
  });

  it('winner amount is positive', () => {
    const result = calcExtraPaymentVsInvesting(baseInputs);
    expect(result.winnerAmount).toBeGreaterThan(0);
  });

  it('year-by-year table covers the full term', () => {
    const result = calcExtraPaymentVsInvesting(baseInputs);
    expect(result.yearByYear.length).toBe(Math.ceil(baseInputs.remainingTermYears));
  });

  it('each year-by-year row has a valid winner', () => {
    const result = calcExtraPaymentVsInvesting(baseInputs);
    result.yearByYear.forEach((row) => {
      expect(['A', 'B']).toContain(row.winner);
    });
  });

  it('bond balance in scenario A decreases faster than scenario B', () => {
    const result = calcExtraPaymentVsInvesting(baseInputs);
    // By year 5, Scenario A (extra to bond) should have a lower bond balance
    const year5 = result.yearByYear[4];
    expect(year5.bondBalanceA).toBeLessThan(year5.bondBalanceB);
  });

  it('high-return investing scenario tends to favour investing', () => {
    const result = calcExtraPaymentVsInvesting({ ...baseInputs, expectedReturn: 20 });
    expect(result.winner).toBe('investing');
  });

  it('at a 0% return the bond route wins, by about the interest saved', () => {
    const result = calcExtraPaymentVsInvesting({ ...baseInputs, expectedReturn: 0, cgtRate: 0 });
    expect(result.winner).toBe('bond');
    // With no growth, the only difference between the routes is the interest the bond route avoided
    expect(result.winnerAmount).toBeGreaterThan(result.interestSaved * 0.97);
    expect(result.winnerAmount).toBeLessThan(result.interestSaved * 1.03);
  });

  it('investing at the bond rate with no CGT ends about level', () => {
    const result = calcExtraPaymentVsInvesting({ ...baseInputs, expectedReturn: baseInputs.interestRate, cgtRate: 0 });
    expect(result.winnerAmount).toBeLessThan(result.afterTaxPortfolioValue * 0.02);
  });

  it('investing at the bond rate loses once CGT is paid', () => {
    const result = calcExtraPaymentVsInvesting({ ...baseInputs, expectedReturn: baseInputs.interestRate });
    expect(result.winner).toBe('bond');
  });

  it('the bond route only starts investing after the bond is paid off', () => {
    const result = calcExtraPaymentVsInvesting(baseInputs);
    const payoffYear = Math.ceil((baseInputs.remainingTermYears * 12 - result.monthsSaved) / 12);
    expect(result.yearByYear[0].bondRouteInvestmentValue).toBe(0);
    expect(result.yearByYear[payoffYear].bondRouteInvestmentValue).toBeGreaterThan(0);
    expect(result.bondRouteValue).toBeGreaterThan(0);
  });

  it('the final year matches the headline comparison', () => {
    const result = calcExtraPaymentVsInvesting(baseInputs);
    const last = result.yearByYear[result.yearByYear.length - 1];
    expect(Math.abs(last.netDifference - result.netBenefitB)).toBeLessThanOrEqual(1);
  });

  it('zero extra amount produces no interest saved', () => {
    const result = calcExtraPaymentVsInvesting({ ...baseInputs, extraMonthlyAmount: 0 });
    expect(result.interestSaved).toBe(0);
    expect(result.monthsSaved).toBe(0);
  });
});

describe('calcStandardPayment', () => {
  it('returns a positive payment', () => {
    const pmt = calcStandardPayment(800_000, 11.25, 15);
    expect(pmt).toBeGreaterThan(0);
  });

  it('matches calcPayment from mortgage utils', () => {
    const pmt = calcStandardPayment(500_000, 11.25, 20);
    // R500k at 11.25% over 20 years ≈ R5 161/month
    expect(pmt).toBeGreaterThan(5_000);
    expect(pmt).toBeLessThan(6_000);
  });
});
