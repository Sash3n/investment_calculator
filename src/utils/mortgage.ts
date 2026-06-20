import type { AmortizationRow, MortgageInputs, MortgageResult } from '../types';
import { calcBondRegistrationCost } from './tax';

/**
 * Calculate periodic payment using standard annuity formula.
 * PMT = PV * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calcPayment(
  loan: number,
  annualRate: number,
  termYears: number,
  paymentsPerYear: number
): number {
  if (loan <= 0 || annualRate <= 0) return loan / (termYears * paymentsPerYear);
  const r = annualRate / 100 / paymentsPerYear;
  const n = termYears * paymentsPerYear;
  return (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Build a full amortization schedule.
 * Supports extra monthly payments and a one-off lump sum in a specific year.
 *
 * @param loan         - Principal loan amount
 * @param annualRate   - Annual interest rate (%)
 * @param termYears    - Loan term in years
 * @param ppy          - Payments per year (12 or 26)
 * @param extraPayment - Extra amount added each period
 * @param lumpSumYear  - Year in which lump sum is applied (0 = none)
 * @param lumpSumAmount - Lump sum amount
 */
export function calcAmortization(
  loan: number,
  annualRate: number,
  termYears: number,
  ppy: number,
  extraPayment = 0,
  lumpSumYear = 0,
  lumpSumAmount = 0
): AmortizationRow[] {
  if (loan <= 0) return [];

  const r = annualRate / 100 / ppy;
  const scheduledPayment = calcPayment(loan, annualRate, termYears, ppy);
  const maxPeriods = termYears * ppy;

  const rows: AmortizationRow[] = [];
  let balance = loan;
  let cumulativeInterest = 0;
  const startDate = new Date();
  startDate.setDate(1);

  const lumpSumPeriod = lumpSumYear > 0 ? lumpSumYear * (ppy === 12 ? 12 : 26) : -1;

  for (let i = 1; i <= maxPeriods && balance > 0.005; i++) {
    const periodDate = new Date(startDate);
    if (ppy === 12) {
      periodDate.setMonth(periodDate.getMonth() + i);
    } else {
      periodDate.setDate(periodDate.getDate() + i * 14);
    }

    const interestCharge = balance * r;
    let principalComponent = scheduledPayment - interestCharge;

    // Clamp principal to remaining balance
    if (principalComponent > balance) principalComponent = balance;

    const extra = Math.min(extraPayment, Math.max(0, balance - principalComponent));
    const isLumpSum = i === lumpSumPeriod && lumpSumAmount > 0;
    const lump = isLumpSum ? Math.min(lumpSumAmount, Math.max(0, balance - principalComponent - extra)) : 0;

    const totalExtra = extra + lump;
    const totalPayment = scheduledPayment + totalExtra;
    const totalPrincipal = principalComponent + totalExtra;

    cumulativeInterest += interestCharge;
    const closingBalance = Math.max(0, balance - totalPrincipal);

    rows.push({
      period: i,
      date: periodDate,
      openingBalance: balance,
      scheduledPayment,
      extraPayment: totalExtra,
      totalPayment,
      principal: totalPrincipal,
      interest: interestCharge,
      closingBalance,
      cumulativeInterest,
      isLumpSum,
    });

    balance = closingBalance;
  }

  return rows;
}

/**
 * Full mortgage summary calculation.
 */
