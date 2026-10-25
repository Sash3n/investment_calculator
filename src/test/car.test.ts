import { describe, it, expect } from 'vitest';
import { calcCarFinance, balloonInstalment } from '../utils/car';

const baseInputs = {
  vehiclePrice: 400_000,
  deposit: 40_000,
  balloonPercent: 0,
  interestRate: 11.25,
  termMonths: 72,
  minimumInstalment: 0,
  extraMonthlyPayment: 0,
  monthlyServiceFee: 69,
  monthlyInsurance: 1_200,
  monthlyFuel: 1_500,
  monthlyMaintenance: 500,
};

describe('calcCarFinance', () => {
  it('loan amount is vehicle price minus deposit', () => {
    const result = calcCarFinance(baseInputs);
    expect(result.loanAmount).toBe(360_000);
  });

  it('balloon amount is zero when balloonPercent is 0', () => {
    const result = calcCarFinance(baseInputs);
    expect(result.balloonAmount).toBe(0);
  });

  it('balloon amount is correct percentage of vehicle price', () => {
    const result = calcCarFinance({ ...baseInputs, balloonPercent: 20 });
    expect(result.balloonAmount).toBe(80_000);
  });

  it('financed amount = loan - balloon', () => {
    const result = calcCarFinance({ ...baseInputs, balloonPercent: 20 });
    expect(result.financedAmount).toBe(360_000 - 80_000);
  });

  it('monthly instalment is positive', () => {
    const result = calcCarFinance(baseInputs);
    expect(result.monthlyInstalment).toBeGreaterThan(0);
  });

  it('bank minimum overrides calculated instalment when higher', () => {
    const result = calcCarFinance({ ...baseInputs, minimumInstalment: 10_000 });
    expect(result.monthlyInstalment).toBe(10_000);
    expect(result.instalmentOverride).toBe(true);
  });

  it('no override when minimum is lower than calculated', () => {
    const result = calcCarFinance({ ...baseInputs, minimumInstalment: 100 });
    expect(result.instalmentOverride).toBe(false);
  });

  it('total interest is positive', () => {
    const result = calcCarFinance(baseInputs);
    expect(result.totalInterest).toBeGreaterThan(0);
  });

  it('extra payments save interest', () => {
    const withExtra = calcCarFinance({ ...baseInputs, extraMonthlyPayment: 1_000 });
    expect(withExtra.interestSaved).toBeGreaterThan(0);
    expect(withExtra.monthsSaved).toBeGreaterThan(0);
  });

  it('depreciation has entries from year 0', () => {
    const result = calcCarFinance(baseInputs);
    expect(result.depreciation[0].year).toBe(0);
    expect(result.depreciation[0].value).toBe(400_000);
  });

  it('vehicle value decreases each year', () => {
    const result = calcCarFinance(baseInputs);
    for (let i = 1; i < result.depreciation.length; i++) {
      expect(result.depreciation[i].value).toBeLessThan(result.depreciation[i - 1].value);
    }
  });

  it('service fee adds to effective monthly payment', () => {
    const result = calcCarFinance(baseInputs);
    expect(result.effectiveMonthlyPayment).toBe(result.monthlyInstalment + 69);
  });

  it('amortization schedule ends near zero balance', () => {
    const result = calcCarFinance(baseInputs);
    const last = result.amortization[result.amortization.length - 1];
    expect(last.closingBalance).toBeCloseTo(0, 0);
  });

  it('total cost of ownership includes all costs', () => {
    const result = calcCarFinance(baseInputs);
    // Should be substantially more than just the repayments
    expect(result.totalCostOfOwnership).toBeGreaterThan(result.totalRepayments);
  });
});

describe('balloon finance charges interest on the balloon', () => {
  it('matches the annuity with a balloon left at the end', () => {
    // R400 000 at 12% over 60 months with R80 000 left over
    const r = 0.01;
    const g = Math.pow(1 + r, 60);
    const expected = ((400_000 - 80_000 / g) * r) / (1 - 1 / g);
    expect(balloonInstalment(400_000, 12, 60, 80_000)).toBeCloseTo(expected, 2);
  });
  it('is higher than an instalment on the loan less the balloon', () => {
    const withInterestOnBalloon = balloonInstalment(400_000, 12, 60, 80_000);
    const loanLessBalloon = balloonInstalment(320_000, 12, 60, 0);
    // The difference is a month's interest on the balloon
    expect(withInterestOnBalloon - loanLessBalloon).toBeCloseTo(80_000 * 0.01, 0);
  });
  it('runs the schedule down to the balloon', () => {
    const result = calcCarFinance({ ...baseInputs, balloonPercent: 20 });
    const last = result.amortization[result.amortization.length - 1];
    expect(last.closingBalance).toBeCloseTo(result.balloonAmount, 0);
    expect(result.totalRepayments).toBeCloseTo(result.monthlyInstalment * result.amortization.length + result.balloonAmount, 0);
  });
  it('a higher bank minimum finishes early and costs less interest', () => {
    const normal = calcCarFinance(baseInputs);
    const withMin = calcCarFinance({ ...baseInputs, minimumInstalment: normal.calculatedInstalment + 2_000 });
    expect(withMin.amortization.length).toBeLessThan(normal.amortization.length);
    expect(withMin.totalInterest).toBeLessThan(normal.totalInterest);
  });
});
