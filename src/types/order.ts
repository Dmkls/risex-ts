import type { Side, OrderType, TimeInForce, StpMode } from './common.js';

export interface OrderParams {
  market_id: string;
  size: string;
  price: string;
  side: Side;
  order_type: OrderType;
  tif: TimeInForce;
  post_only: boolean;
  reduce_only: boolean;
  stp_mode: StpMode;
  expiry: number;
}

export interface CancelParams {
  market_id: string;
  order_id: string;
}

export interface TpSlParams {
  market_id: string;
  take_profit_price?: string;
  stop_loss_price?: string;
  take_profit_order_type?: OrderType;
  stop_loss_order_type?: OrderType;
  [key: string]: unknown;
}

export interface OrderResponse {
  order_id: string;
  transaction_hash: string;
  [key: string]: unknown;
}

export interface OpenOrder {
  order_id: string;
  market_id: string;
  side: number;
  size: string;
  price: string;
  filled_size?: string;
  order_type: number;
  status: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface OrderHistoryEntry {
  order_id: string;
  market_id: string;
  side: number;
  size: string;
  price: string;
  filled_size?: string;
  order_type: number;
  status: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface Fill {
  fill_id?: string;
  order_id: string;
  market_id: string;
  side: number;
  size: string;
  price: string;
  fee?: string;
  timestamp: string;
  [key: string]: unknown;
}
