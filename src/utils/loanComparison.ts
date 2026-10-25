import { calcPayment } from './mortgage';
import { calcTransferDuty, calcBondRegistrationCost } from './tax';

export interface Loan {
  id:                  number;
  label:               string;
  amount:              number;
  interestRate:        number;
  termYears:           number;
  initiationFee:       number;
  capitaliseInitiationFee: boolean;
  monthlyServiceFee:   number;
  transferDutyOverride:    number | null; // null = auto-calculate
  bondRegFeeOverride:      number | null;
}

export interface LoanResult {
  id:               number;
  label:            string;
  color:            string;
  monthlyPayment:   number;
  totalMonthly:     number;
  totalRepaid:      number;
  totalInterest:    number;
  totalCost:        number;
  effectiveRate:    number;
  transferDuty:     number;
  bondRegFee:       number;
  totalUpfront:     number;
  grandTotal:       number;
}

/**
 * One loan offer: repayments, interest, fees and costs on transfer day.
 * Transfer duty depends on the price of the home; bond registration on the bond.
 */
export function calcLoanResult(loan: Loan, color: string, homePrice: number): LoanResult {
  const effectiveAmount = loan.amount + (loan.capitaliseInitiationFee ? loan.initiationFee : 0);
  const monthlyPayment  = calcPayment(effectiveAmount, loan.interestRate, loan.termYears, 12);
  const totalMonthly    = monthlyPayment + loan.monthlyServiceFee;
  const totalPayments   = totalMonthly * loan.termYears * 12;
  const totalRepaid     = totalPayments + (loan.capitaliseInitiationFee ? 0 : loan.initiationFee);
  // Interest only: the service fee is a separate cost
  const totalInterest   = monthlyPayment * loan.termYears * 12 - effectiveAmount;
  const totalCost       = totalRepaid - loan.amount;

  const effectiveRate = totalCost > 0
    ? (totalCost / (loan.amount * loan.termYears / 2)) * 100
    : loan.interestRate;

  const transferDuty = loan.transferDutyOverride ?? calcTransferDuty(homePrice);
  const bondRegFee   = loan.bondRegFeeOverride   ?? calcBondRegistrationCost(loan.amount);
  const totalUpfront = (loan.capitaliseInitiationFee ? 0 : loan.initiationFee) + transferDuty + bondRegFee;
  const grandTotal   = totalRepaid + transferDuty + bondRegFee;

  return {
    id: loan.id, label: loan.label, color,
    monthlyPayment, totalMonthly, totalRepaid,
    totalInterest, totalCost, effectiveRate,
    transferDuty, bondRegFee, totalUpfront, grandTotal,
  };
}

export function buildBalanceChart(loans: Loan[]): Record<string, number | string>[] {
  const maxMonths = Math.max(...loans.map((l) => l.termYears * 12));
  const rows: Record<string, number | string>[] = [];
  for (let m = 0; m <= maxMonths; m += Math.max(1, Math.floor(maxMonths / 30))) {
    const row: Record<string, number | string> = { month: m === 0 ? 'Start' : `M${m}` };
    for (const loan of loans) {
      const effectiveAmount = loan.amount + (loan.capitaliseInitiationFee ? loan.initiationFee : 0);
      const r   = loan.interestRate / 100 / 12;
      const n   = loan.termYears * 12;
      const pmt = calcPayment(effectiveAmount, loan.interestRate, loan.termYears, 12);
      let bal   = effectiveAmount;
      for (let i = 0; i < Math.min(m, n); i++) {
        const interest  = bal * r;
        const principal = Math.min(pmt - interest, bal);
        bal -= principal;
        if (bal < 0) bal = 0;
      }
      row[loan.label] = Math.round(Math.max(0, bal));
    }
    rows.push(row);
  }
  return rows;
}
