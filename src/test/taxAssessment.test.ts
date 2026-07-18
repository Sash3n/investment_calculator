import { describe, it, expect } from 'vitest';
import { calcTaxAssessment } from '../utils/taxAssessment';
import type { TaxAssessmentInputs } from '../types';

const base: TaxAssessmentInputs = {
  ageGroup: 'under65',
  annualSalary: 600_000,
  travelAllowance: 0,
  travelInclusionRate: 0.8,
  otherIncome: 0,
  netRentalIncome: 0,
  interestIncome: 0,
  localDividends: 0,
  capitalGain: 0,
  raContributions: 0,
  donations: 0,
  medAidDependants: -1,
  medAidContributions: 0,
  medicalOutOfPocket: 0,
  hasDisability: false,
  payeWithheld: 0,
  provisionalPaid: 0,
};

describe('calcTaxAssessment (2027 tax year)', () => {
  it('salary-only matches the SARS 2027 table', () => {
    // 600,000 -> 125,599 + 36% of (600,000 - 530,201 + 1) = 150,727; less 17,820
    const r = calcTaxAssessment({ ...base, payeWithheld: 140_000 }, '2027');
    expect(Math.round(r.netTaxPayable)).toBe(132_907);
    expect(Math.round(r.refundOrOwing)).toBe(140_000 - 132_907);
  });

  it('owing is negative when PAYE underpaid', () => {
    const r = calcTaxAssessment({ ...base, payeWithheld: 100_000 }, '2027');
    expect(r.refundOrOwing).toBeLessThan(0);
    expect(Math.round(r.refundOrOwing)).toBe(100_000 - 132_907);
  });

  it('applies the interest exemption by age', () => {
    const under = calcTaxAssessment({ ...base, interestIncome: 30_000 }, '2027');
    expect(under.taxableInterest).toBe(30_000 - 23_800);
    expect(under.interestExemptionApplied).toBe(23_800);

    const senior = calcTaxAssessment({ ...base, ageGroup: '65to74', interestIncome: 30_000 }, '2027');
    expect(senior.taxableInterest).toBe(0);
    expect(senior.interestExemptionApplied).toBe(30_000);
  });

  it('capital gain uses the year-specific annual exclusion and 40% inclusion', () => {
    const r2027 = calcTaxAssessment({ ...base, capitalGain: 100_000 }, '2027');
    expect(r2027.taxableCapitalGain).toBe((100_000 - 50_000) * 0.4);

    const r2026 = calcTaxAssessment({ ...base, capitalGain: 100_000 }, '2026');
    expect(r2026.taxableCapitalGain).toBe((100_000 - 40_000) * 0.4);
  });

  it('caps RA at the year cap (R430k in 2027, R350k in 2026)', () => {
    const inputs = { ...base, annualSalary: 2_000_000, raContributions: 500_000 };
    expect(calcTaxAssessment(inputs, '2027').raDeductionAllowed).toBe(430_000);
    expect(calcTaxAssessment(inputs, '2026').raDeductionAllowed).toBe(350_000);
    expect(calcTaxAssessment(inputs, '2027').raDeductionCapped).toBe(true);
  });

  it('caps donations at 10% of income after retirement deduction', () => {
    const r = calcTaxAssessment({ ...base, donations: 100_000 }, '2027');
    expect(r.donationsAllowed).toBeCloseTo(600_000 * 0.10, 5);
    expect(r.donationsCapped).toBe(true);
  });

  it('rental loss offsets other income', () => {
    const r = calcTaxAssessment({ ...base, netRentalIncome: -50_000 }, '2027');
    expect(r.incomeBeforeDeductions).toBe(550_000);
  });

  it('s6A medical credit for main + 2 dependants (2027 rates)', () => {
    const r = calcTaxAssessment({ ...base, medAidDependants: 2 }, '2027');
    expect(r.medCredit6A).toBe((376 + 376 + 254) * 12);
  });

  it('s6B under-65: 25% above the 7.5% income floor', () => {
    // deps=0 -> 6A = 376*12 = 4,512; 4x = 18,048
    // contributions 60,000 -> excess 41,952; + out-of-pocket 10,000 = 51,952
    // floor 7.5% of 600,000 = 45,000 -> 25% of 6,952 = 1,738
    const r = calcTaxAssessment({
      ...base, medAidDependants: 0, medAidContributions: 60_000, medicalOutOfPocket: 10_000,
    }, '2027');
    expect(Math.round(r.medCredit6B)).toBe(1_738);
  });

  it('s6B senior: 33.3% with 3x multiplier and no income floor', () => {
    // deps=0 -> 6A = 4,512; 3x = 13,536
    // contributions 60,000 -> excess 46,464; + 10,000 = 56,464; / 3 = 18,821.33
    const r = calcTaxAssessment({
      ...base, ageGroup: '65to74', medAidDependants: 0,
      medAidContributions: 60_000, medicalOutOfPocket: 10_000,
    }, '2027');
    expect(Math.round(r.medCredit6B)).toBe(18_821);
  });

  it('local dividends are excluded from taxable income but report 20% DWT', () => {
    const r = calcTaxAssessment({ ...base, localDividends: 10_000 }, '2027');
    expect(r.taxableIncome).toBe(600_000);
    expect(r.dividendsTax).toBe(2_000);
  });

  it('zero income yields zero tax and full refund of PAYE paid', () => {
    const r = calcTaxAssessment({ ...base, annualSalary: 0, payeWithheld: 5_000 }, '2027');
    expect(r.netTaxPayable).toBe(0);
    expect(r.refundOrOwing).toBe(5_000);
  });
});
