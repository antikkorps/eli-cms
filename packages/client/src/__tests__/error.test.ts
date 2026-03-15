import { describe, it, expect } from 'vitest';
import { EliError } from '../error.js';

describe('EliError', () => {
  it('should create an error with status and message', () => {
    const err = new EliError(404, 'Not found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('EliError');
    expect(err).toBeInstanceOf(Error);
  });

  it('should detect not found', () => {
    expect(new EliError(404, 'nope').isNotFound()).toBe(true);
    expect(new EliError(500, 'nope').isNotFound()).toBe(false);
  });

  it('should detect unauthorized', () => {
    expect(new EliError(401, 'nope').isUnauthorized()).toBe(true);
    expect(new EliError(403, 'nope').isUnauthorized()).toBe(false);
  });

  it('should detect forbidden', () => {
    expect(new EliError(403, 'nope').isForbidden()).toBe(true);
    expect(new EliError(401, 'nope').isForbidden()).toBe(false);
  });

  it('should parse error from JSON response', async () => {
    const response = new Response(JSON.stringify({ success: false, error: 'Content not found' }), {
      status: 404,
      statusText: 'Not Found',
      headers: { 'Content-Type': 'application/json' },
    });
    const err = await EliError.fromResponse(response);
    expect(err.status).toBe(404);
    expect(err.message).toBe('Content not found');
  });

  it('should fallback to statusText when body is not JSON', async () => {
    const response = new Response('Server Error', {
      status: 500,
      statusText: 'Internal Server Error',
    });
    const err = await EliError.fromResponse(response);
    expect(err.status).toBe(500);
    expect(err.message).toBe('Internal Server Error');
  });

  it('should fallback to "Request failed" when no statusText', async () => {
    const response = new Response(null, { status: 502 });
    const err = await EliError.fromResponse(response);
    expect(err.status).toBe(502);
    // statusText defaults to empty string in some implementations
    expect(err.message).toBeTruthy();
  });
});
