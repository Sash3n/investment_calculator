/**
 * Input checks for the calculators. They only produce messages for the
 * inputs; they never change what the calculations do.
 */
import type { MortgageInputs, PropertyInputs } from '../types';
import type { AffordabilityInputs } from './affordability';

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

/** Deposit message shared by the property calculators. */
export function depositError(deposit: number, price: number): string | undefined {
  if (deposit < 0) return 'The deposit can\u2019t be negative.';
  if (price > 0 && deposit >= price) return 'The deposit covers the whole price, so there is no bond to work out.';
  return undefined;
}

export function propertyInputErrors(i: PropertyInputs): FieldErrors<keyof PropertyInputs> {
  return {
    purchasePrice: positiveError(i.purchasePrice, 'Enter the price of the property.'),
    discount: rangeError(i.discount, 0, 100, 'a discount', '%'),
    deposit: depositError(i.deposit, i.purchasePrice * (1 - i.discount / 100)),
    interestRate: rangeError(i.interestRate, 0, 30, 'a rate', '%'),
    bondTerm: rangeError(i.bondTerm, 1, 30, 'a term', ' years'),
    vacancyRate: rangeError(i.vacancyRate, 0, 100, 'a vacancy rate', '%'),
    managementFeePercent: rangeError(i.managementFeePercent, 0, 100, 'a management fee', '%'),
    rentScenario1: nonNegativeError(i.rentScenario1),
    rentScenario2: nonNegativeError(i.rentScenario2),
    annualAppreciation: rangeError(i.annualAppreciation, -20, 30, 'yearly growth', '%'),
  };
}

export function affordabilityInputErrors(i: AffordabilityInputs): FieldErrors<keyof AffordabilityInputs> {
  return {
    grossMonthlyIncome: positiveError(i.grossMonthlyIncome, 'Enter your income before tax.'),
    existingMonthlyDebt: nonNegativeError(i.existingMonthlyDebt),
    depositAvailable: nonNegativeError(i.depositAvailable),
    interestRate: rangeError(i.interestRate, 0, 30, 'a rate', '%'),
    instalmentRatio: rangeError(i.instalmentRatio, 1, 100, 'a limit', '%'),
    dtiRatio: rangeError(i.dtiRatio, 1, 100, 'a limit', '%'),
    stressDelta: rangeError(i.stressDelta, 0, 10, 'an increase', '%'),
    desiredPropertyPrice: nonNegativeError(i.desiredPropertyPrice),
  };
}
