import type { InvestingInputs, InvestingResult, InvestingRow } from '../types';
import { calcPayment, calcAmortization } from './mortgage';

/**
 * Compare putting extra payments toward the bond vs investing the same amount.
 *
 * Scenario A: Extra payment reduces bond faster → saves interest
 * Scenario B: Extra payment is invested at expected return rate
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

  // ── Scenario B: Invest instead ────────────────────────────
  // Invest extra each month for the duration until bond is paid off (standard term)
  // Use standard payoff date as the comparison horizon
  const monthlyInvestReturn = expectedReturn / 100 / 12;

  // Portfolio value at the standard payoff date
  let portfolioValue = 0;
  for (let m = 1; m <= standardMonths; m++) {
    portfolioValue = (portfolioValue + extraMonthlyAmount) * (1 + monthlyInvestReturn);
  }

  // After-tax: CGT applies to gains only (SA: 40% inclusion × marginal rate)
  const totalContributions = extraMonthlyAmount * standardMonths;
  const gain = Math.max(0, portfolioValue - totalContributions);
  const cgtPayable = gain * (cgtRate / 100);
  const afterTaxPortfolioValue = portfolioValue - cgtPayable;

  const netBenefitB = afterTaxPortfolioValue - interestSaved;

  const winner: 'bond' | 'investing' = afterTaxPortfolioValue > interestSaved ? 'investing' : 'bond';
  const winnerAmount = Math.abs(afterTaxPortfolioValue - interestSaved);

  // ── Year-by-year comparison table ────────────────────────
  const yearByYear: InvestingRow[] = [];
  const maxYears = Math.ceil(standardMonths / 12);

  for (let year = 1; year <= maxYears; year++) {
    // Bond balance in Scenario A (with extra payments)
    const monthA = year * 12;
    let bondBalA = 0;
    if (monthA < amortWithExtra.length) {
      bondBalA = amortWithExtra[Math.min(monthA, amortWithExtra.length) - 1]?.closingBalance ?? 0;
    }

    // Bond balance in Scenario B (standard payments, no extra)
    let bondBalB = 0;
    if (monthA < standardAmort.length) {
      bondBalB = standardAmort[Math.min(monthA, standardAmort.length) - 1]?.closingBalance ?? 0;
    }

    // Investment portfolio value in Scenario B at year
    let invValue = 0;
    for (let m = 1; m <= Math.min(year * 12, standardMonths); m++) {
      invValue = (invValue + extraMonthlyAmount) * (1 + monthlyInvestReturn);
    }
    // Apply CGT if past payoff
    const contribSoFar = extraMonthlyAmount * Math.min(year * 12, standardMonths);
    const gainSoFar = Math.max(0, invValue - contribSoFar);
    const taxSoFar = gainSoFar * (cgtRate / 100);
    const invValueAfterTax = invValue - taxSoFar;

    // Net difference: (interest saved so far by A) vs (investment value so far by B)
    const interestSavedSoFar = year * 12 <= standardMonths
      ? (standardAmort[Math.min(year * 12, standardAmort.length) - 1]?.cumulativeInterest ?? 0) -
        (amortWithExtra[Math.min(year * 12, amortWithExtra.length) - 1]?.cumulativeInterest ?? 0)
      : interestSaved;

    const netDiff = invValueAfterTax - Math.max(0, interestSavedSoFar);
    const rowWinner: 'A' | 'B' = netDiff > 0 ? 'B' : 'A';

    yearByYear.push({
      year,
      bondBalanceA: Math.round(Math.max(0, bondBalA)),
      bondBalanceB: Math.round(Math.max(0, bondBalB)),
      investmentValue: Math.round(Math.max(0, invValueAfterTax)),
      netDifference: Math.round(netDiff),
      winner: rowWinner,
    });
  }

  // ── Find break-even year ──────────────────────────────────
  // Already embedded in yearByYear winner column

  return {
    interestSaved,
    monthsSaved,
    newPayoffDate,
    standardPayoffDate,
    effectiveReturnA,
    portfolioValueAtPayoff: portfolioValue,
    afterTaxPortfolioValue,
    netBenefitB,
    winner,
    winnerAmount,
    yearByYear,
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
