import { describe, it, expect } from 'vitest';
import { calcPropertyROI } from '../utils/roi';
import { calcTransferDuty, calcBondRegistrationCost } from '../utils/tax';

const baseInputs = {
  propertyName: 'Test Property',
  purchasePrice: 1_200_000,
  discount: 0,
  deposit: 120_000,
  interestRate: 11.25,
  bondTerm: 20,
  monthlyLevies: 1_500,
  monthlyRates: 800,
  insurance: 600,
  effluentFees: 350,
  miscFees: 200,
  monthlyServiceFee: 69,
  managementFeePercent: 10,
  vacancyRate: 8,
  rentScenario1: 9_500,
  rentScenario2: 11_000,
  annualAppreciation: 5,
  transferDutyExempt: false,
  bondRegistrationIncluded: false,
  initiationFee: 6_037,
  initiationFeeCapitalised: false,
};

describe('calcPropertyROI', () => {
  it('effective purchase price equals price when discount is 0', () => {
    const result = calcPropertyROI(baseInputs);
    expect(result.effectivePurchasePrice).toBe(1_200_000);
  });

  it('applies discount correctly', () => {
    const result = calcPropertyROI({ ...baseInputs, discount: 10 });
    expect(result.effectivePurchasePrice).toBe(1_080_000);
  });

  it('loan amount is price minus deposit', () => {
    const result = calcPropertyROI(baseInputs);
    expect(result.loanAmount).toBe(1_080_000);
  });

  it('effective rent accounts for vacancy', () => {
    const result = calcPropertyROI(baseInputs);
    // 8% vacancy → 92% occupancy
    expect(result.monthlyEffectiveRentS1).toBeCloseTo(9_500 * 0.92, 1);
  });

  it('gross yield is based on full rent, not vacancy-adjusted', () => {
    const result = calcPropertyROI(baseInputs);
    const expectedGross = ((9_500 * 12) / 1_200_000) * 100;
    expect(result.grossYieldS1).toBeCloseTo(expectedGross, 2);
  });

  it('management fee is % of effective rent', () => {
    const result = calcPropertyROI(baseInputs);
    expect(result.managementFeeS1).toBeCloseTo(result.monthlyEffectiveRentS1 * 0.10, 2);
  });

  it('cash flow = effective rent - all costs', () => {
    const result = calcPropertyROI(baseInputs);
    const expectedCashFlow = result.monthlyEffectiveRentS1 - result.totalMonthlyCostsS1;
    expect(result.cashFlowS1).toBeCloseTo(expectedCashFlow, 2);
  });

  it('scenario 2 cash flow is higher than scenario 1 (higher rent)', () => {
    const result = calcPropertyROI(baseInputs);
    expect(result.cashFlowS2).toBeGreaterThan(result.cashFlowS1);
  });

  it('10-year ROI is greater than 5-year ROI', () => {
    const result = calcPropertyROI(baseInputs);
    expect(result.roi10YearS1).toBeGreaterThan(result.roi5YearS1);
  });

  it('property value grows over time', () => {
    const result = calcPropertyROI(baseInputs);
    const year0 = result.propertyValueYears[0].value;
    const year10 = result.propertyValueYears[10].value;
    expect(year10).toBeGreaterThan(year0);
  });

  it('equity increases as loan is paid down', () => {
    const result = calcPropertyROI(baseInputs);
    const equity0 = result.propertyValueYears[0].equity;
    const equity10 = result.propertyValueYears[10].equity;
    expect(equity10).toBeGreaterThan(equity0);
  });

  it('propertyValueYears has 11 entries (year 0 to year 10)', () => {
    const result = calcPropertyROI(baseInputs);
    expect(result.propertyValueYears).toHaveLength(11);
  });

  it('totalCashRequired includes deposit + transfer duty + bond registration + initiation fee', () => {
    const result = calcPropertyROI(baseInputs);
    expect(result.totalCashRequired).toBe(
      baseInputs.deposit + result.transferDuty + result.bondRegistrationCost + baseInputs.initiationFee
    );
  });

  it('capitalising the initiation fee adds it to the loan amount', () => {
    const cash        = calcPropertyROI(baseInputs);
    const capitalised = calcPropertyROI({ ...baseInputs, initiationFeeCapitalised: true });
    expect(capitalised.loanAmount).toBeCloseTo(cash.loanAmount + baseInputs.initiationFee, 0);
  });

  it('capitalising the initiation fee removes it from cash required', () => {
    const cash        = calcPropertyROI(baseInputs);
    const capitalised = calcPropertyROI({ ...baseInputs, initiationFeeCapitalised: true });
    expect(capitalised.totalCashRequired).toBeCloseTo(cash.totalCashRequired - baseInputs.initiationFee, 0);
  });

  it('capitalising the initiation fee increases the monthly bond repayment', () => {
    const cash        = calcPropertyROI(baseInputs);
    const capitalised = calcPropertyROI({ ...baseInputs, initiationFeeCapitalised: true });
    expect(capitalised.monthlyBondRepayment).toBeGreaterThan(cash.monthlyBondRepayment);
  });

  it('financing the bond registration cost (bondRegistrationIncluded) adds it to the loan amount', () => {
    const cash      = calcPropertyROI({ ...baseInputs, bondRegistrationIncluded: false });
    const financed  = calcPropertyROI({ ...baseInputs, bondRegistrationIncluded: true });
    expect(financed.loanAmount).toBeGreaterThan(cash.loanAmount);
    expect(financed.monthlyBondRepayment).toBeGreaterThan(cash.monthlyBondRepayment);
  });

  it('transfer duty is zero when exempt', () => {
    const result = calcPropertyROI({ ...baseInputs, transferDutyExempt: true });
    expect(result.transferDuty).toBe(0);
  });

  it('bond registration cost is zero when included in loan', () => {
    const result = calcPropertyROI({ ...baseInputs, bondRegistrationIncluded: true });
    expect(result.bondRegistrationCost).toBe(0);
  });

  it('totalCashRequired is lower when bond registration is excluded', () => {
    const withReg    = calcPropertyROI({ ...baseInputs, bondRegistrationIncluded: false });
    const withoutReg = calcPropertyROI({ ...baseInputs, bondRegistrationIncluded: true });
    expect(withReg.totalCashRequired).toBeGreaterThan(withoutReg.totalCashRequired);
  });

  it('total cash required is higher when transfer duty applies', () => {
    const withDuty    = calcPropertyROI({ ...baseInputs, transferDutyExempt: false });
    const withoutDuty = calcPropertyROI({ ...baseInputs, transferDutyExempt: true });
    expect(withDuty.totalCashRequired).toBeGreaterThan(withoutDuty.totalCashRequired);
  });
});

