export interface RetirementIncomeInputs {
  currentAge:             number;
  retirementAge:          number;
  desiredMonthlyIncome:   number; // in today's Rands
  swr:                    number; // safe withdrawal rate, e.g. 0.04
  currentSavings:         number;
  annualReturnPercent:    number;
  annualInflationPercent: number;
  contributionEscalation: number; // annual % increase in monthly contribution
}

export interface RetirementYearRow {
  year:        number;
  balance:     number;
  contributed: number;
  returns:     number;
}

export interface DrawdownYearRow {
  year:    number;
  age:     number;
  balance: number;
}

export interface RetirementIncomeResult {
  years:               number;
  futureAnnualIncome:  number; // desired annual income, inflated to the retirement year
  lumpSumTarget:       number; // nest egg required at retirement to sustain that income at the chosen SWR
  realLumpSumTarget:   number; // lumpSumTarget expressed in today's Rands
  requiredMonthly:     number; // monthly contribution needed to reach lumpSumTarget by retirement
  finalBalance:        number;
  totalContrib:        number;
  totalReturns:        number;
  chartData:           RetirementYearRow[];
  drawdown:            DrawdownYearRow[];
  depletionAge:        number | null; // age at which the nest egg runs out, or null if it lasts the full horizon
}

export interface RetirementAffordabilityInputs {
  currentAge:             number;
  retirementAge:          number;
  currentMonthlyIncome:   number; // in today's Rands
  savingsRatePercent:     number; // % of current income invested monthly
  swr:                    number;
  currentSavings:         number;
  annualReturnPercent:    number;
  annualInflationPercent: number;
  contributionEscalation: number;
}

export interface RetirementAffordabilityResult {
  years:                         number;
  monthlyContribution:           number; // currentMonthlyIncome * savingsRatePercent, today's Rands
  finalBalance:                  number;
  totalContrib:                  number;
  totalReturns:                  number;
  chartData:                     RetirementYearRow[];
  achievableMonthlyIncomeFuture: number; // in retirement-year Rands
  achievableMonthlyIncomeToday:  number; // deflated to today's Rands, for comparison with current income
  incomeReplacementPct:          number; // achievableMonthlyIncomeToday / currentMonthlyIncome * 100
  drawdown:                      DrawdownYearRow[];
  depletionAge:                  number | null;
}

const DRAWDOWN_HORIZON_YEARS = 40;

/** Grows a lump sum + escalating monthly contributions over `years` at `annualRate`. */
export function simulateRetirementSavings(
  basePMT:       number,
  years:         number,
  annualRate:    number,
  lumpSum:       number,
  escalationPct: number = 0,
): { chartData: RetirementYearRow[]; finalBalance: number } {
  const monthlyRate = annualRate / 100 / 12;
  let balance = lumpSum;
  let totalContributed = lumpSum;
  const chartData: RetirementYearRow[] = [];

  for (let y = 1; y <= years; y++) {
    const pmt = basePMT * Math.pow(1 + escalationPct / 100, y - 1);
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + pmt;
      totalContributed += pmt;
    }
    chartData.push({
      year:        y,
      balance:     Math.round(balance),
      contributed: Math.round(totalContributed),
      returns:     Math.round(balance - totalContributed),
    });
  }
  return { chartData, finalBalance: balance };
}

/** Binary search for the monthly contribution needed to reach `target` by `years`. */
export function findRequiredMonthly(
  target:        number,
  years:         number,
  annualRate:    number,
  lumpSum:       number,
  escalationPct: number = 0,
): number {
  if (lumpSum >= target) return 0;
  let lo = 0, hi = target;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const { finalBalance } = simulateRetirementSavings(mid, years, annualRate, lumpSum, escalationPct);
    if (finalBalance < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Simulates drawing down a nest egg in retirement: withdraws `monthlyIncome` (escalating
 * with inflation so real income stays constant) while the remaining balance keeps growing
 * at `annualRate`. Stops early if the balance is depleted.
 */
export function simulateDrawdown(
  startBalance:         number,
  monthlyIncome:        number,
  annualRate:           number,
  annualInflationPct:   number,
  retirementAge:        number,
  horizonYears:          number = DRAWDOWN_HORIZON_YEARS,
): { rows: DrawdownYearRow[]; depletionAge: number | null } {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyInfl = annualInflationPct / 100 / 12;
  let balance = startBalance;
  let withdrawal = monthlyIncome;
  const rows: DrawdownYearRow[] = [];
  let depletionAge: number | null = null;

  for (let y = 1; y <= horizonYears; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) - withdrawal;
      withdrawal *= (1 + monthlyInfl);
      if (balance <= 0) {
        balance = 0;
        if (depletionAge === null) depletionAge = retirementAge + y - 1 + m / 12;
        break;
      }
    }
    rows.push({ year: y, age: retirementAge + y, balance: Math.round(balance) });
    if (balance <= 0) break;
  }
  return { rows, depletionAge: depletionAge !== null ? Math.round(depletionAge) : null };
}

