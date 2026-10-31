import { describe, it, expect } from 'vitest';
import { calcSTRvsLTR, type STRvsLTRInputs } from '../utils/shortTermRental';

const base: STRvsLTRInputs = {
  propertyValue: 2_000_000, monthlyBondCost: 0,
  nightlyRate: 1_200, occupancyPercent: 60, avgNightsPerStay: 3, platformFeePercent: 15,
  cleaningCostPerStay: 350, strManagementPercent: 0, monthlyStrExtraCosts: 2_000,
  monthlyRent: 14_000, ltrVacancyPercent: 5, ltrManagementPercent: 8, monthlyLtrExpenses: 3_200,
};

describe('Airbnb vs long-term lease', () => {
  it('charges ownership costs to both strategies', () => {
    const r = calcSTRvsLTR(base);
    expect(r.str.ownershipCosts).toBe(3_200 * 12);
    expect(r.ltr.expenses).toBe(3_200 * 12);
  });
  it('ownership costs do not change which strategy wins by how much', () => {
    const low = calcSTRvsLTR({ ...base, monthlyLtrExpenses: 0 });
    const high = calcSTRvsLTR({ ...base, monthlyLtrExpenses: 5_000 });
    expect(high.annualDifference).toBeCloseTo(low.annualDifference, 6);
  });
  it('break-even occupancy matches the lease income', () => {
    const r = calcSTRvsLTR(base);
    expect(r.breakEvenOccupancy).not.toBeNull();
    const atBreakEven = calcSTRvsLTR({ ...base, occupancyPercent: r.breakEvenOccupancy! });
    expect(Math.abs(atBreakEven.annualDifference)).toBeLessThan(300);
  });
});
