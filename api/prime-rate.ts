/**
 * Vercel Serverless Function — /api/prime-rate
 *
 * Proxies the SARB CurrentMarketRates endpoint (CORS-blocked in browser)
 * and returns only the repo rate + prime lending rate.
 *
 * Cached for 6 hours on Vercel's edge — SARB only changes rates ~6x/year.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SARB_URL =
  'https://custom.resbank.co.za/SarbWebApi/WebIndicators/CurrentMarketRates';

const FALLBACK = { repoRate: 6.75, primeRate: 10.25, asOf: null, fallback: true };

interface SarbRate {
  Name: string;
  Value: number;
  Date: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Cache on Vercel CDN for 6 hours, allow stale for 12 hours while revalidating
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const response = await fetch(SARB_URL, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) throw new Error(`SARB responded ${response.status}`);

    const data: SarbRate[] = await response.json();

    const policyRate = data.find((r) =>
      r.Name?.toLowerCase().includes('policy rate') ||
      r.Name?.toLowerCase().includes('repo')
    );
    const primeRate = data.find((r) =>
      r.Name?.toLowerCase().includes('prime lending')
    );

    if (!policyRate || !primeRate) throw new Error('Rate fields not found in SARB response');

    return res.status(200).json({
      repoRate:  policyRate.Value,
      primeRate: primeRate.Value,
      asOf:      primeRate.Date,
      fallback:  false,
    });
  } catch (err) {
    console.error('[prime-rate] SARB fetch failed:', err);
    return res.status(200).json(FALLBACK);
  }
}
