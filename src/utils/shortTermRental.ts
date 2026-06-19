/**
 * FinCalc ZA — Short-term (Airbnb) vs Long-term Rental
 *
 * Compares the net operating income, yield and monthly cash flow of running a
 * property as a short-term let (Airbnb / booking platforms) versus a traditional
 * long-term lease. Net operating income is calculated BEFORE bond finance so the
 * two strategies are compared on a like-for-like basis; an optional monthly bond
 * cost is then applied to both to show true cash flow.
 */

export interface STRvsLTRInputs {
  propertyValue: number;
  monthlyBondCost: number;       // applied equally to both strategies (0 = owned outright)

  // Short-term let
  nightlyRate: number;
  occupancyPercent: number;      // % of nights booked
  avgNightsPerStay: number;
  platformFeePercent: number;    // Airbnb host service fee etc.
  cleaningCostPerStay: number;   // host-borne cleaning per booking
  strManagementPercent: number;  // co-host / management company % of revenue
  monthlyStrExtraCosts: number;  // utilities, wifi, consumables, furniture wear

  // Long-term lease
  monthlyRent: number;
  ltrVacancyPercent: number;
  ltrManagementPercent: number;  // letting agent % of rent
  monthlyLtrExpenses: number;    // levies, rates, insurance, maintenance combined
}

export interface STRvsLTRResult {
  str: {
    occupiedNights: number;
    numberOfStays: number;
    grossRevenue: number;
    platformFees: number;
    cleaningCosts: number;
    managementFees: number;
    extraCosts: number;
    netOperatingIncome: number;  // annual, before bond
    netYield: number;            // NOI / property value
    monthlyCashFlow: number;     // (NOI/12) − bond
  };
  ltr: {
    grossRent: number;
    managementFees: number;
    expenses: number;
    netOperatingIncome: number;
    netYield: number;
    monthlyCashFlow: number;
  };
  winner: 'str' | 'ltr' | 'tie';
  annualDifference: number;       // positive = STR earns more
  breakEvenOccupancy: number | null; // STR occupancy % that matches LTR NOI
}

export function calcSTRvsLTR(inputs: STRvsLTRInputs): STRvsLTRResult {
  const {
    propertyValue, monthlyBondCost,
    nightlyRate, occupancyPercent, avgNightsPerStay, platformFeePercent,
    cleaningCostPerStay, strManagementPercent, monthlyStrExtraCosts,
    monthlyRent, ltrVacancyPercent, ltrManagementPercent, monthlyLtrExpenses,
  } = inputs;

  // ── Short-term let ───────────────────────────────────────────
  const occupiedNights = 365 * (occupancyPercent / 100);
  const numberOfStays = avgNightsPerStay > 0 ? occupiedNights / avgNightsPerStay : 0;
  const grossRevenue = occupiedNights * nightlyRate;
  const platformFees = grossRevenue * (platformFeePercent / 100);
  const cleaningCosts = numberOfStays * cleaningCostPerStay;
  const strManagementFees = grossRevenue * (strManagementPercent / 100);
  const strExtraCosts = monthlyStrExtraCosts * 12;
  const strNOI = grossRevenue - platformFees - cleaningCosts - strManagementFees - strExtraCosts;
  const strNetYield = propertyValue > 0 ? (strNOI / propertyValue) * 100 : 0;
  const strMonthlyCashFlow = strNOI / 12 - monthlyBondCost;

  // ── Long-term lease ──────────────────────────────────────────
  const grossRent = monthlyRent * 12 * (1 - ltrVacancyPercent / 100);
  const ltrManagementFees = grossRent * (ltrManagementPercent / 100);
  const ltrExpenses = monthlyLtrExpenses * 12;
  const ltrNOI = grossRent - ltrManagementFees - ltrExpenses;
  const ltrNetYield = propertyValue > 0 ? (ltrNOI / propertyValue) * 100 : 0;
  const ltrMonthlyCashFlow = ltrNOI / 12 - monthlyBondCost;

  const annualDifference = strNOI - ltrNOI;
  const winner: STRvsLTRResult['winner'] =
    Math.abs(annualDifference) < 1 ? 'tie' : annualDifference > 0 ? 'str' : 'ltr';

  // Break-even occupancy: occupancy % where STR NOI equals LTR NOI.
  // strNOI(occ) = nights(occ)*[rate*(1 - platform% - mgmt%) − cleaning/avgNights] − extraCosts
  // Solve for the occupancy fraction.
  const perNightNet =
    nightlyRate * (1 - platformFeePercent / 100 - strManagementPercent / 100) -
    (avgNightsPerStay > 0 ? cleaningCostPerStay / avgNightsPerStay : 0);
  let breakEvenOccupancy: number | null = null;
  if (perNightNet > 0) {
    const nightsNeeded = (ltrNOI + strExtraCosts) / perNightNet;
    const occ = (nightsNeeded / 365) * 100;
    breakEvenOccupancy = occ >= 0 && occ <= 100 ? Math.round(occ * 10) / 10 : null;
  }

  return {
    str: {
      occupiedNights: Math.round(occupiedNights),
      numberOfStays: Math.round(numberOfStays),
      grossRevenue,
      platformFees,
      cleaningCosts,
      managementFees: strManagementFees,
      extraCosts: strExtraCosts,
      netOperatingIncome: strNOI,
      netYield: strNetYield,
      monthlyCashFlow: strMonthlyCashFlow,
    },
    ltr: {
      grossRent,
      managementFees: ltrManagementFees,
      expenses: ltrExpenses,
      netOperatingIncome: ltrNOI,
      netYield: ltrNetYield,
      monthlyCashFlow: ltrMonthlyCashFlow,
    },
    winner,
    annualDifference,
    breakEvenOccupancy,
  };
}
