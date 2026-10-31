/**
 * Starting inputs for calculators whose full input object is also built
 * elsewhere (the home page bond calculator and journey hand-offs), so every
 * entry point starts from the same values.
 */
import { FALLBACK_PRIME } from '../hooks/usePrimeRate';
import type { MortgageInputs, PropertyInputs } from '../types';

export const DEFAULT_MORTGAGE_INPUTS: MortgageInputs = {
  purchasePrice: 1150000,
  deposit: 100000,
  interestRate: FALLBACK_PRIME,
  termYears: 20,
  frequency: 'monthly',
  extraPayment: 0,
  lumpSumYear: 0,
  lumpSumAmount: 0,
  monthlyServiceFee: 69,
  initiationFee: 6037,
  initiationFeeCapitalised: false,
  utilityConnectionFee: 1500,
  transferDutyExempt: false,
  bondRegistrationIncluded: false,
};

export const DEFAULT_PROPERTY_INPUTS: PropertyInputs = {
  propertyName: 'My Investment Property',
  purchasePrice: 1200000,
  discount: 0,
  deposit: 120000,
  interestRate: FALLBACK_PRIME,
  bondTerm: 20,
  monthlyLevies: 1500,
  monthlyRates: 800,
  insurance: 600,
  effluentFees: 350,
  miscFees: 0,
  monthlyServiceFee: 69,
  managementFeePercent: 8,
  vacancyRate: 5,
  rentScenario1: 9500,
  rentScenario2: 11000,
  annualAppreciation: 7,
  transferDutyExempt: false,
  bondRegistrationIncluded: false,
  utilityConnectionFee: 1500,
  initiationFee: 6037,
  initiationFeeCapitalised: false,
};
