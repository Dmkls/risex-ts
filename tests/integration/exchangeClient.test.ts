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

  it('should place a limit order and cancel it', async () => {
    // Get market info for BTC-PERP (market_id=1)
    const markets = await client.info.getMarkets();
    const btc = markets.find((m) => String(m.market_id) === '1') ?? markets[0];
    const cfg = btc.config;
    const priceTick = Number(cfg.step_price);
    const sizeStep = Number(cfg.step_size);
    const minSize = Number(cfg.min_order_size);

    // Place a post-only limit buy far below mid so it won't fill
    const ob = await client.info.getOrderbook(1, 1);
    const bestBid = Number(ob.bids[0]?.price ?? ob.bids[0]?.[0]);
    const priceTicks = Math.floor((bestBid * 0.75) / priceTick);
    const sizeSteps = Math.max(1, Math.round(Math.max(minSize, 0.0002) / sizeStep));

    const placeRes = await client.limitBuy(1, sizeSteps, priceTicks, true);
    expect(placeRes.order_id).toBeDefined();
    expect(placeRes.tx_hash).toMatch(/^0x/);
    console.log(`Placed order: ${placeRes.order_id}`);

    // Wait for order to land on-chain
    await new Promise((r) => setTimeout(r, 2000));

    // Cancel the single order
    const cancelRes = await client.cancelOrder({
      market_id: 1,
      order_id: placeRes.order_id,
    });
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.tx_hash).toMatch(/^0x/);
    console.log(`Cancelled order: ${cancelRes.tx_hash}`);
  }, 30_000);
});
