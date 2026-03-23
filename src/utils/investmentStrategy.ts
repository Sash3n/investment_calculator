/**
 * FinCalc ZA — SA Personal Investment Strategy Calculator
 * SARS 2025/26 tax year (1 March 2025 – 28 February 2026)
 * 2-Pot Retirement System | RA | TFSA | Strategy Comparison
 */

import * as XLSX from 'xlsx';
import { calcIncomeTax, getMarginalRate } from './tax';
import type { AgeGroup } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────
export const RA_PCT_CAP        = 0.275;
export const RA_MAX_DEDUCTION  = 350_000;
export const TFSA_LIFETIME_CAP = 500_000;
export const TFSA_ANNUAL_LIMITS: Record<TaxYear, number> = {
  '2024/25': 36_000,
  '2025/26': 46_000, // raised from R36K in 2026 Budget, effective 1 Mar 2026
};

export type TaxYear = '2024/25' | '2025/26';

// ── Input / Output types ──────────────────────────────────────────────────────
export interface InvestmentStrategyInputs {
  monthlyPrimaryGross: number;
  monthlySecondaryGross: number;
  age: number;
  taxYear: TaxYear;
  monthlyRA: number;
  monthlyTFSA: number;
  monthlySeparate: number;
  annualGrowthRate: number;    // e.g. 10 = 10%
  horizonYears: number;
  tfsaLifetimeContributed: number;
}

export interface StrategyMetrics {
  label: string;
  tag: 'conservative' | 'balanced' | 'maxTax';
  raMonthly: number;
  tfsaMonthly: number;
  separateMonthly: number;
  allowableRA: number;
  taxableIncome: number;
  monthlyPAYE: number;
  monthlyTaxSaving: number;
  effectiveRAMonthlyCost: number;
  takeHome: number;
  totalInvested: number;
  spendable: number;
  investPct: number;
  budgetTight: boolean;
  pros: string[];
  cons: string[];
  projectedFV: number;
}

