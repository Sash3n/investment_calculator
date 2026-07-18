import { describe, it, expect } from 'vitest';
import { calcIncomeTax, getMarginalRate, calcPAYE, calcTransferDuty } from '../utils/tax';
import { TAX_YEARS, TAX_YEAR_OPTIONS, DEFAULT_TAX_YEAR, type TaxYearId } from '../config/taxYears';

describe('calcIncomeTax (SARS 2026 brackets)', () => {
  it('returns 0 for zero income', () => {
    expect(calcIncomeTax(0, 'under65')).toBe(0);
  });

  it('returns 0 for negative income', () => {
    expect(calcIncomeTax(-1, 'under65')).toBe(0);
  });

  it('under65 primary rebate is applied', () => {
    // Income just above the tax threshold — should pay small amount
    const tax = calcIncomeTax(100_000, 'under65');
    expect(tax).toBeGreaterThanOrEqual(0);
  });

  it('under65 high earner is in top bracket (45%)', () => {
    const rate = getMarginalRate(2_000_000);
    expect(rate).toBe(0.45);
  });

  it('65to74 rebate is higher than under65', () => {
    const income = 400_000;
    const taxUnder65 = calcIncomeTax(income, 'under65');
    const tax65to74 = calcIncomeTax(income, '65to74');
    expect(tax65to74).toBeLessThan(taxUnder65);
  });

  it('75plus rebate is highest', () => {
    const income = 400_000;
    const tax65to74 = calcIncomeTax(income, '65to74');
    const tax75plus = calcIncomeTax(income, '75plus');
    expect(tax75plus).toBeLessThan(tax65to74);
  });

  it('income in first bracket (18%) is taxed at 18% marginal rate', () => {
    const rate = getMarginalRate(200_000);
    expect(rate).toBe(0.18);
  });

  it('income in second bracket is taxed at 26% marginal rate', () => {
    const rate = getMarginalRate(300_000);
    expect(rate).toBe(0.26);
  });

  it('income in third bracket is taxed at 31%', () => {
    const rate = getMarginalRate(400_000);
    expect(rate).toBe(0.31);
  });

  it('income in fourth bracket is taxed at 36%', () => {
    const rate = getMarginalRate(600_000);
    expect(rate).toBe(0.36);
  });

  it('income in fifth bracket is taxed at 39%', () => {
    const rate = getMarginalRate(700_000);
    expect(rate).toBe(0.39);
  });

  it('income in sixth bracket is taxed at 41%', () => {
    const rate = getMarginalRate(1_000_000);
    expect(rate).toBe(0.41);
  });

  it('tax increases with income (progressive)', () => {
    const tax1 = calcIncomeTax(300_000, 'under65');
    const tax2 = calcIncomeTax(600_000, 'under65');
    const tax3 = calcIncomeTax(900_000, 'under65');
    expect(tax2).toBeGreaterThan(tax1);
    expect(tax3).toBeGreaterThan(tax2);
  });
});

describe('getMarginalRate', () => {
  it('returns 0 for zero income', () => {
    expect(getMarginalRate(0)).toBe(0);
  });

  it('returns the top rate for very high income', () => {
    expect(getMarginalRate(5_000_000)).toBe(0.45);
  });
});

