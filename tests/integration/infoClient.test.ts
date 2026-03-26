import { describe, it, expect, beforeAll } from 'vitest';
import { InfoClient } from '../../src/index.js';
import 'dotenv/config';

const RUN = process.env.RUN_INTEGRATION === 'true';

describe.skipIf(!RUN)('InfoClient integration', () => {
  let client: InfoClient;

  beforeAll(() => {
    client = new InfoClient({ baseUrl: process.env.API_URL });
  });

  it('should fetch system config', async () => {
    const config = await client.getSystemConfig();
    expect(config).toBeDefined();
    expect(config.addresses).toBeDefined();
  });

  it('should fetch EIP-712 domain', async () => {
    const domain = await client.getEip712Domain();
    expect(domain.name).toBe('RISEx');
    expect(domain.chainId).toBeTypeOf('bigint');
    expect(domain.verifyingContract).toMatch(/^0x/);
  });

  it('should fetch markets', async () => {
    const markets = await client.getMarkets();
    expect(markets.length).toBeGreaterThan(0);
    expect(markets[0].market_id).toBeDefined();
    expect(markets[0].display_name).toBeDefined();
  });

  it('should fetch orderbook with decimal prices', async () => {
    const markets = await client.getMarkets();
    const market = markets.find((m) => m.visible);
    expect(market).toBeDefined();

    const book = await client.getOrderbook(Number(market!.market_id), 5);
    expect(book).toBeDefined();
    // Prices should be decimal strings (not wei)
    if (book.bids && book.bids.length > 0) {
      const price = parseFloat(book.bids[0].price);
      expect(price).toBeGreaterThan(0);
      expect(price).toBeLessThan(1e12); // decimal, not wei
    }
  });

  it('should fetch nonce state', async () => {
    const account = '0x39f810de204C07eD6294562Df3c40696644fa5bf';
    const nonce = await client.getNonceState(account);
    expect(nonce.nonce_anchor).toBeDefined();
    expect(nonce.current_bitmap_index).toBeTypeOf('number');
  });

  it('should fetch balance or handle missing account', async () => {
    const account = '0x39f810de204C07eD6294562Df3c40696644fa5bf';
    try {
      const balance = await client.getBalance(account);
      expect(balance).toBeDefined();
    } catch (err: any) {
      // Account may not exist on staging — 500 with "execution reverted" is expected
      expect(err.status).toBe(500);
    }
  });
});
