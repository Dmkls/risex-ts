import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '../../src/core/HttpClient.js';
import { RiseApiError } from '../../src/utils/errors.js';

describe('HttpClient', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockFetch(response: { ok: boolean; status: number; body: unknown }) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status,
      statusText: response.ok ? 'OK' : 'Error',
      json: () => Promise.resolve(response.body),
    } as Response);
  }

  it('should unwrap data envelope', async () => {
    mockFetch({ ok: true, status: 200, body: { data: { balance: '100' } } });
    const client = new HttpClient({ baseUrl: 'https://example.com' });
    const result = await client.get<{ balance: string }>('/test');
    expect(result.balance).toBe('100');
  });

  it('should pass through non-envelope responses', async () => {
    mockFetch({ ok: true, status: 200, body: { balance: '100' } });
    const client = new HttpClient({ baseUrl: 'https://example.com' });
    const result = await client.get<{ balance: string }>('/test');
    expect(result.balance).toBe('100');
  });

  it('should throw RiseApiError on non-OK response', async () => {
    mockFetch({ ok: false, status: 400, body: { message: 'Bad request' } });
    const client = new HttpClient({ baseUrl: 'https://example.com' });
    await expect(client.get('/test')).rejects.toThrow(RiseApiError);
  });

  it('should include status and path in error', async () => {
    mockFetch({ ok: false, status: 404, body: { message: 'Not found' } });
    const client = new HttpClient({ baseUrl: 'https://example.com' });
    try {
      await client.get('/test');
    } catch (err) {
      expect(err).toBeInstanceOf(RiseApiError);
      expect((err as RiseApiError).status).toBe(404);
      expect((err as RiseApiError).path).toBe('/test');
    }
  });

  it('should send POST body as JSON', async () => {
    mockFetch({ ok: true, status: 200, body: { data: { ok: true } } });
    const client = new HttpClient({ baseUrl: 'https://example.com' });
    await client.post('/test', { foo: 'bar' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.com/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ foo: 'bar' }),
      }),
    );
  });
});
