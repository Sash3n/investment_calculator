/**
 * Degenerate-input safety net: calculators must never emit NaN/Infinity as
 * financial output, even for inputs that bypass UI min/max (e.g. share links
 * or future refactors). These tests pin the guards.
 */
import { describe, it, expect } from 'vitest';
import { calcPayment, calcMortgageSummary } from '../utils/mortgage';
import { calcPropertyROI } from '../utils/roi';
import { calcRetirementIncomeGoal, calcRetirementAffordability } from '../utils/retirementIncome';

const finite = (v: number) => Number.isFinite(v);

describe('calcPayment degenerate inputs', () => {
  it('term of 0 years does not divide by zero', () => {
    expect(finite(calcPayment(1_000_000, 11.5, 0, 12))).toBe(true);
    expect(finite(calcPayment(1_000_000, 0, 0, 12))).toBe(true);
  });

  it('zero loan pays zero', () => {
    expect(calcPayment(0, 11.5, 20, 12)).toBe(0);
  });

  it('zero rate amortises linearly', () => {
    expect(calcPayment(120_000, 0, 10, 12)).toBeCloseTo(1_000, 6);
  });

  it('a tiny positive rate that rounds (1+r) to 1.0 does not return Infinity', () => {
    // Reachable from a share link: 1e-13 passes the sanitizer's finite+magnitude checks.
    const pmt = calcPayment(1_000_000, 1e-13, 20, 12);
    expect(finite(pmt)).toBe(true);
    expect(pmt).toBeCloseTo(1_000_000 / (20 * 12), 6);
  });
});

describe('calcMortgageSummary degenerate inputs', () => {
  const base = {
    purchasePrice: 1_500_000, deposit: 150_000, interestRate: 11.5, termYears: 20,
    frequency: 'monthly' as const, extraPayment: 0, lumpSumYear: 0, lumpSumAmount: 0,
    monthlyServiceFee: 69, initiationFee: 6_037, initiationFeeCapitalised: false,
    transferDutyExempt: false, bondRegistrationIncluded: false,
  };

  it('zero purchase price yields finite, non-negative outputs', () => {
    const r = calcMortgageSummary({ ...base, purchasePrice: 0, deposit: 0 });
    expect(finite(r.standardPayment)).toBe(true);
    expect(finite(r.totalInterestStandard)).toBe(true);
    expect(r.loanAmount).toBeGreaterThanOrEqual(0);
  });

  it('deposit larger than price clamps the loan to zero', () => {
    const r = calcMortgageSummary({ ...base, deposit: 5_000_000 });
    expect(r.loanAmount).toBeGreaterThanOrEqual(0);
    expect(finite(r.standardPayment)).toBe(true);
  });

  it('zero term stays finite', () => {
    const r = calcMortgageSummary({ ...base, termYears: 0 });
    expect(finite(r.standardPayment)).toBe(true);
    expect(finite(r.totalInterestStandard)).toBe(true);
    expect(finite(r.depositPercent)).toBe(true);
  });
});

describe('calcPropertyROI degenerate inputs', () => {
  const base = {
    propertyName: 'x', purchasePrice: 1_200_000, discount: 0, deposit: 120_000,
    interestRate: 11.25, bondTerm: 20, monthlyLevies: 0, monthlyRates: 0, insurance: 0,
    effluentFees: 0, miscFees: 0, monthlyServiceFee: 0, managementFeePercent: 0,
    vacancyRate: 0, rentScenario1: 9_500, rentScenario2: 11_000, annualAppreciation: 5,
    transferDutyExempt: false, bondRegistrationIncluded: false,
    initiationFee: 6_037, initiationFeeCapitalised: false,
  };

  it('zero purchase price yields finite yields and ROI', () => {
    const r = calcPropertyROI({ ...base, purchasePrice: 0, deposit: 0, rentScenario1: 0, rentScenario2: 0 });
    for (const v of [r.grossYieldS1, r.netYieldS1, r.roi5YearS1, r.roi10YearS2, r.monthlyBondRepayment]) {
      expect(finite(v)).toBe(true);
    }
  });

  it('zero bond term stays finite', () => {
    const r = calcPropertyROI({ ...base, bondTerm: 0 });
    expect(finite(r.monthlyBondRepayment)).toBe(true);
  });

  it('100% discount does not blow up', () => {
    const r = calcPropertyROI({ ...base, discount: 100 });
    expect(finite(r.roi5YearS1)).toBe(true);
    expect(r.loanAmount).toBeGreaterThanOrEqual(0);
  });
});

describe('retirement calculators degenerate inputs', () => {
  const income = {
    currentAge: 30, retirementAge: 50, desiredMonthlyIncome: 100_000, swr: 0.04,
    currentSavings: 0, annualReturnPercent: 11, annualInflationPercent: 5.5,
    contributionEscalation: 0,
  };

  it('zero SWR yields zero target, not Infinity', () => {
    const r = calcRetirementIncomeGoal({ ...income, swr: 0 });
    expect(r.lumpSumTarget).toBe(0);
    expect(finite(r.requiredMonthly)).toBe(true);
  });

  it('zero desired income needs zero contribution', () => {
    const r = calcRetirementIncomeGoal({ ...income, desiredMonthlyIncome: 0 });
    expect(r.requiredMonthly).toBe(0);
  });

  it('zero return rate stays finite', () => {
    const r = calcRetirementIncomeGoal({ ...income, annualReturnPercent: 0 });
    expect(finite(r.requiredMonthly)).toBe(true);
    expect(finite(r.finalBalance)).toBe(true);
  });

  it('affordability with zero income and zero savings rate stays finite', () => {
    const r = calcRetirementAffordability({
      currentAge: 30, retirementAge: 50, currentMonthlyIncome: 0, savingsRatePercent: 0,
      swr: 0.04, currentSavings: 0, annualReturnPercent: 11, annualInflationPercent: 5.5,
      contributionEscalation: 0,
    });
    expect(r.incomeReplacementPct).toBe(0);
    expect(finite(r.achievableMonthlyIncomeToday)).toBe(true);
  });
});
