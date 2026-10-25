import { balloonInstalment } from './car';

export interface CarScenario {
  loanAmount: number;
  balloonAmount: number;
  financedAmount: number;
  standardPayment: number;
  totalWithExtra: number;
  totalStandard: number;
  interestStandard: number;
  interestWithExtra: number;
  interestSaved: number;
  monthsSaved: number;
  monthsWithExtra: number;
}

export function calcCarScenario(
  vehiclePrice: number,
  deposit: number,
  balloonPercent: number,
  interestRate: number,
  termMonths: number,
  extraPayment: number,
): CarScenario {
  const loanAmount    = Math.max(0, vehiclePrice - deposit);
  const balloonAmount = vehiclePrice * (balloonPercent / 100);
  const balloonDue = Math.min(balloonAmount, loanAmount);
  const financedAmount = Math.max(0, loanAmount - balloonDue);

  // The whole loan carries interest; instalments run it down to the balloon
  const standardPayment = balloonInstalment(loanAmount, interestRate, termMonths, balloonDue);
  const r = interestRate / 100 / 12;

  // Standard: instalments for the term, then the balloon
  let bal = loanAmount;
  let intStd = 0;
  for (let m = 0; m < termMonths && bal - balloonDue > 0.01; m++) {
    const interest = bal * r;
    intStd += interest;
    bal -= Math.min(standardPayment - interest, bal - balloonDue);
  }
  const totalStandard = standardPayment * termMonths + balloonDue;
  const interestStandard = intStd;

  // With the extra: pay until the whole loan, balloon included, is cleared
  bal = loanAmount;
  let intExtra = 0;
  let monthsWithExtra = 0;
  let paidWithExtra = 0;
  for (let m = 0; m < termMonths && bal > 0.01; m++) {
    const interest = bal * r;
    intExtra += interest;
    const payment = Math.min(standardPayment + extraPayment, bal + interest);
    bal -= payment - interest;
    paidWithExtra += payment;
    monthsWithExtra++;
  }
  // Anything left at the end of the term is the (smaller) balloon
  const totalWithExtra = paidWithExtra + Math.max(0, bal);
  const interestWithExtra = intExtra;
  const interestSaved = Math.max(0, interestStandard - interestWithExtra);
  const monthsSaved = Math.max(0, termMonths - monthsWithExtra);

  return {
    loanAmount, balloonAmount, financedAmount,
    standardPayment, totalWithExtra, totalStandard,
    interestStandard, interestWithExtra, interestSaved,
    monthsSaved, monthsWithExtra,
  };
}

export interface CarYearRow {
  year: string;
  /** Interest avoided so far by paying extra */
  interestSaved: number;
  /** Invest route: the extra invested every month, after CGT */
  investValue: number;
  /** Pay-extra route: the freed-up instalment invested after early payoff, after CGT */
  bondRouteValue: number;
  /** (Invest route − loan still owed) minus (pay-extra route − loan still owed) */
  difference: number;
  winner: 'extra' | 'invest';
}

/**
 * Pay extra on the car loan vs invest the extra.
 *
 * Both routes spend the same each month (standard instalment plus the extra)
 * for the full term. In the pay-extra route the extra clears the whole loan,
 * balloon included, and then the whole monthly amount is invested at the
 * expected return. Whatever is still owed at the end (the balloon in the
 * invest route) counts against that route. Investments pay CGT on their gain
 * unless they are in a TFSA.
 */
export function buildCarComparison(
  scenario: CarScenario,
  extraPayment: number,
  interestRate: number,
  expectedReturnPct: number,
  cgtRate: number,
  isTFSA: boolean,
  termMonths: number,
): CarYearRow[] {
  const loanR = interestRate / 100 / 12;
  const investR = expectedReturnPct / 100 / 12;
  const budget = scenario.standardPayment + extraPayment;
  const taxRate = isTFSA ? 0 : cgtRate / 100;
  const afterTax = (value: number, contributed: number) => value - Math.max(0, value - contributed) * taxRate;

  const balloonDue = scenario.loanAmount - scenario.financedAmount;
  let balStd = scenario.loanAmount;
  let balExtra = scenario.loanAmount;
  let intStd = 0;
  let intExtra = 0;
  let portfolioA = 0, contributedA = 0;
  let portfolioB = 0, contributedB = 0;
  const rows: CarYearRow[] = [];

  for (let m = 1; m <= termMonths; m++) {
    // Standard loan: instalment only
    if (balStd - balloonDue > 0.01) {
      const interest = balStd * loanR;
      intStd += interest;
      balStd = Math.max(balloonDue, balStd - Math.min(scenario.standardPayment - interest, balStd - balloonDue));
    }

    // Pay-extra route: instalment plus extra until paid off, then invest the lot
    let paidA = 0;
    if (balExtra > 0.01) {
      const interest = balExtra * loanR;
      intExtra += interest;
      const principal = Math.min(budget - interest, balExtra);
      paidA = principal + interest;
      balExtra = Math.max(0, balExtra - principal);
    }
    const investA = Math.max(0, budget - paidA);
    portfolioA = (portfolioA + investA) * (1 + investR);
    contributedA += investA;

    // Invest route: the extra, every month
    portfolioB = (portfolioB + extraPayment) * (1 + investR);
    contributedB += extraPayment;

    if (m % 12 === 0 || m === termMonths) {
      const valueA = afterTax(portfolioA, contributedA);
      const valueB = afterTax(portfolioB, contributedB);
      const difference = (valueB - balStd) - (valueA - balExtra);
      rows.push({
        year: `Yr ${Math.ceil(m / 12)}`,
        interestSaved: Math.round(Math.max(0, intStd - intExtra)),
        investValue: Math.round(Math.max(0, valueB)),
        bondRouteValue: Math.round(Math.max(0, valueA)),
        difference: Math.round(difference),
        winner: difference > 0 ? 'invest' : 'extra',
      });
    }
  }
  return rows;
}
