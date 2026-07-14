import { describe, it, expect } from 'vitest';
import { encodeState, decodeState } from '../utils/share';

const enc = (obj: unknown) => encodeState(obj);

describe('decodeState sanitisation', () => {
  it('round-trips a normal calculator state', () => {
    const state = { loan: 2_000_000, rate: 11.75, term: 20, biweekly: false, label: 'My bond' };
    expect(decodeState(enc(state))).toEqual(state);
  });

  it('returns null for garbage input', () => {
    expect(decodeState('not-base64!!!')).toBeNull();
    expect(decodeState(btoa('not json'))).toBeNull();
  });

  it('returns null for non-object payloads', () => {
    expect(decodeState(enc(42))).toBeNull();
    expect(decodeState(enc('a string'))).toBeNull();
    expect(decodeState(enc([1, 2, 3]))).toBeNull();
    expect(decodeState(enc(null))).toBeNull();
  });

  it('rejects literal NaN/Infinity tokens as invalid JSON, and preserves null', () => {
    // `NaN`/`Infinity` are not valid JSON tokens, so the payload is rejected at parse.
    const raw = btoa(encodeURIComponent('{"rate":NaN,"loan":Infinity,"term":20}'));
    expect(decodeState(raw)).toBeNull();
    // A genuine null value passes through untouched (calculators use ?? default on it).
    expect(decodeState(enc({ rate: null, loan: 5 }))).toEqual({ rate: null, loan: 5 });
  });

  it('drops absurd magnitudes beyond 1e12', () => {
    const decoded = decodeState<Record<string, unknown>>(enc({ loan: 1e308, rate: 11.5 }));
    expect(decoded).toEqual({ rate: 11.5 });
    expect(decoded).not.toHaveProperty('loan');
  });

  it('accepts values exactly at the magnitude cap and negatives within it', () => {
    const decoded = decodeState<Record<string, unknown>>(enc({ a: 1e12, b: -1e12, c: -5.5 }));
    expect(decoded).toEqual({ a: 1e12, b: -1e12, c: -5.5 });
  });

  it('sanitises nested objects and arrays recursively', () => {
    const decoded = decodeState<Record<string, unknown>>(
      enc({ nested: { ok: 1, bad: 1e300 }, list: [1, 1e300, 2] }),
    );
    expect(decoded).toEqual({ nested: { ok: 1 }, list: [1, 2] });
  });

  it('passes strings and booleans through unchanged', () => {
    const decoded = decodeState<Record<string, unknown>>(enc({ name: '<b>x</b>', flag: true }));
    expect(decoded).toEqual({ name: '<b>x</b>', flag: true });
  });

  it('drops Infinity from a raw 1e999 JSON literal (JSON.parse yields Infinity)', () => {
    // JSON has no NaN/Infinity token, but an overflowing literal parses to Infinity —
    // this is the only way the isFinite guard is reached in production.
    const raw = btoa(encodeURIComponent('{"loan":1e999,"rate":11.5}'));
    expect(decodeState(raw)).toEqual({ rate: 11.5 });
  });

  it('does not let a __proto__ key pollute the decoded object', () => {
    const raw = btoa(encodeURIComponent('{"__proto__":{"loan":999},"rate":11.5}'));
    const decoded = decodeState<Record<string, unknown>>(raw);
    expect(decoded).toEqual({ rate: 11.5 });
    // The injected value must NOT be reachable via prototype lookup.
    expect((decoded as { loan?: number })?.loan).toBeUndefined();
  });

  it('drops constructor and prototype keys too', () => {
    const raw = btoa(encodeURIComponent('{"constructor":{"x":1},"prototype":{"y":2},"rate":11.5}'));
    expect(decodeState(raw)).toEqual({ rate: 11.5 });
  });
});
