/**
 * Journeys: question-led sequences of calculators. A journey is active when the
 * URL carries ?journey=<id>; the journey bar then shows the steps and moves the
 * key figures from one calculator to the next.
 */
import { DEFAULT_MORTGAGE_INPUTS, DEFAULT_PROPERTY_INPUTS } from './calculatorDefaults';

export interface JourneyStep {
  path: string;
  title: string;
  /** What this step answers, in a few words */
  why: string;
}

/** What the next step receives: router state (loadedInputs) and/or ?s= share values. */
export interface JourneyHandoff {
  state?: unknown;
  share?: Record<string, unknown>;
}

/** Figures a calculator publishes for the next step. */
export type JourneyValues = Record<string, number>;

export interface Journey {
  id: string;
  question: string;
  color: string;
  steps: JourneyStep[];
  /** Keyed by the step's path: builds the hand-off to the following step */
  handoff?: Record<string, (v: JourneyValues) => JourneyHandoff>;
}

export const JOURNEYS: Journey[] = [
  {
    id: 'afford',
    question: 'Can I afford this house?',
    color: 'var(--note-blue)',
    steps: [
      { path: '/affordability', title: 'Bond Affordability', why: 'What you can borrow on your income' },
      { path: '/mortgage', title: 'Mortgage Calculator', why: 'The repayment on that price' },
      { path: '/municipal-rates', title: 'Municipal Rates', why: 'Rates, water and refuse on top' },
    ],
    handoff: {
      '/affordability': (v) => ({
        state: {
          loadedInputs: {
            ...DEFAULT_MORTGAGE_INPUTS,
            purchasePrice: Math.round(v.price),
            deposit: Math.round(v.deposit),
            interestRate: v.rate,
            termYears: v.term,
          },
        },
      }),
      '/mortgage': (v) => ({ share: { propValue: Math.round(v.price) } }),
    },
  },
  {
    id: 'bond-or-invest',
    question: 'Should I pay off my bond or invest?',
    color: 'var(--note-orange)',
    steps: [
      { path: '/extra-vs-investing', title: 'Extra Payments vs Investing', why: 'The same money, both ways' },
      { path: '/bond-extra', title: 'Bond Extra Payment', why: 'What the extra does to your bond' },
    ],
    handoff: {
      '/extra-vs-investing': (v) => ({ share: { loan: v.loan, rate: v.rate, term: v.term, extra: v.extra } }),
    },
  },
  {
    id: 'rental',
    question: 'Is this rental worth it?',
    color: 'var(--note-blue)',
    steps: [
      { path: '/rental-yield', title: 'Rental Yield Finder', why: 'Yield and monthly cash flow' },
      { path: '/property-roi', title: 'Property ROI', why: 'Returns over ten years' },
      { path: '/airbnb-vs-rental', title: 'Airbnb vs Rental', why: 'Short-term or long-term let' },
      { path: '/stress-test', title: 'Portfolio Stress Test', why: 'Rate hikes and vacancies (uses your saved properties)' },
    ],
    handoff: {
      '/rental-yield': (v) => ({
        state: {
          loadedInputs: {
            ...DEFAULT_PROPERTY_INPUTS,
            purchasePrice: v.price,
            deposit: v.deposit,
            interestRate: v.rate,
            bondTerm: v.term,
            monthlyLevies: v.levy,
            monthlyRates: v.rates,
            insurance: v.insurance,
            effluentFees: v.effluent,
            miscFees: v.misc,
            rentScenario1: v.rent,
            rentScenario2: v.rent,
          },
        },
      }),
      '/property-roi': (v) => ({
        share: {
          propertyValue: v.price,
          monthlyBondCost: Math.round(v.bond),
          monthlyRent: v.rent,
          monthlyLtrExpenses: Math.round(v.expenses),
        },
      }),
    },
  },
  {
    id: 'take-home',
    question: 'What do I actually take home?',
    color: 'var(--note-green)',
    steps: [
      { path: '/salary', title: 'Salary / Take-Home', why: 'PAYE, UIF and your net pay' },
      { path: '/budget', title: 'Budget Planner', why: 'Where the net pay goes' },
    ],
  },
  {
    id: 'self-employed',
    question: "I'm self-employed",
    color: 'var(--note-orange)',
    steps: [
      { path: '/provisional-tax', title: 'Provisional Tax', why: 'August and February payments' },
      { path: '/vat', title: 'VAT Calculator', why: 'When you must register' },
    ],
  },
  {
    id: 'headed',
    question: 'Where am I headed?',
    color: 'var(--note-brown)',
    steps: [
      { path: '/wealth-target', title: 'Wealth Target Planner', why: 'What to save for a goal' },
      { path: '/net-worth', title: 'Net Worth Dashboard', why: 'Where you stand today' },
      { path: '/emergency-fund', title: 'Emergency Fund Planner', why: 'Your safety net' },
      { path: '/inflation', title: 'Inflation & Purchasing Power', why: 'What your money will buy' },
    ],
  },
];

export const JOURNEY_BY_ID: Record<string, Journey> = Object.fromEntries(JOURNEYS.map((j) => [j.id, j]));

/** Link to a journey step, keeping the journey active. */
export function journeyHref(journeyId: string, path: string, share?: string): string {
  const params = new URLSearchParams({ journey: journeyId });
  if (share) params.set('s', share);
  return `${path}?${params.toString()}`;
}
