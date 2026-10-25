import { describe, it, expect } from 'vitest';
import { calcLoanResult, type Loan } from '../utils/loanComparison';
import { calcTransferDuty } from '../utils/tax';

const loan: Loan = {
  id: 1, label: 'A', amount: 1_200_000, interestRate: 11.5, termYears: 20, initiationFee: 6_037,
  capitaliseInitiationFee: false, monthlyServiceFee: 69, transferDutyOverride: null, bondRegFeeOverride: null,
};

describe('loan comparison', () => {
  it('keeps the service fee out of the interest', () => {
    const r = calcLoanResult(loan, 'x', 1_500_000);
    expect(r.totalInterest).toBeCloseTo(r.monthlyPayment * 240 - 1_200_000, 2);
    expect(r.totalMonthly - r.monthlyPayment).toBe(69);
  });
  it('works out transfer duty from the price of the home', () => {
    const r = calcLoanResult(loan, 'x', 1_500_000);
    expect(r.transferDuty).toBe(calcTransferDuty(1_500_000));
  });
  it('still counts the service fee in the grand total', () => {
    const noFee = calcLoanResult({ ...loan, monthlyServiceFee: 0 }, 'x', 1_500_000);
    const withFee = calcLoanResult(loan, 'x', 1_500_000);
    expect(withFee.grandTotal - noFee.grandTotal).toBeCloseTo(69 * 240, 2);
  });
});
