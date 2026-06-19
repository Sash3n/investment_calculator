/**
 * FinCalc ZA — Portfolio Stress Test
 *
 * Runs each saved buy-to-let property through a set of adverse scenarios
 * (interest-rate hikes, vacancy spikes, value drops) and reports the
 * resulting monthly cash flow, total portfolio exposure, and the
 * "breaking-point" interest rate at which each property turns cash-flow
 * negative. Uses Scenario 1 rent as the base case.
 */

import type { PropertyInputs } from '../types';
import { calcPayment } from './mortgage';

export interface StressScenario {
  key: string;
  label: string;
  rateDelta: number;     // percentage points added to interest rate
  vacancyOverride?: number; // absolute vacancy % (replaces property's)
  valueDropPercent?: number; // % drop applied to property value (equity impact)
}

export const STRESS_SCENARIOS: StressScenario[] = [
  { key: 'base',     label: 'Current',          rateDelta: 0 },
  { key: 'rate1',    label: 'Prime +1%',        rateDelta: 1 },
  { key: 'rate2',    label: 'Prime +2%',        rateDelta: 2 },
  { key: 'rate3',    label: 'Prime +3%',        rateDelta: 3 },
  { key: 'vacancy',  label: 'Vacancy 15%',      rateDelta: 0, vacancyOverride: 15 },
  { key: 'drop',     label: 'Value −10%',       rateDelta: 0, valueDropPercent: 10 },
  { key: 'worst',    label: 'Worst Case',       rateDelta: 2, vacancyOverride: 15, valueDropPercent: 10 },
];

export interface PropertyScenarioResult {
  scenarioKey: string;
  monthlyCashFlow: number;
  bondRepayment: number;
  negative: boolean;
  equity: number;          // value − loan balance (approx, at purchase)
}

export interface PropertyStressResult {
  id: string;
  name: string;
  purchasePrice: number;
  baseInterestRate: number;
  baseMonthlyCashFlow: number;
  breakingPointRate: number | null; // rate at which cash flow hits 0; null if already negative or never within range
  rateHeadroom: number | null;      // breakingPointRate − baseInterestRate
  scenarios: Record<string, PropertyScenarioResult>;
}

export interface PortfolioStressResult {
  properties: PropertyStressResult[];
  scenarioTotals: Record<string, { totalMonthlyCashFlow: number; negativeCount: number }>;
  totalBaseMonthlyCashFlow: number;
  mostFragile: PropertyStressResult | null; // smallest rate headroom
  count: number;
}

/** Monthly cash flow (Scenario 1 rent) for a property under a rate + vacancy override. */
function monthlyCashFlow(p: PropertyInputs, rate: number, vacancy: number): { cashFlow: number; bond: number } {
  const effectivePrice = p.purchasePrice * (1 - p.discount / 100);
  const loanAmount = Math.max(0, effectivePrice - p.deposit);
  const bond = calcPayment(loanAmount, rate, p.bondTerm, 12);
  const effectiveRent = p.rentScenario1 * (1 - vacancy / 100);
  const mgmtFee = effectiveRent * (p.managementFeePercent / 100);
  const costs =
    bond +
    (p.monthlyServiceFee ?? 0) +
    p.monthlyLevies +
    p.monthlyRates +
    p.insurance +
    p.effluentFees +
    p.miscFees +
    mgmtFee;
  return { cashFlow: effectiveRent - costs, bond };
}

function calcBreakingPoint(p: PropertyInputs): number | null {
  const base = p.interestRate;
  // If already negative at current rate, no positive headroom.
  if (monthlyCashFlow(p, base, p.vacancyRate).cashFlow <= 0) return null;
  // Step the rate upward to find where cash flow crosses zero (max +12 pts).
  for (let r = base; r <= base + 12; r += 0.05) {
    if (monthlyCashFlow(p, r, p.vacancyRate).cashFlow <= 0) {
      return Math.round(r * 100) / 100;
    }
  }
  return null;
}

export function calcPortfolioStress(portfolio: (PropertyInputs & { id: string })[]): PortfolioStressResult {
  const scenarioTotals: PortfolioStressResult['scenarioTotals'] = {};
  STRESS_SCENARIOS.forEach((s) => (scenarioTotals[s.key] = { totalMonthlyCashFlow: 0, negativeCount: 0 }));

  const properties: PropertyStressResult[] = portfolio.map((p) => {
    const effectivePrice = p.purchasePrice * (1 - p.discount / 100);
    const loanAmount = Math.max(0, effectivePrice - p.deposit);

    const scenarios: Record<string, PropertyScenarioResult> = {};
    for (const s of STRESS_SCENARIOS) {
      const rate = p.interestRate + s.rateDelta;
      const vacancy = s.vacancyOverride ?? p.vacancyRate;
      const { cashFlow, bond } = monthlyCashFlow(p, rate, vacancy);
      const value = effectivePrice * (1 - (s.valueDropPercent ?? 0) / 100);
      scenarios[s.key] = {
        scenarioKey: s.key,
        monthlyCashFlow: cashFlow,
        bondRepayment: bond,
        negative: cashFlow < 0,
        equity: Math.max(0, value - loanAmount),
      };
      scenarioTotals[s.key].totalMonthlyCashFlow += cashFlow;
      if (cashFlow < 0) scenarioTotals[s.key].negativeCount += 1;
    }

    const breakingPointRate = calcBreakingPoint(p);
    return {
      id: p.id,
      name: p.propertyName || 'Unnamed Property',
      purchasePrice: p.purchasePrice,
      baseInterestRate: p.interestRate,
      baseMonthlyCashFlow: scenarios.base.monthlyCashFlow,
      breakingPointRate,
      rateHeadroom: breakingPointRate !== null ? Math.round((breakingPointRate - p.interestRate) * 100) / 100 : null,
      scenarios,
    };
  });

  // Most fragile = positive-but-smallest headroom, or any already-negative property.
  let mostFragile: PropertyStressResult | null = null;
  for (const prop of properties) {
    if (prop.rateHeadroom === null) {
      // Already negative — treat as most fragile immediately.
      mostFragile = prop;
      break;
    }
    if (!mostFragile || (mostFragile.rateHeadroom ?? Infinity) > prop.rateHeadroom) {
      mostFragile = prop;
    }
  }

  return {
    properties,
    scenarioTotals,
    totalBaseMonthlyCashFlow: scenarioTotals.base?.totalMonthlyCashFlow ?? 0,
    mostFragile,
    count: properties.length,
  };
}
