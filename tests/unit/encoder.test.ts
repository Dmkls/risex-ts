import { describe, it, expect } from 'vitest';
import { encodeOrder, encodeCancelOrder, encodeCancelAll } from '../../src/signing/encoder.js';
import { Side, OrderType, TimeInForce, StpMode } from '../../src/types/common.js';

describe('encodeOrder', () => {
  it('should return a bytes32 hash string', () => {
    const hash = encodeOrder({
      market_id: 1,
      size_steps: 100,
      price_ticks: 500000,
      side: Side.Long,
      order_type: OrderType.Limit,
      time_in_force: TimeInForce.GoodTillCancelled,
      post_only: false,
      reduce_only: false,
      stp_mode: StpMode.None,
      ttl_units: 0,
    });
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('should produce different hashes for different sides', () => {
    const base = {
      market_id: 1,
      size_steps: 100,
      price_ticks: 500000,
      order_type: OrderType.Market,
      time_in_force: TimeInForce.ImmediateOrCancel,
      post_only: false,
      reduce_only: false,
      stp_mode: StpMode.ExpireMaker,
      ttl_units: 0,
    };

    const longHash = encodeOrder({ ...base, side: Side.Long });
    const shortHash = encodeOrder({ ...base, side: Side.Short });
    expect(longHash).not.toBe(shortHash);
  });

  it('should produce different hashes for different markets', () => {
    const base = {
      size_steps: 100,
      price_ticks: 500000,
      side: Side.Long,
      order_type: OrderType.Limit,
      time_in_force: TimeInForce.GoodTillCancelled,
      post_only: false,
      reduce_only: false,
      stp_mode: StpMode.ExpireMaker,
      ttl_units: 0,
    };

    const h1 = encodeOrder({ ...base, market_id: 1 });
    const h2 = encodeOrder({ ...base, market_id: 2 });
    expect(h1).not.toBe(h2);
  });

  it('should produce different hashes for different sizes', () => {
    const base = {
      market_id: 1,
      price_ticks: 500000,
      side: Side.Long,
      order_type: OrderType.Limit,
      time_in_force: TimeInForce.GoodTillCancelled,
      post_only: false,
      reduce_only: false,
      stp_mode: StpMode.ExpireMaker,
      ttl_units: 0,
    };

    const h1 = encodeOrder({ ...base, size_steps: 100 });
    const h2 = encodeOrder({ ...base, size_steps: 200 });
    expect(h1).not.toBe(h2);
  });

  it('should produce deterministic hashes', () => {
    const params = {
      market_id: 1,
      size_steps: 100,
      price_ticks: 500000,
      side: Side.Long,
      order_type: OrderType.Limit,
      time_in_force: TimeInForce.GoodTillCancelled,
      post_only: false,
      reduce_only: false,
      stp_mode: StpMode.None,
      ttl_units: 0,
    };
    expect(encodeOrder(params)).toBe(encodeOrder(params));
  });
});

describe('encodeCancelOrder', () => {
  it('should return a bytes32 hash string', () => {
    const hash = encodeCancelOrder({
      market_id: 1,
      order_id: '12345',
    });
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('should produce different hashes for different orders', () => {
    const h1 = encodeCancelOrder({ market_id: 1, order_id: '100' });
    const h2 = encodeCancelOrder({ market_id: 1, order_id: '200' });
    expect(h1).not.toBe(h2);
  });

  it('should produce different hashes for different markets', () => {
    const h1 = encodeCancelOrder({ market_id: 1, order_id: '100' });
    const h2 = encodeCancelOrder({ market_id: 2, order_id: '100' });
    expect(h1).not.toBe(h2);
  });
});

describe('encodeCancelAll', () => {
  it('should return a bytes32 hash string', () => {
    const hash = encodeCancelAll(0);
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('should produce different hashes for different markets', () => {
    const h1 = encodeCancelAll(0);
    const h2 = encodeCancelAll(1);
    expect(h1).not.toBe(h2);
  });
});
