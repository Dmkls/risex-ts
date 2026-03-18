import { ethers } from 'ethers';
import { InfoClient } from './InfoClient.js';
import { createPermitParams } from '../signing/permit.js';
import { createRegisterSignerSignatures } from '../signing/signer.js';
import { encodeOrder, encodeCancelOrder, encodeLeverage, encodeMarginMode, encodeIsolatedMargin } from '../signing/encoder.js';
import { Side, OrderType, TimeInForce, StpMode, MarginMode } from '../types/common.js';
import type { ExchangeClientOptions, Eip712Domain } from '../types/config.js';
import type { OrderParams, CancelParams, OrderResponse } from '../types/order.js';
import type { PermitParams, RegisterSignerResult } from '../types/auth.js';

export class ExchangeClient {
  public readonly info: InfoClient;

  private readonly accountWallet: ethers.Wallet;
  private readonly signerWallet: ethers.Wallet;
  private domain!: Eip712Domain;
  private target!: string;
  private initialized = false;

  public readonly account: string;
  public readonly signer: string;

  constructor(opts: ExchangeClientOptions) {
    this.info = new InfoClient(opts);
    this.accountWallet = new ethers.Wallet(opts.accountKey);
    this.signerWallet = new ethers.Wallet(opts.signerKey);
    this.account = this.accountWallet.address;
    this.signer = this.signerWallet.address;
  }

  /**
   * Initialize the client by fetching the EIP-712 domain and contract addresses.
   * Must be called before any authenticated operations.
   */
  async init(): Promise<this> {
    this.domain = await this.info.getEip712Domain();

    const config = await this.info.getSystemConfig();
    this.target =
      config.addresses?.perp_v2?.orders_manager as string ??
      config.contract_addresses?.perps_manager as string;
    if (!this.target) throw new Error('Could not find orders_manager in system config');

    this.initialized = true;
    return this;
  }

  private assertInit(): void {
    if (!this.initialized) throw new Error('ExchangeClient not initialized. Call init() first.');
  }

  // ── Auth ────────────────────────────────────────────────

  async isSignerRegistered(): Promise<boolean> {
    const res = await this.info.getSessionKeyStatus(this.account, this.signer);
    return res.status === 1;
  }

  async registerSigner(label = 'risex-ts'): Promise<RegisterSignerResult> {
    this.assertInit();
    if (await this.isSignerRegistered()) return { alreadyActive: true };

    const sigs = await createRegisterSignerSignatures(
      this.accountWallet,
      this.signerWallet,
      this.domain,
    );

    return this.info['http'].post<RegisterSignerResult>('/v1/auth/register-signer', {
      account: this.account,
      signer: this.signer,
      message: sigs.message,
      nonce: sigs.nonce,
      expiration: sigs.expiration,
      account_signature: sigs.accountSignature,
      signer_signature: sigs.signerSignature,
      label,
    });
  }

  async revokeSigner(signerAddress?: string): Promise<unknown> {
    this.assertInit();
    const target = signerAddress ?? this.signer;
    const sigs = await createRegisterSignerSignatures(
      this.accountWallet,
      this.signerWallet,
      this.domain,
    );
    return this.info['http'].post('/v1/auth/revoke-signer', {
      account: this.account,
      signer: target,
      nonce: sigs.nonce,
      account_signature: sigs.accountSignature,
      signer_signature: sigs.signerSignature,
    });
  }

  // ── Orders ──────────────────────────────────────────────

  private async createPermit(encodedData: Uint8Array): Promise<PermitParams> {
    this.assertInit();
    return createPermitParams(
      encodedData,
      this.signerWallet,
      this.account,
      this.target,
      this.domain,
    );
  }

  async placeOrder(orderParams: OrderParams): Promise<OrderResponse> {
    const encoded = encodeOrder(orderParams);
    const permit = await this.createPermit(encoded);

    return this.info['http'].post<OrderResponse>('/v1/orders/place', {
      order_params: orderParams,
      permit_params: permit,
    });
  }

  async cancelOrder(params: CancelParams): Promise<unknown> {
    const encoded = encodeCancelOrder(params);
    const permit = await this.createPermit(encoded);

    return this.info['http'].post('/v1/orders/cancel', {
      market_id: params.market_id,
      order_id: params.order_id,
      permit_params: permit,
    });
  }

  async cancelAllOrders(marketId?: number): Promise<unknown> {
    const orders = await this.info.getOpenOrders(this.account, marketId);
    const results = await Promise.all(
      orders.map((o) =>
        this.cancelOrder({ market_id: o.market_id, order_id: o.order_id }),
      ),
    );
    return results;
  }

  // ── Convenience order methods ───────────────────────────

