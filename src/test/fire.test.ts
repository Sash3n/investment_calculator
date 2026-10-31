import { describe, it, expect } from 'vitest';
import { yearsToFire } from '../utils/fire';

describe('yearsToFire', () => {
  it('is zero when savings already cover spending at the withdrawal rate', () => {
    expect(yearsToFire(10_000_000, 0, 10, 360_000, 5, 0.04)).toBe(0);
  });
  it('takes longer when spending grows with inflation', () => {
    const flat = yearsToFire(200_000, 10_000, 11, 360_000, 0, 0.04);
    const inflating = yearsToFire(200_000, 10_000, 11, 360_000, 5.5, 0.04);
    expect(inflating).toBeGreaterThan(flat);
  });
  it('meets the target at the moment it is reached', () => {
    const years = yearsToFire(200_000, 10_000, 11, 360_000, 5.5, 0.04);
    const months = Math.round(years * 12);
    let bal = 200_000;
    for (let m = 0; m < months; m++) bal = bal * (1 + 0.11 / 12) + 10_000;
    const target = (360_000 * Math.pow(1.055, months / 12)) / 0.04;
    expect(bal).toBeGreaterThanOrEqual(target);
  });
  it('never gets there with no saving and spending growing faster than returns', () => {
    expect(yearsToFire(100_000, 0, 3, 360_000, 6, 0.04)).toBe(Infinity);
  });
});
