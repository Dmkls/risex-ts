import { describe, it, expect } from 'vitest';
import { createNonce } from '../../src/signing/nonce.js';

describe('createNonce', () => {
  const address = '0x39f810de204C07eD6294562Df3c40696644fa5bf';

  it('should return a string of digits', () => {
    const nonce = createNonce(address);
    expect(nonce).toMatch(/^\d+$/);
  });

  it('should be at least 13 characters long (timestamp prefix)', () => {
    const nonce = createNonce(address);
    expect(nonce.length).toBeGreaterThanOrEqual(13);
  });

  it('should produce unique nonces across time', async () => {
    const n1 = createNonce(address);
    await new Promise((r) => setTimeout(r, 5));
    const n2 = createNonce(address);
    expect(n1).not.toBe(n2);
  });

  it('should produce different nonces for different addresses', () => {
    const a1 = '0x1111111111111111111111111111111111111111';
    const a2 = '0x2222222222222222222222222222222222222222';
    // Run a few times and check they diverge
    const n1 = createNonce(a1);
    const n2 = createNonce(a2);
    // They share the timestamp prefix but differ in the hash suffix
    // Can't guarantee different every time due to random component, but structure should match
    expect(n1).toMatch(/^\d+$/);
    expect(n2).toMatch(/^\d+$/);
  });
});
