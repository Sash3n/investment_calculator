/**
 * Reference figures shown on the dashboard, each with its source and date.
 *
 * Prime and repo are fetched live from the SARB through /api/prime-rate.
 * SARB_FALLBACK is only used when that call fails, and also seeds the default
 * interest rate in some calculators. Update these values whenever the SARB
 * Monetary Policy Committee or Stats SA publish new figures.
 */

export interface ReferenceSource {
  /** Who publishes the figure */
  publisher: string;
  /** Link to the original publication */
  url: string;
}

export const SARB_SOURCE: ReferenceSource = {
  publisher: 'South African Reserve Bank',
  url: 'https://www.resbank.co.za/en/home/what-we-do/statistics/key-statistics/current-market-rates',
};

/** Last confirmed SARB rates: MPC statement of September 2026, effective 25 September 2026. */
export const SARB_FALLBACK = {
  primeRate: 10.75,
  repoRate: 7.25,
  asOf: '2026-09-25',
};

/** Headline CPI: Stats SA statistical release P0141 (published 23 September 2026). */
export const CPI_REFERENCE = {
  value: 4.4,
  period: 'August 2026',
  source: {
    publisher: 'Stats SA',
    url: 'https://www.statssa.gov.za/publications/P0141/P0141August2026.pdf',
  } satisfies ReferenceSource,
};