export function calcMortgageSummary(inputs: MortgageInputs): MortgageResult {
  const {
    purchasePrice,
    deposit,
    interestRate,
    termYears,
    frequency,
    extraPayment,
    lumpSumYear,
    lumpSumAmount,
    monthlyServiceFee,
    initiationFee,
    initiationFeeCapitalised,
    bondRegistrationIncluded,
  } = inputs;

  // Loan principal before any capitalised once-off fees are rolled in.
  const baseLoan = Math.max(0, purchasePrice - deposit) + (initiationFeeCapitalised ? initiationFee : 0);
  const bondRegCost = calcBondRegistrationCost(baseLoan);
  const loanAmount = baseLoan + (bondRegistrationIncluded ? bondRegCost : 0);
  const depositPercent = purchasePrice > 0 ? (deposit / purchasePrice) * 100 : 0;

  // ── Standard monthly schedule ─────────────────────────────
  const ppy = 12;
  const standardPayment = calcPayment(loanAmount, interestRate, termYears, ppy);
  const amortization = calcAmortization(loanAmount, interestRate, termYears, ppy, 0, 0, 0);
  const totalPaidStandard = amortization.reduce((s, r) => s + r.totalPayment, 0);
  const totalInterestStandard = amortization.length > 0
    ? amortization[amortization.length - 1].cumulativeInterest
    : 0;

  // ── With extra payments / lump sum ───────────────────────
  const amortizationWithExtras = calcAmortization(
    loanAmount,
    interestRate,
    termYears,
    ppy,
    extraPayment,
    lumpSumYear,
    lumpSumAmount
  );
  const totalPaidWithExtras = amortizationWithExtras.reduce((s, r) => s + r.totalPayment, 0);
  const totalInterestWithExtras = amortizationWithExtras.length > 0
    ? amortizationWithExtras[amortizationWithExtras.length - 1].cumulativeInterest
    : 0;

  const interestSaved = Math.max(0, totalInterestStandard - totalInterestWithExtras);
  const monthsSaved = Math.max(0, amortization.length - amortizationWithExtras.length);

  // ── Bi-weekly schedule ───────────────────────────────────
  const biweeklyPPY = 26;
  const biweeklyPayment = calcPayment(loanAmount, interestRate, termYears, biweeklyPPY);
  const amortizationBiweekly = calcAmortization(loanAmount, interestRate, termYears, biweeklyPPY, 0, 0, 0);
  const totalInterestBiweekly = amortizationBiweekly.length > 0
    ? amortizationBiweekly[amortizationBiweekly.length - 1].cumulativeInterest
    : 0;
  const interestSavedBiweekly = Math.max(0, totalInterestStandard - totalInterestBiweekly);
  const monthsSavedBiweekly = Math.max(
    0,
    (amortization.length - amortizationBiweekly.length) / (biweeklyPPY / 12)
  );

  // ── Payoff dates ─────────────────────────────────────────
  const now = new Date();
  const payoffDate = new Date(now);
  payoffDate.setMonth(payoffDate.getMonth() + amortization.length);

  const payoffDateWithExtras = new Date(now);
  payoffDateWithExtras.setMonth(payoffDateWithExtras.getMonth() + amortizationWithExtras.length);

  // Choose which amortization to use based on frequency
  const activeAmortization = frequency === 'biweekly'
    ? amortizationBiweekly
    : amortization;

  // ── Service fee totals ───────────────────────────────────
  // Fee applies for the life of the active schedule; doesn't reduce principal
  const fee = monthlyServiceFee ?? 0;
  const totalServiceFees = fee * activeAmortization.length;
  const effectiveMonthlyPayment = (frequency === 'biweekly' ? biweeklyPayment : standardPayment) + fee;
  const totalCostIncludingFees = totalPaidStandard + totalServiceFees;

  return {
    loanAmount,
    bondRegCost,
    depositPercent,
    standardPayment: frequency === 'biweekly' ? biweeklyPayment : standardPayment,
    totalPaidStandard,
    totalInterestStandard,
    totalPaidWithExtras,
    totalInterestWithExtras,
    interestSaved,
    monthsSaved,
    biweeklyPayment,
    totalInterestBiweekly,
    interestSavedBiweekly,
    monthsSavedBiweekly,
    payoffDate,
    payoffDateWithExtras,
    amortization: activeAmortization,
    amortizationWithExtras,
    totalServiceFees,
    effectiveMonthlyPayment,
    totalCostIncludingFees,
  };
}
