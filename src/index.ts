// Clients
export { InfoClient } from './clients/InfoClient.js';
export { ExchangeClient } from './clients/ExchangeClient.js';
export { WebSocketClient } from './clients/WebSocketClient.js';

// Types - Common
export { Side, OrderType, TimeInForce, StpMode, MarginMode } from './types/common.js';

// Types - Config
export type { ClientOptions, ExchangeClientOptions, Eip712Domain, SystemConfig } from './types/config.js';

// Types - Market
export type { Market, MarketConfig, Orderbook, OrderbookLevel, Trade, Candle, FundingRate } from './types/market.js';

// Types - Account
export type { Balance, Position, FundingPayment, Transfer, RealizedPnl } from './types/account.js';

// Types - Order
export type { OrderParams, CancelParams, TpSlParams, OrderResponse, CancelResponse, CancelAllResponse, OpenOrder, OrderHistoryEntry, Fill } from './types/order.js';

// Types - Auth
export type { PermitParams, NonceState, SignerInfo, SessionKeyStatus, RegisterSignerResult } from './types/auth.js';

// Types - WebSocket
export type {
  WsChannel,
  WsSubscription,
  WsMessage,
  WsOrderbookUpdate,
  WsTradeUpdate,
  WsOrderUpdate,
  WsPositionUpdate,
  WsFillUpdate,
  WsEventHandler,
} from './types/websocket.js';

// Utils
export { formatWad, parseWad, parseWadString } from './utils/format.js';
export { RiseApiError, RiseSigningError, RiseRateLimitError } from './utils/errors.js';

// Signing (advanced use)
export { encodeOrder, encodeCancelOrder, encodeCancelAll, encodeLeverage, encodeMarginMode, encodeIsolatedMargin } from './signing/encoder.js';
export { createPermitParams } from './signing/permit.js';
export { createRegisterSignerSignatures, fixSignatureV } from './signing/signer.js';
export { REGISTER_SIGNER_TYPES, VERIFY_SIGNER_TYPES, REVOKE_SIGNER_TYPES, VERIFY_WITNESS_TYPES } from './signing/domain.js';
