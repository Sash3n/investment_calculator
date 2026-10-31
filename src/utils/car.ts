import type { CarAmortizationRow, CarInputs, CarResult } from '../types';

/** Monthly instalment that runs a loan down to a balloon left over after n months. */
export function balloonInstalment(loan: number, annualRatePct: number, months: number, balloon: number): number {
  if (months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return Math.max(0, loan - balloon) / months;
  const growth = Math.pow(1 + r, months);
  return Math.max(0, ((loan - balloon / growth) * r) / (1 - 1 / growth));
}

/**
 * Calculate car finance details including depreciation and total cost of ownership.
 *
 * SA balloon payment: a percentage of the purchase price deferred to the end.
 * The whole loan carries interest; the instalments run it down to the balloon,
 * which is then due as a lump sum at the end of the term.
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
  // Amount repaid through instalments (loan less balloon); the balloon itself still earns interest
  const calculatedInstalment = balloonInstalment(loanAmount, interestRate, termMonths, Math.min(balloonAmount, loanAmount));

  // Use the higher of our calculated payment or the bank's quoted minimum.
  // When the bank minimum is higher, the surplus goes to principal — pays off faster.
  const minFloor = minimumInstalment ?? 0;
  const monthlyInstalment = Math.max(calculatedInstalment, minFloor);
  const instalmentOverride = minFloor > calculatedInstalment && minFloor > 0;

  const monthlyRate = interestRate / 100 / 12;
  const balloonDue = Math.min(balloonAmount, loanAmount);

  // ── Amortisation down to the balloon ─────────────────────
  function buildAmortization(basePayment: number, extra: number): CarAmortizationRow[] {
    const rows: CarAmortizationRow[] = [];
    let bal = loanAmount;
    let cumInt = 0;
    let period = 1;
    while (bal - balloonDue > 0.005 && period <= termMonths) {
      const intCharge = bal * monthlyRate;
      const totalPayment = Math.min(basePayment + extra, bal + intCharge - balloonDue);
      const prinPaid = totalPayment - intCharge;
      cumInt += intCharge;
      const closing = Math.max(balloonDue, bal - prinPaid);
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

  // Total repayments = instalments + the balloon (or what is left) at the end
  const lastRow = amortization[amortization.length - 1];
  const remainingAtEnd = lastRow ? lastRow.closingBalance : loanAmount;
  const totalInstalments = amortization.reduce((sum, row) => sum + row.payment, 0);
  const totalRepayments = totalInstalments + remainingAtEnd;
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

  // Loan balance after a month's payment; the balloon is settled at the end of the term
  const loanBalanceAtMonth = (month: number): number => {
    if (month >= termMonths) return 0;
    if (month <= 0) return loanAmount;
    return amortization[month - 1]?.closingBalance ?? balloonDue;
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

  // ── Extra payments: the balance reaches the balloon sooner, and the balloon is settled then ──
  const extraLast = amortizationWithExtras[amortizationWithExtras.length - 1];
  const actualTermMonths = extraMonthlyPayment > 0 ? amortizationWithExtras.length : termMonths;
  const totalInterestWithExtra = extraMonthlyPayment > 0
    ? (extraLast?.cumulativeInterest ?? 0)
    : totalInterest;
  const totalPaidWithExtra = amortizationWithExtras.reduce((sum, row) => sum + row.payment, 0)
    + (extraLast ? extraLast.closingBalance : loanAmount);
  const interestSaved = Math.max(0, totalInterest - totalInterestWithExtra);
  const monthsSaved = termMonths - actualTermMonths;

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
