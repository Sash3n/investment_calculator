/**
 * Input checks for the calculators. They only produce messages for the
 * inputs; they never change what the calculations do.
 */
import type { CarInputs, MortgageInputs, PropertyInputs } from '../types';
import type { AffordabilityInputs } from './affordability';
import type { STRvsLTRInputs } from './shortTermRental';
import { formatRand } from './format';

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

/** The Buy vs Rent inputs that can be wrong. */
export interface BuyVsRentChecked {
  purchasePrice: number;
  depositPercent: number;
  interestRatePercent: number;
  loanTermYears: number;
  monthlyRates: number;
  monthlyLevies: number;
  monthlyInsurance: number;
  maintenancePercent: number;
  propertyGrowthPercent: number;
  otherAnnualIncome: number;
  initiationFee: number;
  monthlyRent: number;
  annualRentEscalation: number;
  investmentReturnPercent: number;
}

export function buyVsRentInputErrors(i: BuyVsRentChecked): FieldErrors<keyof BuyVsRentChecked> {
  return {
    purchasePrice: positiveError(i.purchasePrice, 'Enter the price of the home.'),
    depositPercent: rangeError(i.depositPercent, 0, 100, 'a deposit', '%'),
    interestRatePercent: rangeError(i.interestRatePercent, 0, 30, 'a rate', '%'),
    loanTermYears: rangeError(i.loanTermYears, 1, 30, 'a term', ' years'),
    monthlyRates: nonNegativeError(i.monthlyRates),
    monthlyLevies: nonNegativeError(i.monthlyLevies),
    monthlyInsurance: nonNegativeError(i.monthlyInsurance),
    maintenancePercent: rangeError(i.maintenancePercent, 0, 10, 'maintenance', '%'),
    propertyGrowthPercent: rangeError(i.propertyGrowthPercent, -20, 30, 'yearly growth', '%'),
    otherAnnualIncome: nonNegativeError(i.otherAnnualIncome),
    initiationFee: nonNegativeError(i.initiationFee),
    monthlyRent: positiveError(i.monthlyRent, 'Enter the monthly rent.'),
    annualRentEscalation: rangeError(i.annualRentEscalation, -20, 30, 'a yearly increase', '%'),
    investmentReturnPercent: rangeError(i.investmentReturnPercent, -20, 30, 'a return', '%'),
  };
}

export interface RentalYieldChecked {
  purchasePrice: number;
  deposit: number;
  monthlyRent: number;
  bondRate: number;
  bondTerm: number;
  vacancyMonths: number;
  initiationFee: number;
  levy: number;
  rates: number;
  insurance: number;
  effluent: number;
  misc: number;
  maintenancePct: number;
  agentFeePct: number;
}

export function rentalYieldInputErrors(i: RentalYieldChecked): FieldErrors<keyof RentalYieldChecked> {
  return {
    purchasePrice: positiveError(i.purchasePrice, 'Enter the price of the property.'),
    // A cash purchase is fine here, so only a deposit above the price is flagged
    deposit: i.deposit < 0
      ? 'The deposit can’t be negative.'
      : i.purchasePrice > 0 && i.deposit > i.purchasePrice ? 'The deposit can’t be more than the price.' : undefined,
    monthlyRent: positiveError(i.monthlyRent, 'Enter the rent you expect.'),
    bondRate: rangeError(i.bondRate, 0, 30, 'a rate', '%'),
    bondTerm: rangeError(i.bondTerm, 1, 30, 'a term', ' years'),
    vacancyMonths: rangeError(i.vacancyMonths, 0, 12, 'a vacancy', ' months'),
    initiationFee: nonNegativeError(i.initiationFee),
    levy: nonNegativeError(i.levy),
    rates: nonNegativeError(i.rates),
    insurance: nonNegativeError(i.insurance),
    effluent: nonNegativeError(i.effluent),
    misc: nonNegativeError(i.misc),
    maintenancePct: rangeError(i.maintenancePct, 0, 10, 'maintenance', '%'),
    agentFeePct: rangeError(i.agentFeePct, 0, 50, 'a fee', '%'),
  };
}

