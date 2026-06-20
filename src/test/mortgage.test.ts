import { describe, it, expect } from 'vitest';
import { calcPayment, calcAmortization, calcMortgageSummary } from '../utils/mortgage';

// Helper to round to 2 decimal places for assertions
const r2 = (n: number) => Math.round(n * 100) / 100;

describe('calcPayment', () => {
  it('returns correct monthly payment for standard SA bond', () => {
    // R1 000 000 at 11.25% over 20 years
    const pmt = calcPayment(1_000_000, 11.25, 20, 12);
    expect(r2(pmt)).toBe(10_492.56);
  });

  it('returns correct bi-weekly payment', () => {
    const pmt = calcPayment(1_000_000, 11.25, 20, 26);
    // Bi-weekly is roughly half of monthly
    expect(pmt).toBeGreaterThan(4_500);
    expect(pmt).toBeLessThan(5_500);
  });

  it('handles zero interest rate gracefully', () => {
    const pmt = calcPayment(120_000, 0, 10, 12);
    expect(r2(pmt)).toBe(1_000); // 120 000 / 120 months
  });

  it('handles zero loan amount', () => {
    const pmt = calcPayment(0, 11.25, 20, 12);
    expect(pmt).toBe(0);
  });
});

describe('calcAmortization', () => {
  it('produces correct number of periods for standard loan', () => {
    const rows = calcAmortization(500_000, 11.25, 20, 12);
    expect(rows).toHaveLength(240); // 20 years × 12 months
  });

  it('final closing balance is zero', () => {
    const rows = calcAmortization(500_000, 11.25, 20, 12);
    expect(rows[rows.length - 1].closingBalance).toBeCloseTo(0, 0);
  });

  it('extra payments shorten the loan term', () => {
    const standard = calcAmortization(500_000, 11.25, 20, 12);
    const withExtras = calcAmortization(500_000, 11.25, 20, 12, 2_000);
    expect(withExtras.length).toBeLessThan(standard.length);
  });

  it('extra payments reduce total interest paid', () => {
    const standard = calcAmortization(500_000, 11.25, 20, 12);
    const withExtras = calcAmortization(500_000, 11.25, 20, 12, 2_000);
    const interestStandard = standard[standard.length - 1].cumulativeInterest;
    const interestExtra = withExtras[withExtras.length - 1].cumulativeInterest;
    expect(interestExtra).toBeLessThan(interestStandard);
  });

  it('lump sum is applied in the correct period', () => {
    const rows = calcAmortization(500_000, 11.25, 20, 12, 0, 5, 50_000);
    const lumpSumRow = rows.find((r) => r.isLumpSum);
    expect(lumpSumRow).toBeDefined();
    expect(lumpSumRow!.period).toBe(60); // year 5 = period 60
  });

  it('returns empty array for zero loan', () => {
    const rows = calcAmortization(0, 11.25, 20, 12);
    expect(rows).toHaveLength(0);
  });
});

describe('calcMortgageSummary', () => {
  const baseInputs = {
    purchasePrice: 1_500_000,
    deposit: 150_000,
    interestRate: 11.25,
    termYears: 20,
    frequency: 'monthly' as const,
    extraPayment: 0,
    lumpSumYear: 0,
    lumpSumAmount: 0,
    monthlyServiceFee: 69,
    initiationFee: 6037,
    initiationFeeCapitalised: false,
    transferDutyExempt: false,
    bondRegistrationIncluded: false,
  };

  it('calculates correct loan amount after deposit', () => {
    const result = calcMortgageSummary(baseInputs);
    expect(result.loanAmount).toBe(1_350_000);
  });

  it('deposit percent is correct', () => {
    const result = calcMortgageSummary(baseInputs);
    expect(r2(result.depositPercent)).toBe(10);
  });

  it('total interest is positive', () => {
    const result = calcMortgageSummary(baseInputs);
    expect(result.totalInterestStandard).toBeGreaterThan(0);
  });

  it('extra payments reduce interest paid', () => {
    const withExtras = calcMortgageSummary({ ...baseInputs, extraPayment: 3_000 });
    const standard = calcMortgageSummary(baseInputs);
    expect(withExtras.interestSaved).toBeGreaterThan(0);
    expect(withExtras.totalInterestWithExtras).toBeLessThan(standard.totalInterestStandard);
  });

  it('months saved is positive when paying extra', () => {
    const result = calcMortgageSummary({ ...baseInputs, extraPayment: 3_000 });
    expect(result.monthsSaved).toBeGreaterThan(0);
  });

  it('bi-weekly frequency returns correct payment', () => {
    const result = calcMortgageSummary({ ...baseInputs, frequency: 'biweekly' });
    expect(result.standardPayment).toBeGreaterThan(0);
    expect(result.interestSavedBiweekly).toBeGreaterThan(0);
  });

  it('service fee is included in effective monthly payment', () => {
    const result = calcMortgageSummary(baseInputs);
    expect(result.effectiveMonthlyPayment).toBeGreaterThan(result.standardPayment);
  });

  it('capitalising the initiation fee adds it to the loan amount', () => {
    const standard = calcMortgageSummary(baseInputs);
    const capitalised = calcMortgageSummary({ ...baseInputs, initiationFeeCapitalised: true });
    expect(capitalised.loanAmount).toBe(standard.loanAmount + baseInputs.initiationFee);
  });

  it('capitalising the initiation fee increases total interest', () => {
    const standard = calcMortgageSummary(baseInputs);
    const capitalised = calcMortgageSummary({ ...baseInputs, initiationFeeCapitalised: true });
    expect(capitalised.totalInterestStandard).toBeGreaterThan(standard.totalInterestStandard);
  });
});