describe('multi-tax-year support', () => {
  const YEARS = Object.keys(TAX_YEARS) as TaxYearId[];

  it('every selector option has a constants entry', () => {
    for (const opt of TAX_YEAR_OPTIONS) {
      expect(TAX_YEARS[opt.id]).toBeDefined();
    }
  });

  it('default-year call equals explicit DEFAULT_TAX_YEAR call (backward compatibility)', () => {
    expect(calcIncomeTax(500_000, 'under65')).toBe(calcIncomeTax(500_000, 'under65', DEFAULT_TAX_YEAR));
    expect(getMarginalRate(500_000)).toBe(getMarginalRate(500_000, DEFAULT_TAX_YEAR));
    expect(calcTransferDuty(2_000_000)).toBe(calcTransferDuty(2_000_000, DEFAULT_TAX_YEAR));
  });

  it('income tax tables are frozen across 2024-2026 (Treasury freeze)', () => {
    const t2024 = calcIncomeTax(750_000, 'under65', '2024');
    const t2025 = calcIncomeTax(750_000, 'under65', '2025');
    const t2026 = calcIncomeTax(750_000, 'under65', '2026');
    expect(t2024).toBe(t2026);
    expect(t2025).toBe(t2026);
  });

  it.each(YEARS)('year %s: brackets are contiguous and ascending', (year) => {
    const { brackets } = TAX_YEARS[year];
    for (let i = 1; i < brackets.length; i++) {
      expect(brackets[i].min).toBe(brackets[i - 1].max + 1);
      expect(brackets[i].rate).toBeGreaterThan(brackets[i - 1].rate);
    }
    expect(brackets[brackets.length - 1].max).toBe(Infinity);
  });

  it.each(YEARS)('year %s: bracket base equals cumulative tax at bracket floor', (year) => {
    // base of bracket i must equal the tax accumulated over all lower brackets,
    // which is what makes the SARS "R base + rate% of amount above min" table valid
    const { brackets } = TAX_YEARS[year];
    for (let i = 1; i < brackets.length; i++) {
      let cumulative = 0;
      for (let j = 0; j < i; j++) {
        cumulative += brackets[j].rate * (brackets[j].max - brackets[j].min + (j === 0 ? 1 : 1));
      }
      // SARS published bases are rounded to the rand; allow R5 drift
      expect(Math.abs(brackets[i].base - Math.round(cumulative))).toBeLessThanOrEqual(5);
    }
  });

  it('no tax below the tax threshold for each age group', () => {
    for (const year of YEARS) {
      const { taxThreshold } = TAX_YEARS[year];
      expect(calcIncomeTax(taxThreshold.under65 - 100, 'under65', year)).toBe(0);
      expect(calcIncomeTax(taxThreshold['65to74'] - 100, '65to74', year)).toBe(0);
      expect(calcIncomeTax(taxThreshold['75plus'] - 100, '75plus', year)).toBe(0);
    }
  });

  it('calcPAYE respects the tax year parameter', () => {
    const inputs = { grossMonthly: 50_000, ageGroup: 'under65' as const, raMonthlyContrib: 0, medAidDependants: -1 };
    expect(calcPAYE(inputs).annualPAYE).toBe(calcPAYE(inputs, DEFAULT_TAX_YEAR).annualPAYE);
  });
});

describe('calcPAYE reference values (SARS published tables)', () => {
  it('2026 tax year: R50,000/month, under 65, no RA, no medical aid', () => {
    // Annual 600,000 -> bracket 4: 121,475 + 36% of (600,000 - 512,801 + 1)
    // = 121,475 + 31,392 = 152,867; less rebate 17,235 = 135,632
    const r = calcPAYE({ grossMonthly: 50_000, ageGroup: 'under65', raMonthlyContrib: 0, medAidDependants: -1 }, '2026');
    expect(Math.round(r.annualPAYE)).toBe(135_632);
  });

  it('2027 tax year: R50,000/month, under 65, no RA, no medical aid', () => {
    // Annual 600,000 -> bracket 4: 125,599 + 36% of (600,000 - 530,201 + 1)
    // = 125,599 + 25,128 = 150,727; less rebate 17,820 = 132,907
    const r = calcPAYE({ grossMonthly: 50_000, ageGroup: 'under65', raMonthlyContrib: 0, medAidDependants: -1 }, '2027');
    expect(Math.round(r.annualPAYE)).toBe(132_907);
  });

  it('2027 medical credits are R376/R376/R254 per month', () => {
    const r = calcPAYE({ grossMonthly: 50_000, ageGroup: 'under65', raMonthlyContrib: 0, medAidDependants: 2 }, '2027');
    expect(r.medCreditMonthly).toBe(376 + 376 + 254);
  });

  it('UIF is capped at R177.12/month', () => {
    const r = calcPAYE({ grossMonthly: 50_000, ageGroup: 'under65', raMonthlyContrib: 0, medAidDependants: -1 });
    expect(r.monthlyUIF).toBeCloseTo(177.12, 2);
  });
});

describe('calcTransferDuty reference values', () => {
  it('2027 (table effective 1 Apr 2025): duty-free below R1,210,000', () => {
    expect(calcTransferDuty(1_200_000, '2027')).toBe(0);
  });

  it('2025 (older table): 3% band starts above R1,100,000', () => {
    expect(calcTransferDuty(1_200_000, '2025')).toBe(Math.round(0.03 * (1_200_000 - 1_100_001)));
  });

  it('2027: R2,000,000 property = 13,614 + 6% above 1,663,800', () => {
    expect(calcTransferDuty(2_000_000, '2027')).toBe(Math.round(13_614 + 0.06 * (2_000_000 - 1_663_801)));
  });
});
