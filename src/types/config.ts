export interface Eip712Domain {
  name: string;
  version: string;
  chainId: bigint;
  verifyingContract: string;
}

export interface SystemConfig {
  addresses: {
    perp_v2?: {
      orders_manager?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  contract_addresses?: {
    perps_manager?: string;
    [key: string]: unknown;
  };
  addresses_config?: {
    perp?: string;
    auth?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ClientOptions {
  /** API base URL (default: testnet) */
  baseUrl?: string;
  /** WebSocket URL (default: testnet) */
  wsUrl?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Log level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none';
}

export interface ExchangeClientOptions extends ClientOptions {
  /** Main wallet private key (hex, with or without 0x prefix) */
  accountKey: string;
  /** Signer/session key private key (hex, with or without 0x prefix) */
  signerKey: string;
}
