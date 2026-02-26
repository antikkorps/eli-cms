import { describe, it, expect } from 'vitest';
import { parseDuration, parseDurationSec } from './parse-duration.js';

describe('parseDuration', () => {
  it('parses seconds', () => {
    expect(parseDuration('30s')).toBe(30_000);
  });

  it('parses minutes', () => {
    expect(parseDuration('15m')).toBe(900_000);
  });

  it('parses hours', () => {
    expect(parseDuration('2h')).toBe(7_200_000);
  });

  it('parses days', () => {
    expect(parseDuration('7d')).toBe(604_800_000);
  });

  it('returns undefined for invalid input', () => {
    expect(parseDuration('')).toBeUndefined();
    expect(parseDuration('abc')).toBeUndefined();
    expect(parseDuration('10x')).toBeUndefined();
    expect(parseDuration('m15')).toBeUndefined();
  });
});

describe('parseDurationSec', () => {
  it('returns seconds', () => {
    expect(parseDurationSec('15m')).toBe(900);
    expect(parseDurationSec('7d')).toBe(604_800);
  });

  it('throws on invalid format', () => {
    expect(() => parseDurationSec('invalid')).toThrow('Invalid duration format');
  });
});
