import type { InvestingInputs, InvestingResult, InvestingRow } from '../types';
import { calcPayment, calcAmortization } from './mortgage';

/**
 * Compare putting extra payments toward the bond vs investing the same amount.
 *
 * Both routes spend the same cash every month (the standard instalment plus the
 * extra amount) until the original payoff date, and are compared on what you
 * own at that date.
 *
 * Scenario A: the extra goes into the bond. Once the bond is paid off early, the
 *             whole monthly amount is invested at the expected return.
 * Scenario B: the extra is invested every month while the bond runs its full term.
 *
 * Investments in both routes grow at the expected return and pay CGT on their
 * gain (cgtRate is the effective rate on the whole gain).
 */
export function calcExtraPaymentVsInvesting(inputs: InvestingInputs): InvestingResult {
  const {
    loanBalance,
    interestRate,
    remainingTermYears,
    extraMonthlyAmount,
    expectedReturn,
    cgtRate,
  } = inputs;

  // ── Standard payoff (no extra) ────────────────────────────
  const standardAmort = calcAmortization(loanBalance, interestRate, remainingTermYears, 12, 0, 0, 0);
  const standardMonths = standardAmort.length;
  const totalInterestStandard = standardAmort.length > 0
    ? standardAmort[standardAmort.length - 1].cumulativeInterest
    : 0;

  // ── Scenario A: Extra to bond ─────────────────────────────
  const amortWithExtra = calcAmortization(loanBalance, interestRate, remainingTermYears, 12, extraMonthlyAmount, 0, 0);
  const monthsWithExtra = amortWithExtra.length;
  const totalInterestWithExtra = amortWithExtra.length > 0
    ? amortWithExtra[amortWithExtra.length - 1].cumulativeInterest
    : 0;

  const interestSaved = Math.max(0, totalInterestStandard - totalInterestWithExtra);
  const monthsSaved = Math.max(0, standardMonths - monthsWithExtra);

  const now = new Date();
  const standardPayoffDate = new Date(now);
  standardPayoffDate.setMonth(standardPayoffDate.getMonth() + standardMonths);
  const newPayoffDate = new Date(now);
  newPayoffDate.setMonth(newPayoffDate.getMonth() + monthsWithExtra);

  const effectiveReturnA = interestRate; // Bond interest rate is the guaranteed return

  // ── Month-by-month portfolios for both routes ─────────────
  // Contributions go in at the start of the month and grow through it.
  const monthlyInvestReturn = expectedReturn / 100 / 12;
  const monthlyBudget = calcPayment(loanBalance, interestRate, remainingTermYears, 12) + extraMonthlyAmount;
  const afterTax = (value: number, contributed: number) =>
    value - Math.max(0, value - contributed) * (cgtRate / 100);

  const portfolioA: number[] = [0];   // index = month
  const contributedA: number[] = [0];
  const portfolioB: number[] = [0];
  const contributedB: number[] = [0];
  for (let m = 1; m <= standardMonths; m++) {
    // A: whatever the bond does not need this month (all of it after payoff)
    const bondPaymentA = amortWithExtra[m - 1]?.totalPayment ?? 0;
    const investA = Math.max(0, monthlyBudget - bondPaymentA);
    portfolioA[m] = (portfolioA[m - 1] + investA) * (1 + monthlyInvestReturn);
    contributedA[m] = contributedA[m - 1] + investA;
    // B: the extra amount, every month of the full term
    portfolioB[m] = (portfolioB[m - 1] + extraMonthlyAmount) * (1 + monthlyInvestReturn);
    contributedB[m] = contributedB[m - 1] + extraMonthlyAmount;
  }

  // ── Scenario B: Invest instead ────────────────────────────
  const portfolioValue = portfolioB[standardMonths] ?? 0;
  const afterTaxPortfolioValue = afterTax(portfolioValue, contributedB[standardMonths] ?? 0);

  // ── Scenario A after payoff ───────────────────────────────
  const bondRouteValue = afterTax(portfolioA[standardMonths] ?? 0, contributedA[standardMonths] ?? 0);

  // Both bonds are paid off by the comparison date, so wealth is the after-tax investments
  const netBenefitB = afterTaxPortfolioValue - bondRouteValue;
  const winner: 'bond' | 'investing' = netBenefitB > 0 ? 'investing' : 'bond';
  const winnerAmount = Math.abs(netBenefitB);

  // ── Year-by-year comparison table ────────────────────────
  const yearByYear: InvestingRow[] = [];
  const maxYears = Math.ceil(standardMonths / 12);

  for (let year = 1; year <= maxYears; year++) {
    const monthA = year * 12;
    const m = Math.min(monthA, standardMonths);

    // Bond balance in Scenario A (with extra payments)
    let bondBalA = 0;
    if (monthA < amortWithExtra.length) {
      bondBalA = amortWithExtra[Math.min(monthA, amortWithExtra.length) - 1]?.closingBalance ?? 0;
    }

    // Bond balance in Scenario B (standard payments, no extra)
    let bondBalB = 0;
    if (monthA < standardAmort.length) {
      bondBalB = standardAmort[Math.min(monthA, standardAmort.length) - 1]?.closingBalance ?? 0;
    }

    // Investments in each route if sold at this point (after CGT)
    const invValueA = afterTax(portfolioA[m], contributedA[m]);
    const invValueB = afterTax(portfolioB[m], contributedB[m]);

    // Net worth difference: (investments − bond still owed) of B minus the same for A
    const netDiff = (invValueB - Math.max(0, bondBalB)) - (invValueA - Math.max(0, bondBalA));
    const rowWinner: 'A' | 'B' = netDiff > 0 ? 'B' : 'A';

    yearByYear.push({
      year,
      bondBalanceA: Math.round(Math.max(0, bondBalA)),
      bondBalanceB: Math.round(Math.max(0, bondBalB)),
      investmentValue: Math.round(Math.max(0, invValueB)),
      bondRouteInvestmentValue: Math.round(Math.max(0, invValueA)),
      netDifference: Math.round(netDiff),
      winner: rowWinner,
    });
  }

  return {
    interestSaved,
    monthsSaved,
    newPayoffDate,
    standardPayoffDate,
    effectiveReturnA,
    bondRouteValue,
    portfolioValueAtPayoff: portfolioValue,
    afterTaxPortfolioValue,
    netBenefitB,
    winner,
    winnerAmount,
    yearByYear,
  };
}

