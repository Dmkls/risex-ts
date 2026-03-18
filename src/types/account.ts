export interface Balance {
  balance: string;
  [key: string]: unknown;
}

export interface Equity {
  equity: string;
  [key: string]: unknown;
}

export interface Position {
  market_id: string;
  size: string;
  side: number;
  entry_price: string;
  mark_price?: string;
  unrealized_pnl?: string;
  liquidation_price?: string;
  leverage?: string;
  margin_mode?: number;
  [key: string]: unknown;
}

export interface FundingPayment {
  market_id: string;
  amount: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface Transfer {
  amount: string;
  type: string;
  timestamp: string;
  transaction_hash?: string;
  [key: string]: unknown;
}

export interface RealizedPnl {
  total_realized_pnl: string;
  [key: string]: unknown;
}