export function airbnbInputErrors(i: STRvsLTRInputs): FieldErrors<keyof STRvsLTRInputs> {
  return {
    propertyValue: positiveError(i.propertyValue, 'Enter the value of the property.'),
    monthlyBondCost: nonNegativeError(i.monthlyBondCost),
    nightlyRate: positiveError(i.nightlyRate, 'Enter the nightly rate.'),
    occupancyPercent: rangeError(i.occupancyPercent, 0, 100, 'occupancy', '%'),
    avgNightsPerStay: rangeError(i.avgNightsPerStay, 1, 365, 'a stay', ' nights'),
    platformFeePercent: rangeError(i.platformFeePercent, 0, 50, 'a fee', '%'),
    cleaningCostPerStay: nonNegativeError(i.cleaningCostPerStay),
    strManagementPercent: rangeError(i.strManagementPercent, 0, 50, 'a fee', '%'),
    monthlyStrExtraCosts: nonNegativeError(i.monthlyStrExtraCosts),
    monthlyRent: positiveError(i.monthlyRent, 'Enter the monthly rent.'),
    ltrVacancyPercent: rangeError(i.ltrVacancyPercent, 0, 100, 'a vacancy', '%'),
    ltrManagementPercent: rangeError(i.ltrManagementPercent, 0, 50, 'a fee', '%'),
    monthlyLtrExpenses: nonNegativeError(i.monthlyLtrExpenses),
  };
}

export interface LoanOfferChecked {
  amount: number;
  interestRate: number;
  termYears: number;
  initiationFee: number;
  monthlyServiceFee: number;
}

export function loanOfferErrors(i: LoanOfferChecked): FieldErrors<keyof LoanOfferChecked> {
  return {
    amount: positiveError(i.amount, 'Enter the loan amount.'),
    interestRate: rangeError(i.interestRate, 0, 30, 'a rate', '%'),
    termYears: rangeError(i.termYears, 1, 30, 'a term', ' years'),
    initiationFee: nonNegativeError(i.initiationFee),
    monthlyServiceFee: nonNegativeError(i.monthlyServiceFee),
  };
}

export function bondExtraInputErrors(i: { loan: number; rate: number; term: number; extra: number; annualLumpSum: number }) {
  return {
    loan: positiveError(i.loan, 'Enter what you still owe on the bond.'),
    rate: rangeError(i.rate, 0, 30, 'a rate', '%'),
    term: rangeError(i.term, 1, 30, 'a term', ' years'),
    extra: nonNegativeError(i.extra),
    annualLumpSum: nonNegativeError(i.annualLumpSum),
  };
}

export function municipalInputErrors(i: { propValue: number; waterKl: number; electricityBasic: number; escalation: number; rateInRand: number }) {
  return {
    propValue: positiveError(i.propValue, 'Enter the municipal value of the property.'),
    waterKl: rangeError(i.waterKl, 0, 100, 'water use', ' kL'),
    electricityBasic: nonNegativeError(i.electricityBasic),
    escalation: rangeError(i.escalation, 0, 25, 'an increase', '%'),
    rateInRand: nonNegativeError(i.rateInRand),
  };
}

export function debtErrors(d: { balance: number; rate: number; minPayment: number }) {
  const monthlyInterest = (d.balance * d.rate) / 100 / 12;
  return {
    balance: nonNegativeError(d.balance),
    rate: rangeError(d.rate, 0, 50, 'a rate', '%'),
    minPayment: d.minPayment < 0
      ? 'Enter zero or more.'
      : d.balance > 0 && d.minPayment === 0
        ? 'Enter the minimum payment, or this debt is left out.'
        : d.balance > 0 && d.minPayment <= monthlyInterest
          ? `This doesn’t cover the interest of about ${formatRand(Math.ceil(monthlyInterest), 0)} a month.`
          : undefined,
  };
}

export function carInputErrors(i: CarInputs): FieldErrors<keyof CarInputs> {
  return {
    vehiclePrice: positiveError(i.vehiclePrice, 'Enter the price of the car.'),
    deposit: i.deposit < 0
      ? 'The deposit can’t be negative.'
      : i.vehiclePrice > 0 && i.deposit >= i.vehiclePrice ? 'The deposit covers the whole price, so there is nothing to finance.' : undefined,
    balloonPercent: rangeError(i.balloonPercent, 0, 40, 'a balloon', '%'),
    interestRate: rangeError(i.interestRate, 0, 30, 'a rate', '%'),
    termMonths: rangeError(i.termMonths, 12, 96, 'a term', ' months'),
    minimumInstalment: nonNegativeError(i.minimumInstalment),
    extraMonthlyPayment: nonNegativeError(i.extraMonthlyPayment),
    monthlyServiceFee: nonNegativeError(i.monthlyServiceFee),
    monthlyInsurance: nonNegativeError(i.monthlyInsurance),
    monthlyFuel: nonNegativeError(i.monthlyFuel),
    monthlyMaintenance: nonNegativeError(i.monthlyMaintenance),
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
