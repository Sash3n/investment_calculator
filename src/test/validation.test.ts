import { describe, it, expect } from 'vitest';
import { rangeError, nonNegativeError, mortgageInputErrors } from '../utils/validation';
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
