import { describe, it, expect, beforeAll } from 'vitest';
import { ExchangeClient } from '../../src/index.js';
import 'dotenv/config';

const RUN = process.env.RUN_INTEGRATION === 'true';

describe.skipIf(!RUN)('ExchangeClient integration', () => {
  let client: ExchangeClient;

  beforeAll(async () => {
    // Default flow: account address + signer key
    client = new ExchangeClient({
      account: process.env.ACCOUNT_ADDRESS!,
      signerKey: process.env.SIGNER_PRIVATE_KEY!,
      baseUrl: process.env.API_URL,
    });
    await client.init();
  });

  it('should initialize with domain and target', () => {
    expect(client.account).toMatch(/^0x/);
    expect(client.signer).toMatch(/^0x/);
  });

  it('should fetch nonce state', async () => {
    const nonce = await client.getNonceState();
    expect(nonce.nonce_anchor).toBeDefined();
    expect(nonce.current_bitmap_index).toBeTypeOf('number');
  });

  it('should check signer registration status', async () => {
    const registered = await client.isSignerRegistered();
    expect(typeof registered).toBe('boolean');
  });

  it('should throw when calling registerSigner without accountKey', async () => {
    await expect(() => client.registerSigner()).rejects.toThrow('accountKey is required');
  });

  it('should allow registerSigner when accountKey is provided', async () => {
    if (!process.env.ACCOUNT_PRIVATE_KEY) return;
    const fullClient = new ExchangeClient({
      accountKey: process.env.ACCOUNT_PRIVATE_KEY!,
      signerKey: process.env.SIGNER_PRIVATE_KEY!,
      baseUrl: process.env.API_URL,
    });
    await fullClient.init();
    const result = await fullClient.registerSigner();
    expect(result).toBeDefined();
  });

  it('should fetch balance or handle missing account', async () => {
    try {
      const balance = await client.info.getBalance(client.account);
      expect(balance).toBeDefined();
    } catch (err: any) {
      expect(err.status).toBe(500);
    }
  });
});