/**
 * Expected return at which both routes end level: below it, paying into the bond
 * comes out ahead; above it, investing does. Returns 0 if investing is ahead at any
 * return, or null if it never catches up within `maxReturn` (or there is nothing to compare).
 */
export function findBreakEvenReturn(inputs: InvestingInputs, maxReturn = 40): number | null {
  if (inputs.extraMonthlyAmount <= 0 || inputs.loanBalance <= 0) return null;
  const gap = (r: number) => calcExtraPaymentVsInvesting({ ...inputs, expectedReturn: r }).netBenefitB;
  let lo = 0;
  let hi = maxReturn;
  if (gap(lo) > 0) return 0;
  if (gap(hi) <= 0) return null;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (gap(mid) > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/** Everything the Versus view shows, taken straight from the calculator's result. */
export interface VersusModel {
  extra: number;
  standardPayment: number;
  comparisonDate: Date;
  bond: { total: number; interestSaved: number; payoffDate: Date; monthsEarly: number; investsMonthly: number; rate: number };
  invest: { total: number; beforeTax: number; cgt: number; payoffDate: Date; rate: number };
  winner: 'bond' | 'investing';
  margin: number;
  breakEven: number | null;
}

export function buildVersusModel(
  inputs: InvestingInputs,
  result: InvestingResult = calcExtraPaymentVsInvesting(inputs),
  breakEven: number | null = findBreakEvenReturn(inputs),
): VersusModel {
  const standardPayment = calcStandardPayment(inputs.loanBalance, inputs.interestRate, inputs.remainingTermYears);
  return {
    extra: inputs.extraMonthlyAmount,
    standardPayment,
    comparisonDate: result.standardPayoffDate,
    bond: {
      total: result.bondRouteValue,
      interestSaved: result.interestSaved,
      payoffDate: result.newPayoffDate,
      monthsEarly: result.monthsSaved,
      investsMonthly: standardPayment + inputs.extraMonthlyAmount,
      rate: inputs.interestRate,
    },
    invest: {
      total: result.afterTaxPortfolioValue,
      beforeTax: result.portfolioValueAtPayoff,
      cgt: result.portfolioValueAtPayoff - result.afterTaxPortfolioValue,
      payoffDate: result.standardPayoffDate,
      rate: inputs.expectedReturn,
    },
    winner: result.winner,
    margin: result.winnerAmount,
    breakEven,
  };
}

/**
 * Standard payment for display in the component
 */
export function calcStandardPayment(
  loanBalance: number,
  interestRate: number,
  remainingTermYears: number
): number {
  return calcPayment(loanBalance, interestRate, remainingTermYears, 12);
}