  async marketBuy(marketId: number, size: bigint | string): Promise<OrderResponse> {
    return this.placeOrder({
      market_id: String(marketId),
      size: String(size),
      price: '0',
      side: Side.Long,
      order_type: OrderType.Market,
      tif: TimeInForce.ImmediateOrCancel,
      post_only: false,
      reduce_only: false,
      stp_mode: StpMode.ExpireMaker,
      expiry: 0,
    });
  }

  async marketSell(marketId: number, size: bigint | string, reduceOnly = false): Promise<OrderResponse> {
    return this.placeOrder({
      market_id: String(marketId),
      size: String(size),
      price: '0',
      side: Side.Short,
      order_type: OrderType.Market,
      tif: TimeInForce.ImmediateOrCancel,
      post_only: false,
      reduce_only: reduceOnly,
      stp_mode: StpMode.ExpireMaker,
      expiry: 0,
    });
  }

  async limitBuy(
    marketId: number,
    size: bigint | string,
    price: bigint | string,
    postOnly = false,
  ): Promise<OrderResponse> {
    return this.placeOrder({
      market_id: String(marketId),
      size: String(size),
      price: String(price),
      side: Side.Long,
      order_type: OrderType.Limit,
      tif: TimeInForce.GoodTillCancelled,
      post_only: postOnly,
      reduce_only: false,
      stp_mode: StpMode.ExpireMaker,
      expiry: 0,
    });
  }

  async limitSell(
    marketId: number,
    size: bigint | string,
    price: bigint | string,
    postOnly = false,
  ): Promise<OrderResponse> {
    return this.placeOrder({
      market_id: String(marketId),
      size: String(size),
      price: String(price),
      side: Side.Short,
      order_type: OrderType.Limit,
      tif: TimeInForce.GoodTillCancelled,
      post_only: postOnly,
      reduce_only: false,
      stp_mode: StpMode.ExpireMaker,
      expiry: 0,
    });
  }

  async closePosition(marketId: number): Promise<OrderResponse | null> {
    const pos = await this.info.getPosition(marketId, this.account);
    if (!pos || pos.size === '0') return null;

    const size = (() => { const s = BigInt(pos.size); return s < 0n ? -s : s; })();
    const isLong = pos.side === 0;
    return isLong
      ? this.marketSell(marketId, size, true)
      : this.marketBuy(marketId, size);
  }

  // ── Account management ─────────────────────────────────

  async deposit(amount: string): Promise<unknown> {
    return this.info['http'].post('/v1/account/deposit', {
      account: this.account,
      amount,
    });
  }

  async updateLeverage(marketId: number, leverage: bigint): Promise<unknown> {
    const encoded = encodeLeverage(String(marketId), leverage);
    const permit = await this.createPermit(encoded);

    return this.info['http'].post('/v1/account/leverage', {
      market_id: String(marketId),
      leverage: String(leverage),
      permit_params: permit,
    });
  }

  async updateMarginMode(marketId: number, mode: MarginMode): Promise<unknown> {
    const encoded = encodeMarginMode(String(marketId), mode);
    const permit = await this.createPermit(encoded);

    return this.info['http'].post('/v1/account/margin-mode', {
      market_id: String(marketId),
      margin_mode: mode,
      permit_params: permit,
    });
  }

  async updateIsolatedMargin(marketId: number, amount: bigint): Promise<unknown> {
    const encoded = encodeIsolatedMargin(String(marketId), amount);
    const permit = await this.createPermit(encoded);

    return this.info['http'].post('/v1/account/update-isolated-margin', {
      market_id: String(marketId),
      amount: String(amount),
      permit_params: permit,
    });
  }

  // ── TP/SL ───────────────────────────────────────────────

  async placeTpSlOrder(params: {
    market_id: string;
    take_profit_price?: string;
    stop_loss_price?: string;
    [key: string]: unknown;
  }): Promise<unknown> {
    // TP/SL orders use ABI encoding of relevant params
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = ethers.getBytes(
      abiCoder.encode(
        ['uint256', 'uint256', 'uint256'],
        [
          BigInt(params.market_id),
          params.take_profit_price ? BigInt(params.take_profit_price) : 0n,
          params.stop_loss_price ? BigInt(params.stop_loss_price) : 0n,
        ],
      ),
    );
    const permit = await this.createPermit(encoded);

    return this.info['http'].post('/v1/orders/tp-sl/place', {
      ...params,
      permit_params: permit,
    });
  }

  async cancelTpSlOrder(params: {
    market_id: string;
    order_id: string;
    [key: string]: unknown;
  }): Promise<unknown> {
    const encoded = encodeCancelOrder({
      market_id: params.market_id,
      order_id: params.order_id,
    });
    const permit = await this.createPermit(encoded);

    return this.info['http'].post('/v1/orders/tp-sl/cancel', {
      ...params,
      permit_params: permit,
    });
  }
}