describe('calcTransferDuty (SARS 2026)', () => {
  it('returns 0 for properties up to R1 100 000', () => {
    expect(calcTransferDuty(1_100_000)).toBe(0);
    expect(calcTransferDuty(500_000)).toBe(0);
  });

  it('applies 3% on value above R1.1M (second bracket)', () => {
    // R1 200 000: 3% × (1 200 000 - 1 100 000) = R3 000
    expect(calcTransferDuty(1_200_000)).toBe(3_000);
  });

  it('applies correct amount in third bracket', () => {
    // R1 600 000: R12 375 + 6% × (1 600 000 - 1 512 500) = R12 375 + R5 250 = R17 625
    expect(calcTransferDuty(1_600_000)).toBe(17_625);
  });

  it('returns 0 for zero price', () => {
    expect(calcTransferDuty(0)).toBe(0);
  });
});

describe('calcBondRegistrationCost', () => {
  it('returns 0 for zero bond', () => {
    expect(calcBondRegistrationCost(0)).toBe(0);
  });

  it('returns a positive value for standard bond', () => {
    expect(calcBondRegistrationCost(1_000_000)).toBeGreaterThan(0);
  });

  it('higher bond = higher registration cost', () => {
    const low  = calcBondRegistrationCost(500_000);
    const high = calcBondRegistrationCost(2_000_000);
    expect(high).toBeGreaterThan(low);
  });
});
