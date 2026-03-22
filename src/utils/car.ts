import type { CarInputs, CarResult } from '../types';
import { calcPayment } from './mortgage';

/**
 * Calculate car finance details including depreciation and total cost of ownership.
 *
 * SA balloon payment: a percentage of the purchase price deferred to the end.
 * Monthly instalment is calculated on (financed amount - balloon) over term,
 * then balloon becomes a lump sum due at maturity.
 */
export function calcCarFinance(inputs: CarInputs): CarResult {
  const {
    vehiclePrice,
    deposit,
    balloonPercent,
    interestRate,
    termMonths,
    monthlyInsurance,
    monthlyFuel,
    monthlyMaintenance,
  } = inputs;

  const loanAmount = Math.max(0, vehiclePrice - deposit);
  const balloonAmount = vehiclePrice * (balloonPercent / 100);

  // Amount that must be repaid in monthly instalments (loan minus balloon)
  const financedAmount = Math.max(0, loanAmount - balloonAmount);

  const termYears = termMonths / 12;
  const monthlyInstalment = calcPayment(financedAmount, interestRate, termYears, 12);

  // Total repayments = instalments + balloon at end
  const totalInstalments = monthlyInstalment * termMonths;
  const totalRepayments = totalInstalments + balloonAmount;
  const totalInterest = Math.max(0, totalRepayments - loanAmount);

  // ── Total cost of ownership over term ────────────────────
  const totalInsurance = monthlyInsurance * termMonths;
  const totalFuel = monthlyFuel * termMonths;
  const totalMaintenance = monthlyMaintenance * termMonths;
  const totalCostOfOwnership = totalRepayments + totalInsurance + totalFuel + totalMaintenance + deposit;

  // ── Effective annual cost ─────────────────────────────────
  const effectiveAnnualCost = totalCostOfOwnership / termYears;

  // ── Depreciation schedule ─────────────────────────────────
  // Year 1: 15%, Year 2: 12%, Year 3+: 10%
  const depRates = [0.15, 0.12, 0.10, 0.10, 0.10, 0.10, 0.10];
  const depYears = Math.ceil(termYears) + 1;

  const depreciation: CarResult['depreciation'] = [];
  let currentValue = vehiclePrice;

  // Monthly loan balance calculation
  const monthlyRate = interestRate / 100 / 12;
  const loanBalanceAtMonth = (month: number): number => {
    if (financedAmount <= 0) return balloonAmount;
    if (monthlyRate === 0) {
      return Math.max(balloonAmount, financedAmount - monthlyInstalment * month + balloonAmount);
    }
    // Standard remaining balance formula
    const remaining = financedAmount *
      (Math.pow(1 + monthlyRate, termMonths) - Math.pow(1 + monthlyRate, month)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);
    return Math.max(0, remaining + (month >= termMonths ? 0 : balloonAmount));
  };

  for (let y = 0; y <= depYears; y++) {
    if (y > 0) {
      const depRate = depRates[Math.min(y - 1, depRates.length - 1)];
      currentValue = currentValue * (1 - depRate);
    }
    const month = y * 12;
    const loanBalance = month <= termMonths ? loanBalanceAtMonth(Math.min(month, termMonths)) : 0;
    depreciation.push({
      year: y,
      value: Math.round(Math.max(0, currentValue)),
      loanBalance: Math.round(loanBalance),
    });
  }

  // ── Underwater months (balance > value) ──────────────────
  let underwaterMonths = 0;
  for (let m = 1; m <= termMonths; m++) {
    const yearFraction = m / 12;
    let val = vehiclePrice;
    const fullYears = Math.floor(yearFraction);
    for (let y = 0; y < fullYears && y < depRates.length; y++) {
      val *= (1 - depRates[y]);
    }
    // Partial year linear interpolation
    const partialYear = yearFraction - fullYears;
    if (partialYear > 0 && fullYears < depRates.length) {
      val *= (1 - depRates[fullYears] * partialYear);
    }
    const bal = loanBalanceAtMonth(m);
    if (bal > val) underwaterMonths++;
  }

  // ── Finance vs Cash comparison ───────────────────────────
  // Cash purchase: invest the monthly instalment at 10% p.a.
  // Opportunity cost = future value of deposit + instalments invested at 10%
  const investRate = 0.10 / 12;
  let cashOpportunity = 0;
  // FV of lump sum deposit
  cashOpportunity = deposit * Math.pow(1 + investRate, termMonths);
  // FV of monthly instalments invested
  cashOpportunity += monthlyInstalment * ((Math.pow(1 + investRate, termMonths) - 1) / investRate);

  const cashPurchaseOpportunityCost = cashOpportunity;
  const netCostFinancing = totalCostOfOwnership;
  // Cash purchase: price + running costs, but capital was forfeited
  const netCostCash = vehiclePrice + totalInsurance + totalFuel + totalMaintenance + cashOpportunity - vehiclePrice;

  return {
    loanAmount,
    balloonAmount,
    financedAmount,
    monthlyInstalment,
    totalRepayments,
    totalInterest,
    totalCostOfOwnership,
    effectiveAnnualCost,
    depreciation,
    underwaterMonths,
    cashPurchaseOpportunityCost,
    netCostFinancing,
    netCostCash,
  };
}
