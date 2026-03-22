import type { CarAmortizationRow, CarInputs, CarResult } from '../types';
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
    minimumInstalment,
    extraMonthlyPayment,
    monthlyServiceFee,
    monthlyInsurance,
    monthlyFuel,
    monthlyMaintenance,
  } = inputs;

  const loanAmount = Math.max(0, vehiclePrice - deposit);
  const balloonAmount = vehiclePrice * (balloonPercent / 100);

  // Amount that must be repaid in monthly instalments (loan minus balloon)
  const financedAmount = Math.max(0, loanAmount - balloonAmount);

  const termYears = termMonths / 12;
  const calculatedInstalment = calcPayment(financedAmount, interestRate, termYears, 12);

  // Use the higher of our calculated payment or the bank's quoted minimum.
  // When the bank minimum is higher, the surplus goes to principal — pays off faster.
  const minFloor = minimumInstalment ?? 0;
  const monthlyInstalment = Math.max(calculatedInstalment, minFloor);
  const instalmentOverride = minFloor > calculatedInstalment && minFloor > 0;

  // Total repayments = instalments + balloon at end
  const totalInstalments = monthlyInstalment * termMonths;
  const totalRepayments = totalInstalments + balloonAmount;
  const totalInterest = Math.max(0, totalRepayments - loanAmount);

  // ── Total cost of ownership over term ────────────────────
  const totalInsurance = monthlyInsurance * termMonths;
  const totalFuel = monthlyFuel * termMonths;
  const totalMaintenance = monthlyMaintenance * termMonths;
  const fee = monthlyServiceFee ?? 0;
  const totalServiceFees = fee * termMonths;
  const effectiveMonthlyPayment = monthlyInstalment + fee;
  const totalCostOfOwnership = totalRepayments + totalInsurance + totalFuel + totalMaintenance + deposit + totalServiceFees;

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

  // ── Extra payment amortization ───────────────────────────
  let extraBal = financedAmount;
  let totalInterestWithExtra = 0;
  let actualTermMonths = termMonths;

  if (extraMonthlyPayment > 0 && financedAmount > 0 && monthlyRate > 0) {
    extraBal = financedAmount;
    actualTermMonths = 0;
    while (extraBal > 0.01 && actualTermMonths < termMonths) {
      const intCharge = extraBal * monthlyRate;
      const payment = Math.min(monthlyInstalment + extraMonthlyPayment, extraBal + intCharge);
      const prinPaid = payment - intCharge;
      totalInterestWithExtra += intCharge;
      extraBal = Math.max(0, extraBal - prinPaid);
      actualTermMonths++;
    }
  } else {
    totalInterestWithExtra = totalInterest;
    actualTermMonths = termMonths;
  }

  // With balloon: balloon is still due at the actual payoff point, interest on balloon portion saved = difference
  const totalPaidWithExtra = monthlyInstalment * actualTermMonths
    + extraMonthlyPayment * actualTermMonths
    + balloonAmount;
  const interestSaved = Math.max(0, totalInterest - totalInterestWithExtra);
  const monthsSaved = termMonths - actualTermMonths;

  // ── Full amortization schedules ──────────────────────────
  function buildAmortization(basePayment: number, extra: number): CarAmortizationRow[] {
    const rows: CarAmortizationRow[] = [];
    let bal = financedAmount;
    let cumInt = 0;
    let period = 1;
    while (bal > 0.005 && period <= termMonths) {
      const intCharge = bal * monthlyRate;
      const totalPayment = Math.min(basePayment + extra, bal + intCharge);
      const prinPaid = totalPayment - intCharge;
      cumInt += intCharge;
      const closing = Math.max(0, bal - prinPaid);
      rows.push({
        period,
        openingBalance: bal,
        payment: totalPayment,
        principal: prinPaid,
        interest: intCharge,
        closingBalance: closing,
        cumulativeInterest: cumInt,
      });
      bal = closing;
      period++;
    }
    return rows;
  }

  const amortization = buildAmortization(monthlyInstalment, 0);
  const amortizationWithExtras = extraMonthlyPayment > 0
    ? buildAmortization(monthlyInstalment, extraMonthlyPayment)
    : amortization;

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
    calculatedInstalment,
    monthlyInstalment,
    instalmentOverride,
    totalRepayments,
    totalInterest,
    totalInterestWithExtra,
    totalPaidWithExtra,
    interestSaved,
    monthsSaved,
    actualTermMonths,
    totalServiceFees,
    effectiveMonthlyPayment,
    totalCostOfOwnership,
    effectiveAnnualCost,
    depreciation,
    underwaterMonths,
    cashPurchaseOpportunityCost,
    netCostFinancing,
    netCostCash,
    amortization,
    amortizationWithExtras,
  };
}
