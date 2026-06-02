/**
 * Channels the WS gateway accepts on `subscribe`. The server rejects any other
 * value with `"invalid channel: <name>"`.
 *
 * Public (no auth required): `orderbook`, `trades`, `orders`, `positions`,
 * `oracle`, `funding`.
 *
 * Private (server returns `"authentication required for <name> channel"` until
 * `authenticate()` succeeds): `fills`, `account`.
 *
 * Note: the `funding` channel is currently silent on testnet — it acks the
 * subscribe but does not emit any messages. Tracked separately; the channel
 * name is correct and the SDK exposes it so consumers can subscribe once the
 * backend starts publishing.
 */
export type WsChannel =
  | 'orderbook'
  | 'trades'
  | 'orders'
  | 'positions'
  | 'fills'
  | 'account'
  | 'oracle'
  | 'funding';

export interface WsSubscription {
  channel: WsChannel;
  /** Market IDs to subscribe to. Omit to subscribe to all markets. */
  market_ids?: number[];
  /**
   * Maker addresses to filter by. For private channels (`orders`, `positions`,
   * `funding`) the server auto-fills this with the authenticated account if
   * omitted — you usually don't need to set it. For `fills` and `account` the
   * server ignores any value here and always pins to the authenticated account.
   */
  makers?: string[];
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

export interface WsAuthParams {
  account: string;
  signer: string;
  message: string;
  nonce: number;
  expiration: number;
  signature: string;
}

export type WsEventHandler = (message: WsMessage) => void;