export interface InvestmentStrategyResult {
  // Income
  totalMonthlyGross: number;
  totalAnnualGross: number;
  ageGroup: AgeGroup;
  // Current user analysis
  annualRA: number;
  allowableRA: number;
  raCapSource: 'none' | '27.5pct' | 'r350k';
  raUtilizationPct: number;
  taxableIncome: number;
  monthlyPAYE: number;
  monthlyPAYEWithoutRA: number;
  monthlyTaxSaving: number;
  effectiveRAMonthlyCost: number;
  takeHome: number;
  totalInvested: number;
  spendable: number;
  investPct: number;
  marginalRate: number;
  // TFSA
  tfsaAnnualLimit: number;
  tfsaMonthlyLimit: number;
  tfsaIsOver: boolean;
  tfsaOverBy: number;
  tfsaLifetimeRemaining: number;
  showTFSANudge: boolean;
  // 2-pot
  savingsPotMonthly: number;
  retirementPotMonthly: number;
  // Misc
  hasSecondaryIncome: boolean;
  raMonthlyLimit: number;  // max monthly RA for slider
  // Strategies
  conservative: StrategyMetrics;
  balanced: StrategyMetrics;
  maxTax: StrategyMetrics;
  // Projection
  projectionYears: number[];
  projectionCurrent: number[];
  projectionConservative: number[];
  projectionBalanced: number[];
  projectionMaxTax: number[];
  // Recommendation
  recommendedTag: 'conservative' | 'balanced' | 'maxTax';
  recommendationText: string;
  warnings: string[];
  sarsSubsidyPct: number;
  sarsSubsidyRand: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function ageToGroup(age: number): AgeGroup {
  if (age >= 75) return '75plus';
  if (age >= 65) return '65to74';
  return 'under65';
}

function fmtR(n: number): string {
  return `R ${Math.round(n).toLocaleString('en-ZA')}`;
}

function futureValue(monthlyContrib: number, annualRatePct: number, years: number): number {
  if (monthlyContrib <= 0 || years <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return monthlyContrib * n;
  return monthlyContrib * ((Math.pow(1 + r, n) - 1) / r);
}

function calcAllowableRA(annualRA: number, totalAnnualGross: number): {
  allowable: number;
  source: 'none' | '27.5pct' | 'r350k';
} {
  const pctCap = RA_PCT_CAP * totalAnnualGross;
  const fixedCap = RA_MAX_DEDUCTION;
  const allowable = Math.min(annualRA, pctCap, fixedCap);
  let source: 'none' | '27.5pct' | 'r350k' = 'none';
  if (annualRA >= fixedCap && fixedCap <= pctCap) source = 'r350k';
  else if (annualRA >= pctCap) source = '27.5pct';
  return { allowable, source };
}

// ── Core: compute metrics for one set of contribution inputs ──────────────────
function computeMetrics(
  totalMonthlyGross: number,
  totalAnnualGross: number,
  ageGroup: AgeGroup,
  raMonthly: number,
  tfsaMonthly: number,
  separateMonthly: number,
  annualGrowthRate: number,
  horizonYears: number,
  label: string,
  tag: StrategyMetrics['tag'],
): StrategyMetrics {
  const annualRA = raMonthly * 12;
  const { allowable: allowableRA } = calcAllowableRA(annualRA, totalAnnualGross);
  const taxableIncome = Math.max(0, totalAnnualGross - allowableRA);

  const annualTaxWithRA    = calcIncomeTax(taxableIncome, ageGroup);
  const annualTaxWithoutRA = calcIncomeTax(totalAnnualGross, ageGroup);

  const monthlyPAYE          = annualTaxWithRA / 12;
  const monthlyTaxSaving     = (annualTaxWithoutRA - annualTaxWithRA) / 12;
  const effectiveRAMonthlyCost = Math.max(0, raMonthly - monthlyTaxSaving);
  const takeHome             = totalMonthlyGross - raMonthly - monthlyPAYE;
  const totalInvested        = raMonthly + tfsaMonthly + separateMonthly;
  const spendable            = takeHome - tfsaMonthly - separateMonthly;
  const investPct            = totalMonthlyGross > 0 ? (totalInvested / totalMonthlyGross) * 100 : 0;
  const budgetTight          = spendable < 5_000;
  const projectedFV          = futureValue(totalInvested, annualGrowthRate, horizonYears);

  // Dynamic pros/cons
  const pros: string[] = [];
  const cons: string[] = [];

  if (tag === 'conservative') {
    pros.push('Maximum monthly cash flow and flexibility');
    pros.push('TFSA returns are 100% tax-free — no CGT, no income tax');
    pros.push('No funds locked away — access all savings anytime');
    if (totalMonthlyGross < 20_000) pros.push('Smart choice at your income level — preserve liquidity');
    cons.push('No RA tax deduction — missing out on government subsidy');
    cons.push('Investment returns on separate savings subject to tax');
    if (totalMonthlyGross > 40_000) cons.push(`At ${fmtR(totalMonthlyGross)}/month you're leaving significant tax savings on the table`);
  }

  if (tag === 'balanced') {
    pros.push(`Monthly tax saving of ${fmtR(monthlyTaxSaving)} reduces effective RA cost`);
    pros.push('Combines RA tax relief with TFSA tax-free growth');
    pros.push('Retains flexibility with separate investment component');
    if (!budgetTight) pros.push(`Comfortable ${fmtR(spendable)}/month spendable cash`);
    if (budgetTight) cons.push(`⚠️ Monthly budget of ${fmtR(spendable)} is tight`);
    cons.push('RA retirement pot (2/3) locked until age 55');
  }

  if (tag === 'maxTax') {
    const subsidyPct = raMonthly > 0 ? (monthlyTaxSaving / raMonthly) * 100 : 0;
    pros.push(`SARS subsidizes ${subsidyPct.toFixed(0)}% of your RA — government funds ${fmtR(monthlyTaxSaving)}/month`);
    pros.push('Maximum allowable RA deduction — biggest tax shield');
    pros.push('TFSA provides tax-free emergency liquidity');
    if (budgetTight) cons.push(`⚠️ Very tight monthly budget — only ${fmtR(spendable)} remaining`);
    else cons.push('Reduced spending flexibility vs. other strategies');
    cons.push('2/3 of RA locked in retirement pot until age 55');
    cons.push('No separate flexible investment in this strategy');
  }

  return {
    label, tag, raMonthly, tfsaMonthly, separateMonthly,
    allowableRA, taxableIncome, monthlyPAYE, monthlyTaxSaving,
    effectiveRAMonthlyCost, takeHome, totalInvested, spendable,
    investPct, budgetTight, pros, cons, projectedFV,
  };
}

// ── Main calculator ───────────────────────────────────────────────────────────
export function calcInvestmentStrategy(inputs: InvestmentStrategyInputs): InvestmentStrategyResult {
  const {
    monthlyPrimaryGross, monthlySecondaryGross, age, taxYear,
    monthlyRA, monthlyTFSA, monthlySeparate,
    annualGrowthRate, horizonYears, tfsaLifetimeContributed,
  } = inputs;

  const ageGroup = ageToGroup(age);
  const totalMonthlyGross = monthlyPrimaryGross + monthlySecondaryGross;
  const totalAnnualGross  = totalMonthlyGross * 12;

  // ── Current user inputs ───────────────────────────────────────────────────
  const annualRA = monthlyRA * 12;
  const { allowable: allowableRA, source: raCapSource } = calcAllowableRA(annualRA, totalAnnualGross);
  const raMonthlyLimit = Math.min(RA_PCT_CAP * totalAnnualGross / 12, RA_MAX_DEDUCTION / 12);
  const raUtilizationPct = raMonthlyLimit > 0 ? (monthlyRA / raMonthlyLimit) * 100 : 0;

  const taxableIncome      = Math.max(0, totalAnnualGross - allowableRA);
  const annualTaxWithRA    = calcIncomeTax(taxableIncome, ageGroup);
  const annualTaxWithoutRA = calcIncomeTax(totalAnnualGross, ageGroup);

  const monthlyPAYE          = annualTaxWithRA / 12;
  const monthlyPAYEWithoutRA = annualTaxWithoutRA / 12;
  const monthlyTaxSaving     = (annualTaxWithoutRA - annualTaxWithRA) / 12;
  const effectiveRAMonthlyCost = Math.max(0, monthlyRA - monthlyTaxSaving);
  const takeHome             = totalMonthlyGross - monthlyRA - monthlyPAYE;
  const totalInvested        = monthlyRA + monthlyTFSA + monthlySeparate;
  const spendable            = takeHome - monthlyTFSA - monthlySeparate;
  const investPct            = totalMonthlyGross > 0 ? (totalInvested / totalMonthlyGross) * 100 : 0;
  const marginalRate         = getMarginalRate(totalAnnualGross) * 100;

  // SARS subsidy
  const sarsSubsidyRand = monthlyTaxSaving;
  const sarsSubsidyPct  = monthlyRA > 0 ? (monthlyTaxSaving / monthlyRA) * 100 : 0;

  // ── TFSA ──────────────────────────────────────────────────────────────────
  const tfsaAnnualLimit    = TFSA_ANNUAL_LIMITS[taxYear];
  const tfsaMonthlyLimit   = tfsaAnnualLimit / 12;
  const tfsaAnnualContrib  = monthlyTFSA * 12;
  const tfsaIsOver         = tfsaAnnualContrib > tfsaAnnualLimit;
  const tfsaOverBy         = Math.max(0, tfsaAnnualContrib - tfsaAnnualLimit);
  const tfsaLifetimeRemaining = Math.max(0, TFSA_LIFETIME_CAP - tfsaLifetimeContributed);
  const showTFSANudge      = taxYear === '2025/26' && monthlyTFSA < tfsaMonthlyLimit - 10;

  // ── 2-Pot ──────────────────────────────────────────────────────────────────
  const savingsPotMonthly   = monthlyRA / 3;
  const retirementPotMonthly = (monthlyRA * 2) / 3;

  // ── Strategy inputs ────────────────────────────────────────────────────────
  const tfsaForStrategy = tfsaMonthlyLimit; // always use current limit in strategies

  // Conservative: RA=0, TFSA=max, Separate=0
  const conservative = computeMetrics(
    totalMonthlyGross, totalAnnualGross, ageGroup,
    0, tfsaForStrategy, 0,
    annualGrowthRate, horizonYears,
    'Conservative (TFSA Only)', 'conservative',
  );

  // Balanced: RA=12.5% gross, TFSA=max, Separate=min(5% take-home, 3000)
  const balRA = Math.min(totalMonthlyGross * 0.125, raMonthlyLimit);
  // take-home for balanced (approximate — compute quickly)
  const balTax = calcIncomeTax(Math.max(0, totalAnnualGross - Math.min(balRA * 12, RA_PCT_CAP * totalAnnualGross, RA_MAX_DEDUCTION)), ageGroup);
  const balTakeHome = totalMonthlyGross - balRA - balTax / 12;
  const balSeparate = Math.min(balTakeHome * 0.05, 3_000);

  const balanced = computeMetrics(
    totalMonthlyGross, totalAnnualGross, ageGroup,
    balRA, tfsaForStrategy, Math.max(0, balSeparate),
    annualGrowthRate, horizonYears,
    'Balanced (Recommended)', 'balanced',
  );

  // Max Tax: RA=27.5% (capped), TFSA=max, Separate=0
  const maxRA = raMonthlyLimit;
  const maxTax = computeMetrics(
    totalMonthlyGross, totalAnnualGross, ageGroup,
    maxRA, tfsaForStrategy, 0,
    annualGrowthRate, horizonYears,
    'Maximum Tax Benefit', 'maxTax',
  );

  // ── Projection ─────────────────────────────────────────────────────────────
  const projectionYears: number[] = [];
  const projectionCurrent: number[] = [];
  const projectionConservative: number[] = [];
  const projectionBalanced: number[] = [];
  const projectionMaxTax: number[] = [];

  for (let y = 1; y <= horizonYears; y++) {
    projectionYears.push(y);
    projectionCurrent.push(futureValue(totalInvested, annualGrowthRate, y));
    projectionConservative.push(futureValue(conservative.totalInvested, annualGrowthRate, y));
    projectionBalanced.push(futureValue(balanced.totalInvested, annualGrowthRate, y));
    projectionMaxTax.push(futureValue(maxTax.totalInvested, annualGrowthRate, y));
  }

  // ── Recommendation ─────────────────────────────────────────────────────────
  let recommendedTag: InvestmentStrategyResult['recommendedTag'] = 'balanced';
  const warnings: string[] = [];

  if (spendable < 5_000) warnings.push(`⚠️ Your current spendable cash (${fmtR(spendable)}/month) is below R5,000 — consider reducing contributions`);
  if (monthlyRA > raMonthlyLimit) warnings.push(`⚠️ Your RA contribution exceeds the 27.5% limit — excess of ${fmtR((monthlyRA - raMonthlyLimit) * 12)}/year is not tax-deductible`);
  if (tfsaIsOver) warnings.push(`⚠️ TFSA over-contribution of ${fmtR(tfsaOverBy)}/year — SARS will apply a 40% penalty tax on excess`);
  if (inputs.monthlySecondaryGross > 0) warnings.push('⚠️ Multiple income sources: each employer deducts PAYE separately but SARS combines your income at year-end — you may owe additional tax at assessment');
  if (tfsaLifetimeRemaining < 50_000 && tfsaLifetimeRemaining > 0) warnings.push(`⚠️ Only ${fmtR(tfsaLifetimeRemaining)} remaining in your TFSA lifetime allowance`);

  if (totalMonthlyGross < 15_000) {
    recommendedTag = 'conservative';
  } else if (totalMonthlyGross >= 40_000 && marginalRate >= 36 && !maxTax.budgetTight) {
    recommendedTag = 'maxTax';
  } else if (balanced.budgetTight) {
    recommendedTag = 'conservative';
  } else {
    recommendedTag = 'balanced';
  }

  const recommendedStrategy = { conservative, balanced, maxTax }[recommendedTag];
  const recommendationText = (() => {
    const govPays = fmtR(recommendedStrategy.monthlyTaxSaving);
    const income  = fmtR(totalMonthlyGross);
    const sarsSubPct = recommendedStrategy.raMonthly > 0
      ? ((recommendedStrategy.monthlyTaxSaving / recommendedStrategy.raMonthly) * 100).toFixed(0)
      : '0';

    if (recommendedTag === 'conservative') {
      return `At your income of ${income}/month, maximising cash flow makes the most sense right now. Your TFSA grows completely tax-free — no income tax, no CGT — which is a powerful wealth-building tool. As your income grows, revisiting an RA becomes more compelling.`;
    }
    if (recommendedTag === 'balanced') {
      return `At your income of ${income}/month, a balanced approach works best. Your marginal tax rate is ${marginalRate.toFixed(0)}%, so the government effectively funds ${govPays}/month (${sarsSubPct}%) of your RA contribution through tax relief. Combined with tax-free TFSA returns, this is the most efficient structure for your situation.`;
    }
    return `At ${income}/month with a ${marginalRate.toFixed(0)}% marginal rate, maximising your RA delivers the largest government subsidy. SARS is effectively paying ${govPays}/month (${sarsSubPct}%) of your R${Math.round(maxRA).toLocaleString('en-ZA')} RA contribution — that's free money from the government. Your TFSA provides tax-free liquidity while your retirement pot grows compounding tax-deferred.`;
  })();

  return {
    totalMonthlyGross, totalAnnualGross, ageGroup,
    annualRA, allowableRA, raCapSource, raUtilizationPct,
    taxableIncome, monthlyPAYE, monthlyPAYEWithoutRA,
    monthlyTaxSaving, effectiveRAMonthlyCost,
    takeHome, totalInvested, spendable, investPct, marginalRate,
    tfsaAnnualLimit, tfsaMonthlyLimit, tfsaIsOver, tfsaOverBy,
    tfsaLifetimeRemaining, showTFSANudge,
    savingsPotMonthly, retirementPotMonthly,
    hasSecondaryIncome: monthlySecondaryGross > 0,
    raMonthlyLimit,
    conservative, balanced, maxTax,
    projectionYears, projectionCurrent, projectionConservative,
    projectionBalanced, projectionMaxTax,
    recommendedTag, recommendationText, warnings,
    sarsSubsidyPct, sarsSubsidyRand,
  };
}

// ── Excel Export ──────────────────────────────────────────────────────────────
export function exportStrategyToExcel(
  inputs: InvestmentStrategyInputs,
  result: InvestmentStrategyResult,
): void {
  const wb = XLSX.utils.book_new();
  const r = (n: number) => `R ${Math.round(n).toLocaleString('en-ZA')}`;

  // Sheet 1 — Inputs
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['SA Investment Strategy Calculator — FinCalc ZA'],
    ['Generated', new Date().toLocaleDateString('en-ZA')],
    [],
    ['INCOME', '', ''],
    ['Primary Monthly Gross', r(inputs.monthlyPrimaryGross), ''],
    ['Secondary Monthly Income', r(inputs.monthlySecondaryGross), ''],
    ['Total Monthly Gross', r(result.totalMonthlyGross), ''],
    ['Total Annual Gross', r(result.totalAnnualGross), ''],
    ['Age', inputs.age, ''],
    ['Tax Year', inputs.taxYear, ''],
    [],
    ['YOUR CONTRIBUTIONS', '', ''],
    ['Monthly RA', r(inputs.monthlyRA), ''],
    ['Monthly TFSA', r(inputs.monthlyTFSA), `Limit: ${r(result.tfsaMonthlyLimit)}/month`],
    ['Monthly Separate', r(inputs.monthlySeparate), ''],
    [],
    ['PROJECTION SETTINGS', '', ''],
    ['Annual Growth Rate', `${inputs.annualGrowthRate}%`, ''],
    ['Investment Horizon', `${inputs.horizonYears} years`, ''],
    [],
    ['YOUR TAX SUMMARY', '', ''],
    ['Taxable Income (with RA)', r(result.taxableIncome), 'Annual'],
    ['Monthly PAYE (with RA)', r(result.monthlyPAYE), ''],
    ['Monthly PAYE (without RA)', r(result.monthlyPAYEWithoutRA), ''],
    ['Monthly Tax Saving from RA', r(result.monthlyTaxSaving), ''],
    ['Effective RA Cost (after tax saving)', r(result.effectiveRAMonthlyCost), ''],
    ['Net Take-Home Pay', r(result.takeHome), 'Monthly'],
    ['Spendable Cash', r(result.spendable), 'Monthly'],
    ['SARS Subsidy on RA', `${result.sarsSubsidyPct.toFixed(1)}%`, `${r(result.sarsSubsidyRand)}/month`],
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Your Inputs');

  // Sheet 2 — Strategy Comparison
  const strategies = [result.conservative, result.balanced, result.maxTax];
  const headers = ['Metric', ...strategies.map(s => s.label)];
  const rows = [
    headers,
    ['RA Monthly',             ...strategies.map(s => r(s.raMonthly))],
    ['TFSA Monthly',           ...strategies.map(s => r(s.tfsaMonthly))],
    ['Separate Investment',    ...strategies.map(s => r(s.separateMonthly))],
    ['Allowable RA Deduction', ...strategies.map(s => r(s.allowableRA))],
    ['Taxable Income (Annual)',...strategies.map(s => r(s.taxableIncome))],
    ['Monthly PAYE',           ...strategies.map(s => r(s.monthlyPAYE))],
    ['Monthly Tax Saving',     ...strategies.map(s => r(s.monthlyTaxSaving))],
    ['Effective RA Cost',      ...strategies.map(s => r(s.effectiveRAMonthlyCost))],
    ['Net Take-Home',          ...strategies.map(s => r(s.takeHome))],
    ['Total Invested/Month',   ...strategies.map(s => r(s.totalInvested))],
    ['Spendable Cash',         ...strategies.map(s => r(s.spendable))],
    ['% Income Invested',      ...strategies.map(s => `${s.investPct.toFixed(1)}%`)],
    [`Projected Value (${inputs.horizonYears} yrs)`, ...strategies.map(s => r(s.projectedFV))],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Strategy Comparison');

  // Sheet 3 — Year-by-Year Projection
  const projHeader = ['Year', 'Your Plan', 'Conservative', 'Balanced (Rec)', 'Max Tax'];
  const projRows = result.projectionYears.map((y, i) => [
    y,
    r(result.projectionCurrent[i]),
    r(result.projectionConservative[i]),
    r(result.projectionBalanced[i]),
    r(result.projectionMaxTax[i]),
  ]);
  const ws3 = XLSX.utils.aoa_to_sheet([projHeader, ...projRows]);
  XLSX.utils.book_append_sheet(wb, ws3, 'Wealth Projection');

  const salary = Math.round(result.totalMonthlyGross / 1_000);
  XLSX.writeFile(wb, `SA_Investment_Strategy_R${salary}K.xlsx`);
}
