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

  it('drops NaN and Infinity so defaults apply', () => {
    const decoded = decodeState<Record<string, unknown>>(enc({ rate: null, loan: 5 }));
    // JSON has no NaN/Infinity literal, so craft via string replace on valid JSON
    const raw = btoa(encodeURIComponent('{"rate":NaN,"loan":Infinity,"term":20}'));
    expect(decodeState(raw)).toBeNull(); // invalid JSON — rejected outright
    expect(decoded).toEqual({ rate: null, loan: 5 });
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
});
