export interface MortgageInputs {
  purchasePrice: number;
  deposit: number;
  interestRate: number;
  termYears: number;
  frequency: 'monthly' | 'biweekly';
  extraPayment: number;
  lumpSumYear: number; // 0 = none
  lumpSumAmount: number;
  monthlyServiceFee: number; // bank admin fee, e.g. R69/month
  initiationFee: number;     // once-off upfront fee (NCA cap R6,037 for bonds > R500K)
  initiationFeeCapitalised: boolean; // true = financed into the loan instead of paid upfront in cash
  utilityConnectionFee?: number; // once-off utility connection / activation fee (water, electricity, etc.)
  transferDutyExempt: boolean;
  bondRegistrationIncluded: boolean;
}

export interface MortgageResult {
  loanAmount: number;
  bondRegCost: number;
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
  // Service fee totals
  totalServiceFees: number;
  effectiveMonthlyPayment: number; // scheduled payment + service fee
  totalCostIncludingFees: number;
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
  effluentFees: number;
  miscFees: number;
  monthlyServiceFee: number; // bond bank admin fee, e.g. R69/month
  managementFeePercent: number;
  vacancyRate: number;
  rentScenario1: number;
  rentScenario2: number;
  annualAppreciation: number;
  /** When true, transfer duty is excluded (e.g. VAT-registered seller / new build) */
  transferDutyExempt: boolean;
  /** When true, bond registration costs are excluded (e.g. capitalised into loan / bank promotion) */
  bondRegistrationIncluded: boolean;
  /** Once-off utility connection / activation fee (water, electricity, etc.) — part of upfront cash */
  utilityConnectionFee?: number;
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
  // Acquisition costs
  transferDuty: number;
  bondRegistrationCost: number;
  totalAcquisitionCost: number;   // deposit + transfer duty + bond reg
  totalCashRequired: number;      // same as totalAcquisitionCost — explicit alias
}

export interface CarInputs {
  vehiclePrice: number;
  deposit: number;
  balloonPercent: number;
  interestRate: number;
  termMonths: number;
  minimumInstalment: number;  // bank-quoted minimum (0 = use calculated)
  extraMonthlyPayment: number;
  monthlyServiceFee: number;  // bank admin/service fee
  monthlyInsurance: number;
  monthlyFuel: number;
  monthlyMaintenance: number;
}

export interface CarAmortizationRow {
  period: number;
  openingBalance: number;
  payment: number;
  principal: number;
  interest: number;
  closingBalance: number;
  cumulativeInterest: number;
}

