import { HttpClient } from '../core/HttpClient.js';
import { DEFAULT_BASE_URL } from '../utils/constants.js';
import type { ClientOptions, SystemConfig, Eip712Domain } from '../types/config.js';
import type { Market, Orderbook, Trade, Candle, FundingRate } from '../types/market.js';
import type { Balance, Position, FundingPayment, Transfer, RealizedPnl } from '../types/account.js';
import type { OpenOrder, OrderHistoryEntry, Fill, TpslOrder } from '../types/order.js';
import type { SessionKeyStatus, SignerInfo, NonceState } from '../types/auth.js';

export class InfoClient {
  protected readonly http: HttpClient;

  constructor(opts?: ClientOptions) {
    this.http = new HttpClient({
      baseUrl: opts?.baseUrl ?? DEFAULT_BASE_URL,
      timeout: opts?.timeout,
      logLevel: opts?.logLevel,
    });
  }

  // ── System ──────────────────────────────────────────────

  async getSystemConfig(): Promise<SystemConfig> {
    return this.http.get<SystemConfig>('/v1/system/config');
  }

  async getEip712Domain(): Promise<Eip712Domain> {
    const raw = await this.http.get<Record<string, unknown>>('/v1/auth/eip712-domain');
    return {
      name: raw.name as string,
      version: raw.version as string,
      chainId: BigInt(raw.chain_id as string | number),
      verifyingContract: raw.verifying_contract as string,
    };
  }

  async getNonceState(account: string): Promise<NonceState> {
    return this.http.get<NonceState>(`/v1/nonce-state/${account}`);
  }

  // ── Markets ─────────────────────────────────────────────

  async getMarkets(): Promise<Market[]> {
    const data = await this.http.get<{ markets: Market[] }>('/v1/markets');
    return data.markets ?? [];
  }

  async getOrderbook(marketId: number, limit = 20): Promise<Orderbook> {
    return this.http.get<Orderbook>(`/v1/orderbook?market_id=${marketId}&limit=${limit}`);
  }

  async getTradeHistory(marketId: number, limit = 50): Promise<Trade[]> {
    const data = await this.http.get<{ trades: Trade[] }>(
      `/v1/trade-history?market_id=${marketId}&limit=${limit}`,
    );
    return data.trades ?? (data as unknown as Trade[]);
  }

  async getCandles(marketId: number, resolution: string, from?: number, to?: number): Promise<Candle[]> {
    let path = `/v1/markets/trading-view-data?market_id=${marketId}&resolution=${resolution}`;
    if (from) path += `&from=${from}`;
    if (to) path += `&to=${to}`;
    const data = await this.http.get<{ candles?: Candle[] }>(path);
    return data.candles ?? (data as unknown as Candle[]);
  }

  async getFundingRateHistory(marketId: number, limit = 50): Promise<FundingRate[]> {
    const data = await this.http.get<{ rates?: FundingRate[] }>(
      `/v1/markets/funding-rate-history?market_id=${marketId}&limit=${limit}`,
    );
    return data.rates ?? (data as unknown as FundingRate[]);
  }

  // ── Account (public read) ──────────────────────────────

  async getBalance(account: string): Promise<string> {
    const data = await this.http.get<Balance>(`/v1/account/cross-margin-balance?account=${account}`);
    return data.balance;
  }

  async getPosition(marketId: number, account: string): Promise<Position | null> {
    const data = await this.http.get<{ position: Position }>(
      `/v1/account/position?market_id=${marketId}&account=${account}`,
    );
    return data.position ?? null;
  }

  async getAllPositions(account: string): Promise<Position[]> {
    const data = await this.http.get<{ positions: Position[] }>(
      `/v1/positions?account=${account}`,
    );
    return data.positions ?? [];
  }

  async getOpenOrders(account: string, marketId?: number): Promise<OpenOrder[]> {
    let path = `/v1/orders/open?account=${account}`;
    if (marketId !== undefined) path += `&market_id=${marketId}`;
    const data = await this.http.get<{ orders: OpenOrder[] }>(path);
    return data.orders ?? [];
  }

  async getOpenTpslOrders(account: string): Promise<TpslOrder[]> {
    const data = await this.http.get<{ orders: TpslOrder[] }>(
      `/v1/orders/tpsl?account=${account}&statuses=TPSL_ORDER_STATUS_ACCEPTED`
    );
    return data.orders ?? [];
  }

  async getOrderHistory(account: string, marketId?: number, limit = 50): Promise<OrderHistoryEntry[]> {
    let path = `/v1/orders?account=${account}&limit=${limit}`;
    if (marketId !== undefined) path += `&market_id=${marketId}`;
    const data = await this.http.get<{ orders: OrderHistoryEntry[] }>(path);
    return data.orders ?? [];
  }

  async getAccountTradeHistory(account: string, marketId?: number, limit = 50): Promise<Fill[]> {
    let path = `/v1/trade-history?account=${account}&limit=${limit}`;
    if (marketId !== undefined) path += `&market_id=${marketId}`;
    const data = await this.http.get<{ fills?: Fill[]; trades?: Fill[] }>(path);
    return data.fills ?? data.trades ?? [];
  }

  async getFundingPaymentHistory(account: string, limit = 50): Promise<FundingPayment[]> {
    const data = await this.http.get<{ payments: FundingPayment[] }>(
      `/v1/account/funding-payments?account=${account}&limit=${limit}`,
    );
    return data.payments ?? [];
  }

  async getTransferHistory(account: string, limit = 50): Promise<Transfer[]> {
    const data = await this.http.get<{ transfers: Transfer[] }>(
      `/v1/account/transfer-history?account=${account}&limit=${limit}`,
    );
    return data.transfers ?? [];
  }

  async getRealizedPnl(account: string): Promise<RealizedPnl> {
    return this.http.get<RealizedPnl>(`/v1/account/realized-pnl?account=${account}`);
  }

  // ── Auth (read) ─────────────────────────────────────────

  async getSessionKeyStatus(account: string, signer: string): Promise<SessionKeyStatus> {
    return this.http.get<SessionKeyStatus>(
      `/v1/auth/session-key-status?account=${account}&signer=${signer}`,
    );
  }

  async listSigners(account: string): Promise<SignerInfo[]> {
    const data = await this.http.get<{ signers: SignerInfo[] }>(
      `/v1/auth/signers?account=${account}`,
    );
    return data.signers ?? [];
  }
}