/**
 * Converts a desired retirement income into a required monthly contribution:
 * income -> inflated future annual income -> lump sum (via SWR) -> monthly contribution (via binary search).
 * Also simulates the post-retirement drawdown to check the nest egg actually sustains that income.
 */
export function calcRetirementIncomeGoal(inputs: RetirementIncomeInputs): RetirementIncomeResult {
  const years = Math.max(1, inputs.retirementAge - inputs.currentAge);
  const infR  = inputs.annualInflationPercent / 100;

  const futureAnnualIncome = inputs.desiredMonthlyIncome * 12 * Math.pow(1 + infR, years);
  const lumpSumTarget      = inputs.swr > 0 ? futureAnnualIncome / inputs.swr : 0;
  const realLumpSumTarget  = lumpSumTarget / Math.pow(1 + infR, years);

  const requiredMonthly = findRequiredMonthly(
    lumpSumTarget, years, inputs.annualReturnPercent, inputs.currentSavings, inputs.contributionEscalation,
  );
  const { chartData, finalBalance } = simulateRetirementSavings(
    requiredMonthly, years, inputs.annualReturnPercent, inputs.currentSavings, inputs.contributionEscalation,
  );
  const totalContrib = chartData[chartData.length - 1]?.contributed ?? inputs.currentSavings;
  const totalReturns = finalBalance - totalContrib;

  const futureMonthlyIncome = futureAnnualIncome / 12;
  const { rows: drawdown, depletionAge } = simulateDrawdown(
    finalBalance, futureMonthlyIncome, inputs.annualReturnPercent, inputs.annualInflationPercent, inputs.retirementAge,
  );

  return {
    years, futureAnnualIncome, lumpSumTarget, realLumpSumTarget,
    requiredMonthly, finalBalance, totalContrib, totalReturns, chartData,
    drawdown, depletionAge,
  };
}

/**
 * The reverse direction: given current income and a savings rate, computes the achievable
 * retirement income. monthly contribution -> nest egg at retirement (forward simulation) ->
 * achievable income (via SWR) -> deflated to today's Rands for comparison with current income.
 */
export function calcRetirementAffordability(inputs: RetirementAffordabilityInputs): RetirementAffordabilityResult {
  const years = Math.max(1, inputs.retirementAge - inputs.currentAge);
  const infR  = inputs.annualInflationPercent / 100;

  const monthlyContribution = inputs.currentMonthlyIncome * (inputs.savingsRatePercent / 100);

  const { chartData, finalBalance } = simulateRetirementSavings(
    monthlyContribution, years, inputs.annualReturnPercent, inputs.currentSavings, inputs.contributionEscalation,
  );
  const totalContrib = chartData[chartData.length - 1]?.contributed ?? inputs.currentSavings;
  const totalReturns = finalBalance - totalContrib;

  const achievableAnnualIncomeFuture  = finalBalance * inputs.swr;
  const achievableMonthlyIncomeFuture = achievableAnnualIncomeFuture / 12;
  const achievableMonthlyIncomeToday  = achievableMonthlyIncomeFuture / Math.pow(1 + infR, years);
  const incomeReplacementPct = inputs.currentMonthlyIncome > 0
    ? (achievableMonthlyIncomeToday / inputs.currentMonthlyIncome) * 100
    : 0;

  const { rows: drawdown, depletionAge } = simulateDrawdown(
    finalBalance, achievableMonthlyIncomeFuture, inputs.annualReturnPercent, inputs.annualInflationPercent, inputs.retirementAge,
  );

  return {
    years, monthlyContribution, finalBalance, totalContrib, totalReturns, chartData,
    achievableMonthlyIncomeFuture, achievableMonthlyIncomeToday, incomeReplacementPct,
    drawdown, depletionAge,
  };
}
