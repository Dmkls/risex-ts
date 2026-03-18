import { describe, it, expect } from 'vitest';
import { encodeOrder, encodeCancelOrder } from '../../src/signing/encoder.js';
import { Side, OrderType, TimeInForce, StpMode } from '../../src/types/common.js';
import { ethers } from 'ethers';

describe('encodeOrder', () => {
  it('should produce 47 bytes', () => {
    const buf = encodeOrder({
      market_id: '1',
      size: '1000000000000000000',
      price: '2000000000000000000000',
      side: Side.Long,
      order_type: OrderType.Limit,
      tif: TimeInForce.GoodTillCancelled,
      post_only: false,
      reduce_only: false,
      stp_mode: StpMode.None,
      expiry: 0,
    });
    expect(buf.length).toBe(47);
  });

  it('should encode marketId in first 8 bytes', () => {
    const buf = encodeOrder({
      market_id: '1',
      size: '0',
      price: '0',
      side: Side.Long,
      order_type: OrderType.Market,
      tif: TimeInForce.ImmediateOrCancel,
      post_only: false,
      reduce_only: false,
      stp_mode: StpMode.ExpireMaker,
      expiry: 0,
    });
    const view = new DataView(buf.buffer);
    expect(view.getBigUint64(0)).toBe(1n);
  });

  it('should encode side in flags byte', () => {
    const longBuf = encodeOrder({
      market_id: '0',
      size: '0',
      price: '0',
      side: Side.Long,
      order_type: OrderType.Market,
      tif: TimeInForce.ImmediateOrCancel,
      post_only: false,
      reduce_only: false,
      stp_mode: StpMode.ExpireMaker,
      expiry: 0,
    });
    expect(longBuf[40] & 1).toBe(0);

    const shortBuf = encodeOrder({
      market_id: '0',
      size: '0',
      price: '0',
      side: Side.Short,
      order_type: OrderType.Market,
      tif: TimeInForce.ImmediateOrCancel,
      post_only: false,
      reduce_only: false,
      stp_mode: StpMode.ExpireMaker,
      expiry: 0,
    });
    expect(shortBuf[40] & 1).toBe(1);
  });

  it('should encode postOnly and reduceOnly flags', () => {
    const buf = encodeOrder({
      market_id: '0',
      size: '0',
      price: '0',
      side: Side.Long,
      order_type: OrderType.Limit,
      tif: TimeInForce.GoodTillCancelled,
      post_only: true,
      reduce_only: true,
      stp_mode: StpMode.ExpireMaker,
      expiry: 0,
    });
    expect(buf[40] & 0x02).toBe(2); // postOnly
    expect(buf[40] & 0x04).toBe(4); // reduceOnly
  });

  it('should encode stpMode in bits 3-4', () => {
    const buf = encodeOrder({
      market_id: '0',
      size: '0',
      price: '0',
      side: Side.Long,
      order_type: OrderType.Market,
      tif: TimeInForce.ImmediateOrCancel,
      post_only: false,
      reduce_only: false,
      stp_mode: StpMode.None, // value = 3
      expiry: 0,
    });
    expect((buf[40] >> 3) & 3).toBe(3);
  });

  it('should encode orderType and tif', () => {
    const buf = encodeOrder({
      market_id: '0',
      size: '0',
      price: '0',
      side: Side.Long,
      order_type: OrderType.Limit,
      tif: TimeInForce.FillOrKill,
      post_only: false,
      reduce_only: false,
      stp_mode: StpMode.ExpireMaker,
      expiry: 0,
    });
    expect(buf[41]).toBe(OrderType.Limit);
    expect(buf[42]).toBe(TimeInForce.FillOrKill);
  });

  it('should encode expiry in last 4 bytes', () => {
    const expiry = 1700000000;
    const buf = encodeOrder({
      market_id: '0',
      size: '0',
      price: '0',
      side: Side.Long,
      order_type: OrderType.Limit,
      tif: TimeInForce.GoodTillTime,
      post_only: false,
      reduce_only: false,
      stp_mode: StpMode.ExpireMaker,
      expiry,
    });
    const view = new DataView(buf.buffer);
    expect(view.getUint32(43)).toBe(expiry);
  });

  it('should encode size and price as uint128', () => {
    const size = BigInt('1000000000000000000'); // 1e18
    const price = BigInt('50000000000000000000000'); // 50000e18
    const buf = encodeOrder({
      market_id: '0',
      size: size.toString(),
      price: price.toString(),
      side: Side.Long,
      order_type: OrderType.Market,
      tif: TimeInForce.ImmediateOrCancel,
      post_only: false,
      reduce_only: false,
      stp_mode: StpMode.ExpireMaker,
      expiry: 0,
    });

    // Extract size from bytes 8-24
    const sizeHex = Array.from(buf.slice(8, 24)).map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(BigInt('0x' + sizeHex)).toBe(size);

    // Extract price from bytes 24-40
    const priceHex = Array.from(buf.slice(24, 40)).map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(BigInt('0x' + priceHex)).toBe(price);
  });
});

describe('encodeCancelOrder', () => {
  it('should produce valid ABI-encoded bytes32', () => {
    const buf = encodeCancelOrder({
      market_id: '1',
      order_id: '12345',
    });
    // ABI-encoded bytes32 is 32 bytes
    expect(buf.length).toBe(32);
  });

  it('should embed marketId in upper bits and orderId in lower bits', () => {
    const marketId = '2';
    const orderId = '999';
    const expected = (BigInt(marketId) << 192n) | BigInt(orderId);
    const expectedHex = '0x' + expected.toString(16).padStart(64, '0');

    const buf = encodeCancelOrder({ market_id: marketId, order_id: orderId });

    // Decode the ABI-encoded bytes32
    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['bytes32'], buf);
    expect(decoded[0]).toBe(expectedHex);
  });
});
