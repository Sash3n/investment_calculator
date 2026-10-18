/**
 * Input checks for the calculators. They only produce messages for the
 * inputs; they never change what the calculations do.
 */
import type { MortgageInputs } from '../types';

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** "Enter a rate between 0 and 30%." style message, or undefined when in range. */
export function rangeError(value: number, min: number, max: number, what: string, unit = ''): string | undefined {
  if (!Number.isFinite(value) || value < min || value > max) {
    return `Enter ${what} between ${min} and ${max}${unit}.`;
  }
  return undefined;
}

/** Message for a rand amount that must not be negative. */
export function nonNegativeError(value: number): string | undefined {
  return value < 0 ? 'Enter zero or more.' : undefined;
}

/** Message for an amount that must be above zero. */
export function positiveError(value: number, message: string): string | undefined {
  return value > 0 ? undefined : message;
}

export function mortgageInputErrors(i: MortgageInputs): FieldErrors<keyof MortgageInputs> {
  return {
    purchasePrice: positiveError(i.purchasePrice, 'Enter the price of the home.'),
    deposit: i.deposit < 0
      ? 'The deposit can’t be negative.'
      : i.purchasePrice > 0 && i.deposit >= i.purchasePrice
        ? 'The deposit covers the whole price, so there is no bond to work out.'
        : undefined,
    interestRate: rangeError(i.interestRate, 0, 30, 'a rate', '%'),
    termYears: rangeError(i.termYears, 1, 30, 'a term', ' years'),
    extraPayment: nonNegativeError(i.extraPayment),
    lumpSumAmount: nonNegativeError(i.lumpSumAmount),
  };
}
