export interface RetirementIncomeInputs {
  currentAge:             number;
  retirementAge:          number;
  desiredMonthlyIncome:   number; // in today's Rands
  swr:                    number; // safe withdrawal rate, e.g. 0.04
  currentSavings:         number;
  annualReturnPercent:    number;
  annualInflationPercent: number;
}

export interface RetirementYearRow {
  year:        number;
  balance:     number;
  contributed: number;
  returns:     number;
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
}

/** Grows a lump sum + monthly contributions over `years` at `annualRate`. */
export function simulateRetirementSavings(
  basePMT:    number,
  years:      number,
  annualRate: number,
  lumpSum:    number,
): { chartData: RetirementYearRow[]; finalBalance: number } {
  const monthlyRate = annualRate / 100 / 12;
  let balance = lumpSum;
  let totalContributed = lumpSum;
  const chartData: RetirementYearRow[] = [];

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + basePMT;
      totalContributed += basePMT;
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
  target:     number,
  years:      number,
  annualRate: number,
  lumpSum:    number,
): number {
  if (lumpSum >= target) return 0;
  let lo = 0, hi = target;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const { finalBalance } = simulateRetirementSavings(mid, years, annualRate, lumpSum);
    if (finalBalance < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Converts a desired retirement income into a required monthly contribution:
 * income -> inflated future annual income -> lump sum (via SWR) -> monthly contribution (via binary search).
 */
export function calcRetirementIncomeGoal(inputs: RetirementIncomeInputs): RetirementIncomeResult {
  const years = Math.max(1, inputs.retirementAge - inputs.currentAge);
  const infR  = inputs.annualInflationPercent / 100;

  const futureAnnualIncome = inputs.desiredMonthlyIncome * 12 * Math.pow(1 + infR, years);
  const lumpSumTarget      = inputs.swr > 0 ? futureAnnualIncome / inputs.swr : 0;
  const realLumpSumTarget  = lumpSumTarget / Math.pow(1 + infR, years);

  const requiredMonthly = findRequiredMonthly(lumpSumTarget, years, inputs.annualReturnPercent, inputs.currentSavings);
  const { chartData, finalBalance } = simulateRetirementSavings(requiredMonthly, years, inputs.annualReturnPercent, inputs.currentSavings);
  const totalContrib = chartData[chartData.length - 1]?.contributed ?? inputs.currentSavings;
  const totalReturns = finalBalance - totalContrib;

  return {
    years, futureAnnualIncome, lumpSumTarget, realLumpSumTarget,
    requiredMonthly, finalBalance, totalContrib, totalReturns, chartData,
  };
}
