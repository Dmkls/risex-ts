export const DEFAULT_BASE_URL = 'https://api.staging.rise.trade';
export const DEFAULT_WS_URL = 'wss://ws.staging.rise.trade/ws';

export const REST_RATE_LIMIT = 500;
export const REST_RATE_WINDOW_MS = 10_000;
export const WS_RATE_LIMIT = 10;
export const WS_RATE_WINDOW_MS = 1_000;

export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_DEADLINE_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const DEFAULT_SIGNER_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

export const WS_HEARTBEAT_INTERVAL_MS = 15_000;
export const WS_RECONNECT_DELAY_MS = 1_000;
export const WS_MAX_RECONNECT_DELAY_MS = 30_000;

export const WAD_DECIMALS = 18;

// Action type hashes for EIP-712 signing
export const ACTION_PLACE_ORDER = 'RISE_PERPS_PLACE_ORDER_V1';
export const ACTION_CANCEL_ORDER = 'RISE_PERPS_CANCEL_ORDER_V1';
export const ACTION_CANCEL_ALL_ORDERS = 'RISE_PERPS_CANCEL_ALL_ORDERS_V1';
