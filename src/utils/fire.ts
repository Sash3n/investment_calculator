/**
 * Years until the portfolio covers expenses at the withdrawal rate. Expenses grow
 * with inflation, so the target is compared month by month with expenses at that time.
 */
export function yearsToFire(
  currentSavings:    number,
  monthlyContrib:    number,
  annualReturn:      number,
  annualExpensesNow: number,
  annualInflation:   number,
  swr:               number,
): number {
  const r = annualReturn / 100 / 12;
  const target = (month: number) => (annualExpensesNow * Math.pow(1 + annualInflation / 100, month / 12)) / swr;
  let balance = currentSavings;
  if (balance >= target(0)) return 0;
  for (let month = 1; month <= 12 * 100; month++) {
    balance = balance * (1 + r) + monthlyContrib;
    if (balance >= target(month)) return month / 12;
  }
  return Infinity;
}
