import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryCache } from '../cache.js';

describe('MemoryCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should store and retrieve values', () => {
    const cache = new MemoryCache(60_000);
    cache.set('key', { hello: 'world' });
    expect(cache.get('key')).toEqual({ hello: 'world' });
  });

  it('should return undefined for missing keys', () => {
    const cache = new MemoryCache(60_000);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('should expire entries after TTL', () => {
    const cache = new MemoryCache(1000);
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');

    vi.advanceTimersByTime(1001);
    expect(cache.get('key')).toBeUndefined();
  });

  it('should report has() correctly', () => {
    const cache = new MemoryCache(60_000);
    expect(cache.has('key')).toBe(false);
    cache.set('key', 'value');
    expect(cache.has('key')).toBe(true);
  });

  it('should delete entries', () => {
    const cache = new MemoryCache(60_000);
    cache.set('key', 'value');
    cache.delete('key');
    expect(cache.get('key')).toBeUndefined();
  });

  it('should clear all entries', () => {
    const cache = new MemoryCache(60_000);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });
});
