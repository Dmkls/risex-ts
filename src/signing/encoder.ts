import { ethers } from 'ethers';
import type { OrderParams, CancelParams } from '../types/order.js';

/**
 * Encode order parameters into a 47-byte packed binary format.
 *
 * Layout:
 *   bytes[0:8]   - marketId  (uint64)
 *   bytes[8:24]  - size      (uint128)
 *   bytes[24:40] - price     (uint128)
 *   bytes[40]    - flags     (uint8: bit0=side, bit1=postOnly, bit2=reduceOnly, bits3-4=stpMode)
 *   bytes[41]    - orderType (uint8)
 *   bytes[42]    - tif       (uint8)
 *   bytes[43:47] - expiry    (uint32)
 */
export function encodeOrder(p: OrderParams): Uint8Array {
  const buf = new Uint8Array(47);
  const view = new DataView(buf.buffer);

  // marketId as uint64 big-endian
  view.setBigUint64(0, BigInt(p.market_id));

  // size as uint128 big-endian (16 bytes)
  const sizeHex = BigInt(p.size).toString(16).padStart(32, '0');
  for (let i = 0; i < 16; i++) buf[8 + i] = parseInt(sizeHex.slice(i * 2, i * 2 + 2), 16);

  // price as uint128 big-endian (16 bytes)
  const priceHex = BigInt(p.price).toString(16).padStart(32, '0');
  for (let i = 0; i < 16; i++) buf[24 + i] = parseInt(priceHex.slice(i * 2, i * 2 + 2), 16);

  // flags: bit0=side, bit1=postOnly, bit2=reduceOnly, bits3-4=stpMode
  buf[40] = (p.side & 1) | (p.post_only ? 2 : 0) | (p.reduce_only ? 4 : 0) | ((p.stp_mode & 3) << 3);

  // orderType, tif
  buf[41] = p.order_type;
  buf[42] = p.tif;

  // expiry as uint32 big-endian
  view.setUint32(43, p.expiry);

  return buf;
}

/**
 * Encode cancel order parameters.
 * Binary layout (32 bytes): (marketId << 192) | orderId
 * Then ABI-encoded as bytes32.
 */
export function encodeCancelOrder(p: CancelParams): Uint8Array {
  const cancelData = (BigInt(p.market_id) << 192n) | BigInt(p.order_id);
  const hex = cancelData.toString(16).padStart(64, '0');
  // ABI encode as bytes32
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32'],
    ['0x' + hex],
  );
  return ethers.getBytes(encoded);
}

/**
 * Encode leverage update parameters.
 */
export function encodeLeverage(marketId: string, leverage: bigint): Uint8Array {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'uint128'],
    [BigInt(marketId), leverage],
  );
  return ethers.getBytes(encoded);
}

/**
 * Encode margin mode update parameters.
 */
export function encodeMarginMode(marketId: string, marginMode: number): Uint8Array {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'uint8'],
    [BigInt(marketId), marginMode],
  );
  return ethers.getBytes(encoded);
}

/**
 * Encode isolated margin update parameters.
 */
export function encodeIsolatedMargin(marketId: string, amount: bigint): Uint8Array {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'int256'],
    [BigInt(marketId), amount],
  );
  return ethers.getBytes(encoded);
}
