import { describe, it, expect } from 'vitest';
import { buildMeta } from './pagination.js';

describe('buildMeta', () => {
  it('calculates pagination meta correctly', () => {
    const meta = buildMeta(42, 2, 10);
    expect(meta).toEqual({ page: 2, limit: 10, total: 42, totalPages: 5 });
  });

  it('rounds totalPages up', () => {
    const meta = buildMeta(11, 1, 5);
    expect(meta.totalPages).toBe(3);
  });

  it('returns totalPages=0 when total is 0', () => {
    const meta = buildMeta(0, 1, 20);
    expect(meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
  });

  it('handles limit=1', () => {
    const meta = buildMeta(5, 3, 1);
    expect(meta).toEqual({ page: 3, limit: 1, total: 5, totalPages: 5 });
  });
});
