import { describe, it, expect } from 'vitest';
import {
  SARS_CODES, SARS_CODE_BY_CODE, searchSarsCodes, sumCodeRows,
} from '../data/sarsCodes';

describe('SARS code registry', () => {
  it('has unique codes', () => {
    const codes = SARS_CODES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('every code is a 4-digit string with a label and description', () => {
    for (const c of SARS_CODES) {
      expect(c.code).toMatch(/^\d{4}$/);
      expect(c.label.length).toBeGreaterThan(2);
      expect(c.description.length).toBeGreaterThan(10);
    }
  });

  it('key mappings are correct', () => {
    expect(SARS_CODE_BY_CODE['3601'].mapsTo).toBe('annualSalary');
    expect(SARS_CODE_BY_CODE['3701'].mapsTo).toBe('travelAllowance');
    expect(SARS_CODE_BY_CODE['4001'].mapsTo).toBe('raContributions');
    expect(SARS_CODE_BY_CODE['4006'].mapsTo).toBe('raContributions');
    expect(SARS_CODE_BY_CODE['4005'].mapsTo).toBe('medAidContributions');
    expect(SARS_CODE_BY_CODE['4030'].mapsTo).toBe('donations');
    expect(SARS_CODE_BY_CODE['4102'].mapsTo).toBe('payeWithheld');
    expect(SARS_CODE_BY_CODE['4201'].mapsTo).toBe('interestIncome');
    // foreign interest gets no s10(1)(i) exemption, so it must NOT feed interestIncome
    expect(SARS_CODE_BY_CODE['4218'].mapsTo).toBe('otherIncome');
  });

  it('non-taxable, totals and employer codes are informational', () => {
    for (const code of ['3602', '3703', '3705', '3714', '4116', '4141', '4142', '4149', '4472', '4474', '4497', '3697', '3698']) {
      expect(SARS_CODE_BY_CODE[code].mapsTo).toBeNull();
    }
  });

  it('lump sums are not modelled (informational)', () => {
    for (const code of ['3901', '3907', '3915']) {
      expect(SARS_CODE_BY_CODE[code].mapsTo).toBeNull();
    }
  });
});

describe('searchSarsCodes', () => {
  it('exact code match ranks first', () => {
    expect(searchSarsCodes('4102')[0].code).toBe('4102');
    expect(searchSarsCodes('3601')[0].code).toBe('3601');
  });

  it('prefix match finds the 36xx family', () => {
    const results = searchSarsCodes('36');
    expect(results.length).toBeGreaterThan(3);
    expect(results.every((c) => c.code.startsWith('36'))).toBe(true);
  });

  it('finds by name and keywords', () => {
    expect(searchSarsCodes('travel').some((c) => c.code === '3701')).toBe(true);
    expect(searchSarsCodes('bonus').some((c) => c.code === '3605')).toBe(true);
    expect(searchSarsCodes('paye').some((c) => c.code === '4102')).toBe(true);
    expect(searchSarsCodes('medical').some((c) => c.code === '4005')).toBe(true);
  });

  it('empty query returns a default list capped at the limit', () => {
    expect(searchSarsCodes('', 5)).toHaveLength(5);
  });
});

describe('sumCodeRows', () => {
  it('sums multiple codes into their mapped fields', () => {
    const sums = sumCodeRows([
      { code: '3601', amount: 480_000 },
      { code: '3605', amount: 40_000 },
      { code: '3701', amount: 60_000 },
      { code: '4001', amount: 24_000 },
      { code: '4006', amount: 12_000 },
      { code: '4005', amount: 36_000 },
      { code: '4102', amount: 110_000 },
      { code: '4201', amount: 15_000 },
    ]);
    expect(sums.annualSalary).toBe(520_000);
    expect(sums.travelAllowance).toBe(60_000);
    expect(sums.raContributions).toBe(36_000);
    expect(sums.medAidContributions).toBe(36_000);
    expect(sums.payeWithheld).toBe(110_000);
    expect(sums.interestIncome).toBe(15_000);
  });

  it('ignores informational codes and zero/negative amounts', () => {
    const sums = sumCodeRows([
      { code: '4116', amount: 4_500 },   // informational
      { code: '3602', amount: 10_000 },  // non-taxable
      { code: '3601', amount: 0 },       // zero
      { code: '9999', amount: 5_000 },   // unknown
    ]);
    expect(Object.keys(sums)).toHaveLength(0);
  });
});
