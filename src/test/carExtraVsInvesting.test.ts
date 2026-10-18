import { describe, it, expect } from 'vitest';
import { calcCarScenario, buildCarComparison } from '../utils/carExtraVsInvesting';

const price = 450_000, deposit = 45_000, rate = 11.5, term = 60, extra = 1_500;
const scenario = calcCarScenario(price, deposit, 0, rate, term, extra);
const compare = (ret: number, cgt = 18, tfsa = false) => buildCarComparison(scenario, extra, rate, ret, cgt, tfsa, term);
const last = <T,>(rows: T[]) => rows[rows.length - 1];

describe('calcCarScenario', () => {
  it('paying extra saves interest and months', () => {
    expect(scenario.interestSaved).toBeGreaterThan(0);
    expect(scenario.monthsSaved).toBeGreaterThan(0);
    expect(scenario.monthsWithExtra).toBeLessThan(term);
  });
});

describe('buildCarComparison', () => {
  it('has a row per year of the term', () => {
    expect(compare(10)).toHaveLength(term / 12);
  });

  it('at a 0% return paying extra wins, by about the interest saved', () => {
    const final = last(compare(0, 0));
    expect(final.winner).toBe('extra');
    expect(Math.abs(final.difference)).toBeGreaterThan(scenario.interestSaved * 0.97);
    expect(Math.abs(final.difference)).toBeLessThan(scenario.interestSaved * 1.03);
  });

  it('investing at the loan rate with no CGT ends about level', () => {
    const final = last(compare(rate, 0));
    expect(Math.abs(final.difference)).toBeLessThan(final.investValue * 0.02);
  });

  it('a much higher return favours investing', () => {
    expect(last(compare(25)).winner).toBe('invest');
  });

  it('pay-extra only starts investing after the loan is paid off', () => {
    const rows = compare(10);
    expect(rows[0].bondRouteValue).toBe(0);
    expect(last(rows).bondRouteValue).toBeGreaterThan(0);
  });

  it('a TFSA ends higher than a taxed investment', () => {
    expect(last(compare(10, 18, true)).investValue).toBeGreaterThan(last(compare(10, 18, false)).investValue);
  });
});