export interface CarResult {
  loanAmount: number;
  balloonAmount: number;
  financedAmount: number;
  calculatedInstalment: number;    // pure annuity formula result
  monthlyInstalment: number;       // effective: max(calculated, minimum)
  instalmentOverride: boolean;     // true when bank minimum > calculated
  totalRepayments: number;
  totalInterest: number;
  // Extra payment results
  totalInterestWithExtra: number;
  totalPaidWithExtra: number;
  interestSaved: number;
  monthsSaved: number;
  actualTermMonths: number;
  // Service fee totals
  totalServiceFees: number;
  effectiveMonthlyPayment: number; // instalment + service fee
  totalCostOfOwnership: number;    // includes service fees
  effectiveAnnualCost: number;
  depreciation: { year: number; value: number; loanBalance: number }[];
  underwaterMonths: number;
  cashPurchaseOpportunityCost: number;
  netCostFinancing: number;
  netCostCash: number;
  amortization: CarAmortizationRow[];
  amortizationWithExtras: CarAmortizationRow[];
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

// ── Tax Planner ───────────────────────────────────────────────────────────────

export type AgeGroup = 'under65' | '65to74' | '75plus';
export type PropertyType = 'primary' | 'investment';
export type UDZBuildingType = 'new' | 'improvements' | 'lowcost';

export interface RentalTaxInputs {
  monthlyGrossRent: number;
  annualBondInterest: number;      // interest portion only (not capital)
  annualRates: number;
  annualLevies: number;
  annualInsurance: number;
  annualRepairs: number;
  managementFeePercent: number;    // % of effective annual rent
  annualAdvertising: number;
  otherDeductions: number;
  otherAnnualIncome: number;       // salary / other income
  ageGroup: AgeGroup;
}

export interface RentalTaxResult {
  annualGrossRent: number;
  managementFee: number;
  totalDeductions: number;
  taxableRentalIncome: number;
  totalTaxableIncome: number;       // rental + other income
  taxOnTotalIncome: number;
  taxOnOtherIncomeOnly: number;
  taxAttributableToRental: number;
  effectiveTaxRateOnRental: number;
  marginalRate: number;
  afterTaxMonthlyRentalCashFlow: number;
  deductionsBreakdown: { name: string; value: number }[];
  bracketLabel: string;
}

export interface S13Unit {
  id: string;
  name: string;
  purchasePrice: number;         // building cost excl. land
  monthlyRent: number;
  isLowCostHousing: boolean;
  monthlyBondRepayment: number;
  monthlyLevies: number;
  monthlyRates: number;
  monthlyInsurance: number;
  managementFeePercent: number;
  vacancyRate: number;           // percent 0–100
  portfolioId?: string;
}

export interface S13UnitResult {
  id: string;
  name: string;
  purchasePrice: number;
  annualDeductionPerUnit: number;
  deductionPeriodYears: number;
  annualRent: number;
  monthlyExpenses: number;
  annualExpenses: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  grossYield: number;
  netYield: number;
}

export interface Section13sexInputs {
  units: S13Unit[];
  annualTaxableIncome: number;
  raMonthlyContrib: number;
  ageGroup: AgeGroup;
}

export interface Section13sexResult {
  qualifies: boolean;
  reason?: string;
  numberOfUnits: number;
  totalCostExclLand: number;
  annualDeduction: number;
  annualTaxSaving: number;
  totalTaxSavingOverPeriod: number;
  deductionPeriodYears: number;
  deductionRate: number;
  schedule: {
    year: number;
    deduction: number;
    taxSaving: number;
    cumulativeSaving: number;
    raTaxSaving: number;
    combinedSaving: number;
    combinedCumulative: number;
  }[];
  unitResults: S13UnitResult[];
  totalAnnualRent: number;
  totalAnnualExpenses: number;
  totalAnnualCashFlow: number;
  totalGrossYield: number;
  totalNetYield: number;
  raAnnualDeduction: number;
  raTaxSaving: number;
  combinedAnnualTaxSaving: number;
  marginalRate: number;
}

export interface Section13quatInputs {
  buildingCost: number;
  buildingType: UDZBuildingType;
  annualTaxableIncome: number;
  ageGroup: AgeGroup;
}

export interface Section13quatResult {
  totalAllowance: number;
  schedule: { year: number; rate: number; deduction: number; taxSaving: number; cumulativeSaving: number }[];
  totalTaxSaving: number;
  year1Deduction: number;
  year1TaxSaving: number;
}

export interface CGTInputs {
  purchasePrice: number;
  acquisitionCosts: number;        // transfer duty, bond reg, legal fees
  salePrice: number;
  saleCostsPercent: number;        // agent commission %
  propertyType: PropertyType;
  jointOwnership: boolean;         // 50/50 spouse — splits primary exclusion
  otherAnnualTaxableIncome: number;
  ageGroup: AgeGroup;
}

export interface CGTResult {
  grossCapitalGain: number;
  saleCosts: number;
  baseCost: number;
  primaryResidenceExclusion: number;
  annualExclusion: number;
  netGainAfterExclusions: number;
  inclusionAmount: number;         // 40% of net gain
  taxOnIncomeWithCGT: number;
  taxOnIncomeWithoutCGT: number;
  cgtPayable: number;
  effectiveCGTRate: number;
  netProceedsAfterCGT: number;
  marginalRate: number;
  bracketLabel: string;
}
