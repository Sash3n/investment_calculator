import { describe, it, expect } from 'vitest';
import { calcPortfolioTax } from '../utils/portfolioTax';
import type { PortfolioRentalProperty, PortfolioTaxInputs } from '../types';

function prop(overrides: Partial<PortfolioRentalProperty> = {}): PortfolioRentalProperty {
  return {
    id: Math.random().toString(36).slice(2),
    name: 'Unit',
    monthlyRent: 10_000,
    vacancyRate: 0,
    annualBondInterest: 60_000,
    annualRates: 12_000,
    annualLevies: 18_000,
    annualInsurance: 6_000,
    annualRepairs: 6_000,
    managementFeePercent: 0,
    otherAnnualDeductions: 0,
    purchasePrice: 1_000_000,
    isNewUnused: false,
    isLowCostHousing: false,
    ...overrides,
  };
}

function inputs(properties: PortfolioRentalProperty[], overrides: Partial<PortfolioTaxInputs> = {}): PortfolioTaxInputs {
  return { properties, otherAnnualIncome: 600_000, ageGroup: 'under65', raMonthlyContrib: 0, ...overrides };
}

describe('calcPortfolioTax', () => {
  it('single property: net profit and attributable tax at marginal rate', () => {
    // rent 120,000 - deductions 102,000 = 18,000 profit on top of 600,000
    const r = calcPortfolioTax(inputs([prop()]), '2027');
    expect(r.netRentalIncome).toBe(18_000);
    expect(r.perProperty[0].netProfit).toBe(18_000);
    // 600,000 + 18,000 stays in the 36% bracket for 2027
    expect(Math.round(r.taxAttributableToRental)).toBe(Math.round(18_000 * 0.36));
  });

  it('vacancy and management fee reduce effective rent', () => {
    const r = calcPortfolioTax(inputs([prop({ vacancyRate: 10, managementFeePercent: 10 })]), '2027');
    const effRent = 10_000 * 0.9 * 12; // 108,000
    expect(r.perProperty[0].annualRent).toBe(effRent);
    expect(r.perProperty[0].totalDeductions).toBeCloseTo(102_000 + effRent * 0.10, 5);
  });

  it('combined rental loss offsets other income', () => {
    const loser = prop({ monthlyRent: 5_000, annualBondInterest: 90_000 }); // 60,000 - 132,000 = -72,000
    const r = calcPortfolioTax(inputs([loser]), '2027');
    expect(r.netRentalIncome).toBe(-72_000);
    expect(r.totalTaxableIncome).toBe(600_000 - 72_000);
    expect(r.taxAttributableToRental).toBe(0);
  });

  it('below 5 qualifying units: no Section 13sex', () => {
    const props = [prop({ isNewUnused: true }), prop({ isNewUnused: true }), prop({ isNewUnused: true }), prop({ isNewUnused: true })];
    const r = calcPortfolioTax(inputs(props), '2027');
    expect(r.s13QualifyingUnits).toBe(4);
    expect(r.s13Qualifies).toBe(false);
    expect(r.s13).toBeUndefined();
    expect(r.s13AnnualTaxSaving).toBe(0);
  });

  it('old units do not count toward the 13sex threshold', () => {
    const props = [
      ...Array.from({ length: 5 }, () => prop({ isNewUnused: false })),
      prop({ isNewUnused: true }),
    ];
    const r = calcPortfolioTax(inputs(props), '2027');
    expect(r.s13QualifyingUnits).toBe(1);
    expect(r.s13Qualifies).toBe(false);
  });

  it('5+ new-and-unused units qualify: 5% of building cost deducted', () => {
    const props = Array.from({ length: 5 }, (_, i) => prop({ id: `u${i}`, isNewUnused: true }));
    const r = calcPortfolioTax(inputs(props, { otherAnnualIncome: 1_000_000 }), '2027');
    expect(r.s13Qualifies).toBe(true);
    expect(r.s13).toBeDefined();
    // 5 units x 1,000,000 x 5% = 250,000 year-1 deduction
    expect(r.s13!.annualDeduction).toBe(250_000);
    expect(r.s13AnnualTaxSaving).toBeGreaterThan(0);
    // saving at 41% marginal on 250,000 is at most 102,500
    expect(r.s13AnnualTaxSaving).toBeLessThanOrEqual(250_000 * 0.41);
  });

  it('low-cost units use the 10% rate inside the 13sex schedule', () => {
    const props = Array.from({ length: 5 }, (_, i) =>
      prop({ id: `u${i}`, isNewUnused: true, isLowCostHousing: true, purchasePrice: 300_000 }));
    const r = calcPortfolioTax(inputs(props), '2027');
    // 5 x 300,000 x 10% = 150,000
    expect(r.s13!.annualDeduction).toBe(150_000);
    expect(r.s13!.deductionPeriodYears).toBe(10);
  });

  it('empty portfolio yields zeros without crashing', () => {
    const r = calcPortfolioTax(inputs([]), '2027');
    expect(r.netRentalIncome).toBe(0);
    expect(r.taxAttributableToRental).toBe(0);
    expect(r.s13Qualifies).toBe(false);
  });

  it('respects the tax year for bracket differences', () => {
    const r2026 = calcPortfolioTax(inputs([prop()]), '2026');
    const r2027 = calcPortfolioTax(inputs([prop()]), '2027');
    // 2027 tables are lighter, so attributable tax should not be higher
    expect(r2027.taxAttributableToRental).toBeLessThanOrEqual(r2026.taxAttributableToRental);
  });
});
