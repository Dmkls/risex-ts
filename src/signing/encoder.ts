import { ethers } from 'ethers';
import { ACTION_PLACE_ORDER, ACTION_CANCEL_ORDER, ACTION_CANCEL_ALL_ORDERS } from '../utils/constants.js';
import type { OrderParams, CancelParams } from '../types/order.js';

const ACTION_PLACE_ORDER_HASH = ethers.keccak256(ethers.toUtf8Bytes(ACTION_PLACE_ORDER));
const ACTION_CANCEL_ORDER_HASH = ethers.keccak256(ethers.toUtf8Bytes(ACTION_CANCEL_ORDER));
const ACTION_CANCEL_ALL_ORDERS_HASH = ethers.keccak256(ethers.toUtf8Bytes(ACTION_CANCEL_ALL_ORDERS));

// Protocol header flags
const V3_FLAG_PERMIT = 0x01;
const V3_FLAG_BUILDER = 0x02;
const V3_FLAG_CLIENT_ID = 0x04;
const V3_FLAG_PERMIT_ERC1271 = 0x09;
const V3_FLAG_TTL = 0x10;

/**
 * Encode order parameters into 88-bit compressed format.
 *
 * Bit layout (88 bits, big-endian):
 *   [87:70]  marketId      (16 bits, shifted left by 70)
 *   [69:38]  sizeSteps     (32 bits, shifted left by 38)
 *   [37:14]  priceTicks    (24 bits, shifted left by 14)
 *   [13:6]   order flags   (8 bits, shifted left by 6)
 *   [5:1]    headerVersion (5 bits, always 1, shifted left by 1)
 *   [0]      reserved      (1 bit, always 0)
 */
function encodeOrderData(p: OrderParams): bigint {
  // Order flags byte: bit0=side, bit1=postOnly, bit2=reduceOnly, bits3-4=stpMode, bit5=orderType, bits6-7=timeInForce
  let orderFlags = 0;
  if (p.side & 1) orderFlags |= 0x01;
  if (p.post_only) orderFlags |= 0x02;
  if (p.reduce_only) orderFlags |= 0x04;
  orderFlags |= (p.stp_mode & 3) << 3;
  orderFlags |= (p.order_type & 1) << 5;
  orderFlags |= (p.time_in_force & 3) << 6;

  const headerVersion = 1;

  let data = 0n;
  data |= BigInt(p.market_id & 0xFFFF) << 70n;       // [87:70]
  data |= BigInt(p.size_steps & 0xFFFFFFFF) << 38n;   // [69:38]
  data |= BigInt(p.price_ticks & 0xFFFFFF) << 14n;    // [37:14]
  data |= BigInt(orderFlags & 0xFF) << 6n;             // [13:6]
  data |= BigInt((headerVersion & 0x1F) << 1);         // [5:1]

  return data;
}

/**
 * Compute protocol header flags based on which optional fields are present.
 */
function computeHeaderFlags(builderId: number, clientOrderId: bigint, ttlUnits: number, isErc1271 = false): number {
  let flags = isErc1271 ? V3_FLAG_PERMIT_ERC1271 : V3_FLAG_PERMIT;
  if (builderId !== 0) flags |= V3_FLAG_BUILDER;
  if (clientOrderId !== 0n) flags |= V3_FLAG_CLIENT_ID;
  if (ttlUnits !== 0) flags |= V3_FLAG_TTL;
  return flags;
}

/**
 * Compute the hash for a place order action.
 * hash = keccak256(abi.encode(actionTypeHash, headerFlags, orderData, builderID, clientOrderID, ttlUnits))
 */
export function encodeOrder(p: OrderParams, isErc1271 = false): string {
  const orderData = encodeOrderData(p);
  const clientOrderId = BigInt(p.client_order_id ?? '0');
  const headerFlags = computeHeaderFlags(p.builder_id ?? 0, clientOrderId, p.ttl_units, isErc1271);

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'uint8', 'uint256', 'uint16', 'uint64', 'uint16'],
    [
      ACTION_PLACE_ORDER_HASH,
      headerFlags,
      orderData,
      p.builder_id ?? 0,
      clientOrderId,
      p.ttl_units,
    ],
  );

  return ethers.keccak256(encoded);
}

/**
 * Compute the hash for a cancel order action.
 * hash = keccak256(abi.encode(actionTypeHash, uint256(marketID), uint256(restingOrderID)))
 *
 * The witness uses the resting_order_id (uint64) and the API market_id,
 * NOT the composite order_id or sc_order_id.
 */
export function encodeCancelOrder(p: CancelParams): string {
  if (p.resting_order_id == null) {
    throw new Error('resting_order_id is required for cancel. Fetch it from getOpenOrders().');
  }
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'uint256', 'uint256'],
    [ACTION_CANCEL_ORDER_HASH, BigInt(p.market_id), BigInt(p.resting_order_id)],
  );
  return ethers.keccak256(encoded);
}

/**
 * Compute the hash for a cancel-all action.
 * hash = keccak256(abi.encode(actionTypeHash, uint256(marketID)))
 */
export function encodeCancelAll(marketId: number): string {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'uint256'],
    [ACTION_CANCEL_ALL_ORDERS_HASH, BigInt(marketId)],
  );
  return ethers.keccak256(encoded);
}

// Re-export for advanced use
export { V3_FLAG_PERMIT, V3_FLAG_PERMIT_ERC1271, V3_FLAG_BUILDER, V3_FLAG_CLIENT_ID, V3_FLAG_TTL };

/**
 * Encode leverage update parameters.
 */
export function encodeLeverage(marketId: number, leverage: bigint): string {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'uint128'],
    [BigInt(marketId), leverage],
  );
  return ethers.keccak256(encoded);
}

/**
 * Encode margin mode update parameters.
 */
export function encodeMarginMode(marketId: number, marginMode: number): string {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'uint8'],
    [BigInt(marketId), marginMode],
  );
  return ethers.keccak256(encoded);
}

/**
 * Encode isolated margin update parameters.
 */
export function encodeIsolatedMargin(marketId: number, amount: bigint): string {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'int256'],
    [BigInt(marketId), amount],
  );
  return ethers.keccak256(encoded);
}
