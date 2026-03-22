export interface MortgageInputs {
  purchasePrice: number;
  deposit: number;
  interestRate: number;
  termYears: number;
  frequency: 'monthly' | 'biweekly';
  extraPayment: number;
  lumpSumYear: number; // 0 = none
  lumpSumAmount: number;
}

export interface MortgageResult {
  loanAmount: number;
  depositPercent: number;
  standardPayment: number;
  totalPaidStandard: number;
  totalInterestStandard: number;
  totalPaidWithExtras: number;
  totalInterestWithExtras: number;
  interestSaved: number;
  monthsSaved: number;
  biweeklyPayment: number;
  totalInterestBiweekly: number;
  interestSavedBiweekly: number;
  monthsSavedBiweekly: number;
  payoffDate: Date;
  payoffDateWithExtras: Date;
  amortization: AmortizationRow[];
  amortizationWithExtras: AmortizationRow[];
}

export interface AmortizationRow {
  period: number;
  date: Date;
  openingBalance: number;
  scheduledPayment: number;
  extraPayment: number;
  totalPayment: number;
  principal: number;
  interest: number;
  closingBalance: number;
  cumulativeInterest: number;
  isLumpSum: boolean;
}

export interface PropertyInputs {
  propertyName: string;
  purchasePrice: number;
  discount: number;
  deposit: number;
  interestRate: number;
  bondTerm: number;
  monthlyLevies: number;
  monthlyRates: number;
  insurance: number;
  managementFeePercent: number;
  vacancyRate: number;
  rentScenario1: number;
  rentScenario2: number;
  annualAppreciation: number;
}

export interface PropertyResult {
  effectivePurchasePrice: number;
  loanAmount: number;
  monthlyBondRepayment: number;
  managementFeeS1: number;
  managementFeeS2: number;
  totalMonthlyCostsS1: number;
  totalMonthlyCostsS2: number;
  monthlyEffectiveRentS1: number;
  monthlyEffectiveRentS2: number;
  cashFlowS1: number;
  cashFlowS2: number;
  grossYieldS1: number;
  grossYieldS2: number;
  netYieldS1: number;
  netYieldS2: number;
  roi5YearS1: number;
  roi5YearS2: number;
  roi10YearS1: number;
  roi10YearS2: number;
  propertyValueYears: { year: number; value: number; equity: number; loanBalance: number }[];
}

export interface CarInputs {
  vehiclePrice: number;
  deposit: number;
  balloonPercent: number;
  interestRate: number;
  termMonths: number;
  monthlyInsurance: number;
  monthlyFuel: number;
  monthlyMaintenance: number;
}

export interface CarResult {
  loanAmount: number;
  balloonAmount: number;
  financedAmount: number;
  monthlyInstalment: number;
  totalRepayments: number;
  totalInterest: number;
  totalCostOfOwnership: number;
  effectiveAnnualCost: number;
  depreciation: { year: number; value: number; loanBalance: number }[];
  underwaterMonths: number;
  cashPurchaseOpportunityCost: number;
  netCostFinancing: number;
  netCostCash: number;
}

export interface InvestingInputs {
  loanBalance: number;
  interestRate: number;
  remainingTermYears: number;
  extraMonthlyAmount: number;
  investmentVehicle: string;
  expectedReturn: number;
  cgtRate: number;
  inflationRate: number;
}

export interface InvestingResult {
  // Scenario A: extra to bond
  interestSaved: number;
  monthsSaved: number;
  newPayoffDate: Date;
  standardPayoffDate: Date;
  effectiveReturnA: number;

  // Scenario B: invest
  portfolioValueAtPayoff: number;
  afterTaxPortfolioValue: number;
  netBenefitB: number;

  winner: 'bond' | 'investing';
  winnerAmount: number;

  yearByYear: InvestingRow[];
}

export interface InvestingRow {
  year: number;
  bondBalanceA: number;
  bondBalanceB: number;
  investmentValue: number;
  netDifference: number;
  winner: 'A' | 'B';
}
