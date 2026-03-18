export type WsChannel =
  | 'orderbook'
  | 'trades'
  | 'orders'
  | 'positions'
  | 'funding'
  | 'fills';

export interface WsSubscription {
  channel: WsChannel;
  market_id?: number;
  account?: string;
}

export interface WsMessage {
  channel: string;
  type: string;
  data: unknown;
  [key: string]: unknown;
}

export interface WsOrderbookUpdate {
  market_id: number;
  bids: Array<[string, string]>;
  asks: Array<[string, string]>;
  checksum?: number;
  timestamp?: string;
}

export interface WsTradeUpdate {
  market_id: string;
  price: string;
  size: string;
  side: number;
  timestamp: string;
}

export interface WsOrderUpdate {
  order_id: string;
  market_id: string;
  side: number;
  size: string;
  price: string;
  status: string;
  [key: string]: unknown;
}

export interface WsPositionUpdate {
  market_id: string;
  size: string;
  side: number;
  entry_price: string;
  unrealized_pnl?: string;
  [key: string]: unknown;
}

export interface WsFillUpdate {
  order_id: string;
  market_id: string;
  side: number;
  size: string;
  price: string;
  fee?: string;
  timestamp: string;
  [key: string]: unknown;
}

export type WsEventHandler = (message: WsMessage) => void;
