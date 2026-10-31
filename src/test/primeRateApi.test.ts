import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../../api/prime-rate';

function call(method: string) {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    setHeader(k: string, v: string) { headers[k] = v; return this; },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return handler({ method } as VercelRequest, res as unknown as VercelResponse).then(() => ({ res, headers }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('/api/prime-rate', () => {
  it('rejects methods the CDN does not cache, without calling SARB', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { res, headers } = await call('POST');
    expect(res.statusCode).toBe(405);
    expect(headers.Allow).toBe('GET, HEAD');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns only the two rates from a good feed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { Name: 'SARB policy rate', Value: 7, Date: '2026-11-20' },
        { Name: 'Prime lending rate', Value: 10.5, Date: '2026-11-20' },
        { Name: 'Other rate', Value: 99, Date: '2026-11-20' },
      ],
    }));
    const { res } = await call('GET');
    expect(res.body).toEqual({ repoRate: 7, primeRate: 10.5, asOf: '2026-11-20', fallback: false });
  });

  it('falls back when the feed returns impossible values', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { Name: 'SARB policy rate', Value: 700, Date: 'x' },
        { Name: 'Prime lending rate', Value: 10.5, Date: 'x' },
      ],
    }));
    const { res } = await call('GET');
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ fallback: true });
  });
});
