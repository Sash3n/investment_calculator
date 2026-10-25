/**
 * Retrenchment payouts: severance tax, notice pay and UIF benefits.
 */

/** Monthly remuneration ceiling for UIF contributions and benefits. */
export const UIF_INCOME_CAP = 17_712;
/** Most credit days a claimant can have: 365, built up over the previous four years. */
export const UIF_MAX_CREDIT_DAYS = 365;
/** Credit days paid at the income replacement rate; any after this are paid at 20%. */
export const UIF_FULL_RATE_DAYS = 238;

/** Retirement lump sum table, applied to severance together with earlier lump sums. */
export function calcLumpSumTax(lumpSum: number): number {
  if (lumpSum <= 550_000)   return 0;
  if (lumpSum <= 770_000)   return (lumpSum - 550_000) * 0.18;
  if (lumpSum <= 1_155_000) return 39_600 + (lumpSum - 770_000) * 0.27;
  return 143_550 + (lumpSum - 1_155_000) * 0.36;
}

/**
 * Minimum notice under section 37 of the Basic Conditions of Employment Act:
 * 1 week up to six months' service, 2 weeks up to a year, 4 weeks from a year.
 */
export function noticeWeeks(yearsService: number): 1 | 2 | 4 {
  if (yearsService <= 0.5) return 1;
  if (yearsService < 1) return 2;
  return 4;
}

export interface UIFBenefit {
  /** Pay used for the benefit, capped at the UIF ceiling, per day */
  dailyIncome: number;
  /** Income replacement rate, 38% to 60% */
  replacementRate: number;
  /** Benefit for a month at the full rate */
  monthlyBenefit: number;
  creditDays: number;
  weeksEntitled: number;
  /** Months the benefit lasts */
  months: number;
  /** All benefits over the claim, including any days paid at 20% */
  totalBenefit: number;
}

/**
 * UIF unemployment benefit (Unemployment Insurance Act, Schedule 2):
 * IRR = 29.2 + 7173.92 / (232.92 + daily income), between 38% and 60%.
 * One credit day for every four days worked, up to 365 days.
 */
export function calcUIF(monthlySalary: number, yearsService: number): UIFBenefit {
  const capped = Math.min(Math.max(0, monthlySalary), UIF_INCOME_CAP);
  const dailyIncome = (capped * 12) / 365;
  const irr = dailyIncome > 0
    ? Math.min(60, Math.max(38, 29.2 + 7173.92 / (232.92 + dailyIncome)))
    : 60;
  const dailyBenefit = dailyIncome * (irr / 100);

  const daysWorked = Math.max(0, yearsService) * 365;
  const creditDays = Math.min(UIF_MAX_CREDIT_DAYS, Math.floor(daysWorked / 4));
  const fullRateDays = Math.min(creditDays, UIF_FULL_RATE_DAYS);
  const reducedDays = creditDays - fullRateDays;
  const totalBenefit = fullRateDays * dailyBenefit + reducedDays * dailyIncome * 0.2;

  return {
    dailyIncome,
    replacementRate: irr,
    monthlyBenefit: Math.round((dailyBenefit * 365) / 12),
    creditDays,
    weeksEntitled: Math.floor(creditDays / 7),
    months: creditDays / (365 / 12),
    totalBenefit,
  };
}
