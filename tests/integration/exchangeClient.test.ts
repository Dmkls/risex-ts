import { describe, it, expect, beforeAll } from 'vitest';
import { ExchangeClient } from '../../src/index.js';
import 'dotenv/config';

const RUN = process.env.RUN_INTEGRATION === 'true';

describe.skipIf(!RUN)('ExchangeClient integration', () => {
  let client: ExchangeClient;

  beforeAll(async () => {
    client = new ExchangeClient({
      accountKey: process.env.ACCOUNT_PRIVATE_KEY!,
      signerKey: process.env.SIGNER_PRIVATE_KEY!,
      baseUrl: process.env.API_URL,
    });
    await client.init();
  });

  it('should initialize with domain and target', () => {
    expect(client.account).toMatch(/^0x/);
    expect(client.signer).toMatch(/^0x/);
  });

  it('should check signer registration status', async () => {
    const registered = await client.isSignerRegistered();
    expect(typeof registered).toBe('boolean');
  });

  it('should register signer (idempotent)', async () => {
    const result = await client.registerSigner();
    expect(result).toBeDefined();
  });

  it('should fetch balance via info client', async () => {
    const balance = await client.info.getBalance(client.account);
    expect(balance).toBeDefined();
  });
});
