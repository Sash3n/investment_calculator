import { describe, it, expect } from 'vitest';
import {
  rangeError, nonNegativeError, mortgageInputErrors, rentalYieldInputErrors, buyVsRentInputErrors,
  airbnbInputErrors, loanOfferErrors, bondExtraInputErrors, municipalInputErrors,
} from '../utils/validation';
import { DEFAULT_MORTGAGE_INPUTS } from '../config/calculatorDefaults';

describe('rangeError', () => {
  it('passes values in range, including the ends', () => {
    expect(rangeError(0, 0, 30, 'a rate', '%')).toBeUndefined();
    expect(rangeError(30, 0, 30, 'a rate', '%')).toBeUndefined();
  });
  it('explains the range when outside it', () => {
    expect(rangeError(31, 0, 30, 'a rate', '%')).toBe('Enter a rate between 0 and 30%.');
    expect(rangeError(NaN, 1, 30, 'a term', ' years')).toBe('Enter a term between 1 and 30 years.');
  });
});

describe('nonNegativeError', () => {
  it('flags negatives only', () => {
    expect(nonNegativeError(0)).toBeUndefined();
    expect(nonNegativeError(-1)).toBe('Enter zero or more.');
  });
});

describe('mortgageInputErrors', () => {
  it('has no messages for the defaults', () => {
    expect(Object.values(mortgageInputErrors(DEFAULT_MORTGAGE_INPUTS)).filter(Boolean)).toEqual([]);
  });
  it('flags a deposit that covers the price', () => {
    const e = mortgageInputErrors({ ...DEFAULT_MORTGAGE_INPUTS, deposit: 1_150_000 });
    expect(e.deposit).toMatch(/covers the whole price/);
  });
  it('flags rate, term and price problems', () => {
    const e = mortgageInputErrors({ ...DEFAULT_MORTGAGE_INPUTS, purchasePrice: 0, interestRate: 45, termYears: 0 });
    expect(e.purchasePrice).toBeDefined();
    expect(e.interestRate).toBeDefined();
    expect(e.termYears).toBeDefined();
  });
});

describe('property calculator checks', () => {
  const rental = {
    purchasePrice: 1_200_000, deposit: 120_000, monthlyRent: 8_500, bondRate: 11.5, bondTerm: 20, vacancyMonths: 1,
    initiationFee: 6_037, levy: 1_800, rates: 900, insurance: 500, effluent: 350, misc: 0, maintenancePct: 1, agentFeePct: 8.5,
  };

  it('lets a rental be bought for cash but not for more than the price', () => {
    expect(rentalYieldInputErrors({ ...rental, deposit: 1_200_000 }).deposit).toBeUndefined();
    expect(rentalYieldInputErrors({ ...rental, deposit: 1_300_000 }).deposit).toMatch(/more than the price/);
  });

  it('flags a deposit above 100% in Buy vs Rent', () => {
    const e = buyVsRentInputErrors({
      purchasePrice: 1_500_000, depositPercent: 120, interestRatePercent: 11.5, loanTermYears: 20, monthlyRates: 1_500,
      monthlyLevies: 1_200, monthlyInsurance: 500, maintenancePercent: 1, propertyGrowthPercent: 5, otherAnnualIncome: 480_000,
      initiationFee: 6_037, monthlyRent: 8_500, annualRentEscalation: 8, investmentReturnPercent: 11,
    });
    expect(e.depositPercent).toBe('Enter a deposit between 0 and 100%.');
  });

  it('flags occupancy above 100% for an Airbnb', () => {
    const e = airbnbInputErrors({
      propertyValue: 2_000_000, monthlyBondCost: 0, nightlyRate: 1_200, occupancyPercent: 120, avgNightsPerStay: 3,
      platformFeePercent: 15, cleaningCostPerStay: 350, strManagementPercent: 0, monthlyStrExtraCosts: 2_000,
      monthlyRent: 14_000, ltrVacancyPercent: 5, ltrManagementPercent: 8, monthlyLtrExpenses: 2_000,
    });
    expect(e.occupancyPercent).toBe('Enter occupancy between 0 and 100%.');
  });

  it('flags an empty loan offer, a zero bond term and a negative rate in the rand', () => {
    expect(loanOfferErrors({ amount: 0, interestRate: 11, termYears: 20, initiationFee: 0, monthlyServiceFee: 69 }).amount).toBeDefined();
    expect(bondExtraInputErrors({ loan: 2_000_000, rate: 11.75, term: 0, extra: 0, annualLumpSum: 0 }).term).toBeDefined();
    expect(municipalInputErrors({ propValue: 1_500_000, waterKl: 15, electricityBasic: 0, escalation: 8, rateInRand: -0.01 }).rateInRand).toBeDefined();
  });
});
