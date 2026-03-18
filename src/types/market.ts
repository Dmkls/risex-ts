export interface MarketConfig {
  min_order_size: string;
  step_size: string;
  step_price: string;
  max_leverage: string;
  [key: string]: unknown;
}

export interface Market {
  market_id: string;
  display_name: string;
  base_asset_symbol: string;
  quote_asset_symbol: string;
  last_price: string;
  mark_price: string;
  index_price: string;
  visible: boolean;
  post_only: boolean;
  config: MarketConfig;
  [key: string]: unknown;
}

export interface OrderbookLevel {
  price: string;
  quantity: string;
}

export interface Orderbook {
  market_id: number;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  timestamp?: string;
  checksum?: number;
}

export interface Trade {
  market_id: string;
  price: string;
  size: string;
  side: number;
  timestamp: string;
  [key: string]: unknown;
}

export interface Candle {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  [key: string]: unknown;
}

export interface FundingRate {
  market_id: string;
  funding_rate: string;
  timestamp: string;
  [key: string]: unknown;
}
