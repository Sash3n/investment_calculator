/**
 * Dividend income projection with SA dividends tax, TFSA and foreign withholding tax.
 */

export const SA_DIVIDENDS_TAX = 0.20;

// ── Types ─────────────────────────────────────────────────────────────────────
export type Market = 'SA' | 'International';

export interface DividendInputs {
  investmentAmount:     number;
  monthlyContribution:  number;
  dividendYield:        number;
  dividendGrowthRate:   number;
  annualReturnRate:     number;
  market:               Market;
  foreignWithholdingTax: number;
  exchangeRate:         number;
  drip:                 boolean;
  tfsa:                 boolean;
  years:                number;
  targetMonthlyIncome:  number;
}

export interface ProjectionRow {
  year:              number;
  portfolioValue:    number;
  grossDividend:     number;
  afterTaxDividend:  number;
  yieldOnCost:       number;
  cumulativeIncome:  number;
  totalContributed:  number;
  zarIncome:         number;
}

// ── Core math ─────────────────────────────────────────────────────────────────
export function effectiveTaxRate(market: Market, foreignWithholdingTax: number, tfsa = false): number {
  const foreign = foreignWithholdingTax / 100;
  if (tfsa) {
    // A TFSA exempts SA Dividends Tax entirely. Foreign withholding tax is still
    // deducted at source by the foreign country — the TFSA can't reclaim it.
    return market === 'SA' ? 0 : foreign;
  }
  if (market === 'SA') return SA_DIVIDENDS_TAX;
  // Foreign withholding applied first; SA dividends tax (20%) applied to remainder
  // Double-taxation agreements typically allow credit for foreign tax paid up to SA rate
  // Effective rate = max(SA_DIVIDENDS_TAX, foreignWithholdingTax) — conservative estimate
  return Math.max(SA_DIVIDENDS_TAX, foreign);
}

export function project(inp: DividendInputs): ProjectionRow[] {
  const rows: ProjectionRow[] = [];
  const taxRate    = effectiveTaxRate(inp.market, inp.foreignWithholdingTax, inp.tfsa);
  const yieldRate  = inp.dividendYield / 100;
  const growthRate = inp.dividendGrowthRate / 100;
  const capGain    = inp.annualReturnRate / 100;

  let portfolioValue   = inp.investmentAmount;
  let currentYield     = yieldRate;
  let cumulativeIncome = 0;
  let totalContributed = inp.investmentAmount;
  const annualContribution = (inp.monthlyContribution ?? 0) * 12;

  for (let year = 1; year <= inp.years; year++) {
    const grossDividend    = portfolioValue * currentYield;
    const afterTaxDividend = grossDividend * (1 - taxRate);
    // Investment/portfolio are entered in Rands, so afterTaxDividend is already a
    // ZAR figure regardless of market. (For international holdings the FX rate
    // converts in on purchase and out on payout at ~the same rate, so it cancels.)
    const zarIncome        = afterTaxDividend;

    cumulativeIncome += afterTaxDividend;

    // Yield on invested capital (initial + contributions made so far)
    const yieldOnCost = totalContributed > 0 ? (grossDividend / totalContributed) * 100 : 0;

    rows.push({
      year,
      portfolioValue: Math.round(portfolioValue),
      grossDividend:  Math.round(grossDividend),
      afterTaxDividend: Math.round(afterTaxDividend),
      yieldOnCost,
      cumulativeIncome: Math.round(cumulativeIncome),
      totalContributed: Math.round(totalContributed),
      zarIncome: Math.round(zarIncome),
    });

    // Grow portfolio: capital appreciation + DRIP (reinvested dividends) + new contributions
    const capAppreciation = portfolioValue * capGain;
    const reinvested      = inp.drip ? afterTaxDividend : 0;
    portfolioValue       += capAppreciation + reinvested + annualContribution;
    totalContributed     += annualContribution;

    // Dividends per share grow at the dividend growth rate and the share price at the
    // capital growth rate, so the yield on the current value moves by the ratio of the two.
    currentYield *= (1 + growthRate) / (1 + capGain);
  }

  return rows;
}
