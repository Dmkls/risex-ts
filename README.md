# risex-ts

TypeScript SDK for [RISEx](https://rise.trade), a fully onchain CLOB perpetuals DEX on RISE Chain (Ethereum L2).

```ts
import { ExchangeClient } from 'risex-ts';

const client = new ExchangeClient({
  account: process.env.ACCOUNT_ADDRESS,
  signerKey: process.env.SIGNER_PRIVATE_KEY,
});

await client.init();

const order = await client.marketBuy(2, 1); // 1 step of ETH-PERP
console.log('Order:', order.order_id, 'tx:', order.tx_hash);
```

## Install

```bash
npm install risex-ts
```

Requires **Node 18+**. No peer dependencies.

### Setup

1. Go to the [RISEx web app](https://rise.trade) and create an API signer key under **Settings > API Keys**
2. Set your environment variables:

```bash
# Your wallet address
ACCOUNT_ADDRESS=0x...

# API signer private key (from the web app)
SIGNER_PRIVATE_KEY=0x...
```

## Why use this?

- **Two clients, clean separation** — `InfoClient` for public reads, `ExchangeClient` for authenticated writes
- **Signing handled for you** — EIP-712 order encoding, bitmap nonces, and permit signing all built in
- **Dual ESM/CJS** — works in any Node.js project
- **Rate limiting included** — token bucket (500 req/10s REST, 10 req/s WS) so you don't get throttled
- **WebSocket with auto-reconnect** — orderbook, trades, and user data streams

## Quickstart

### Read-only: fetch markets and orderbook

```ts
import { InfoClient } from 'risex-ts';

const info = new InfoClient();

const markets = await info.getMarkets();
for (const m of markets) {
  console.log(`${m.display_name}: ${m.last_price}`);
}

const book = await info.getOrderbook(1); // BTC-PERP
console.log('Best bid:', book.bids[0]?.price);
console.log('Best ask:', book.asks[0]?.price);
```

### Trading: place and close a position

```ts
import { ExchangeClient } from 'risex-ts';

const client = new ExchangeClient({
  account: process.env.ACCOUNT_ADDRESS,
  signerKey: process.env.SIGNER_PRIVATE_KEY,
});

// Required: fetches EIP-712 domain and contract addresses
await client.init();

// Place a market buy on ETH-PERP (market_id=2), 1 step = 0.001 ETH
const order = await client.marketBuy(2, 1);
console.log('Filled:', order.order_id, 'tx:', order.tx_hash);

// Check position
const pos = await client.info.getPosition(2, client.account);
if (pos) {
  console.log('Position:', pos.size, pos.side === 0 ? 'Long' : 'Short');
}

// Close it
await client.closePosition(2);
```

### WebSocket: stream orderbook updates

```ts
import { WebSocketClient } from 'risex-ts';

const ws = new WebSocketClient();

ws.onChannel('orderbook', (msg) => {
  const data = msg.data as {
    bids?: Array<{ price: string; quantity: string }>;
    asks?: Array<{ price: string; quantity: string }>;
  };
  if (data.bids?.[0]) console.log('Top bid:', data.bids[0].price);
  if (data.asks?.[0]) console.log('Top ask:', data.asks[0].price);
});

await ws.connect();
ws.subscribe({ channel: 'orderbook', market_ids: [1] }); // BTC-PERP

// Channels: 'orderbook' | 'trades' | 'orders' | 'positions' | 'oracle' | 'ticker'
```

## API

### `InfoClient`

Public, read-only endpoints. No keys required.

```ts
const info = new InfoClient(options?)
```

| Option | Type | Default |
|--------|------|---------|
| `baseUrl` | `string` | `https://api.staging.rise.trade` |
| `timeout` | `number` | `30000` |
| `logLevel` | `'debug' \| 'info' \| 'warn' \| 'error' \| 'none'` | `'warn'` |

These options are shared by `ExchangeClient` and `WebSocketClient`. The `WebSocketClient` also accepts `wsUrl` (default: `wss://ws.staging.rise.trade/ws`).

#### Markets

| Method | Returns |
|--------|---------|
| `getMarkets()` | `Market[]` |
| `getOrderbook(marketId, limit?)` | `Orderbook` |
| `getTradeHistory(marketId, limit?)` | `Trade[]` |
| `getCandles(marketId, resolution, from?, to?)` | `Candle[]` |
| `getFundingRateHistory(marketId, limit?)` | `FundingRate[]` |

#### Account (read)

| Method | Returns |
|--------|---------|
| `getBalance(account)` | `string` |
| `getPosition(marketId, account)` | `Position \| null` |
| `getAllPositions(account)` | `Position[]` |
| `getOpenOrders(account, marketId?)` | `OpenOrder[]` |
| `getOrderHistory(account, marketId?, limit?)` | `OrderHistoryEntry[]` |
| `getAccountTradeHistory(account, marketId?, limit?)` | `Fill[]` |
| `getFundingPaymentHistory(account, limit?)` | `FundingPayment[]` |
| `getTransferHistory(account, limit?)` | `Transfer[]` |
| `getRealizedPnl(account)` | `RealizedPnl` |
| `getNonceState(account)` | `NonceState` |

#### System

| Method | Returns |
|--------|---------|
| `getSystemConfig()` | `SystemConfig` |
| `getEip712Domain()` | `Eip712Domain` |
| `getSessionKeyStatus(account, signer)` | `SessionKeyStatus` |
| `listSigners(account)` | `SignerInfo[]` |

---

### `ExchangeClient`

Authenticated client for trading. Holds an `InfoClient` at `client.info`.

```ts
const client = new ExchangeClient({
  account: '0x...',    // your wallet address
  signerKey: '0x...',  // API signer private key (from web app)
})

await client.init()  // required before any authenticated call
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `account` | `string` | Yes* | Your wallet address |
| `signerKey` | `string` | Yes | API signer private key |
| `accountKey` | `string` | No | Wallet private key (only for programmatic signer registration) |
| `baseUrl` | `string` | No | API base URL |

*Either `account` or `accountKey` must be provided. If `accountKey` is given, `account` is derived from it.

**Properties:**
- `client.account` — wallet address
- `client.signer` — signer address
- `client.info` — the underlying `InfoClient`

#### Orders

| Method | Description |
|--------|-------------|
| `placeOrder(params)` | Place an order with full `OrderParams`. Returns `{ order_id, sc_order_id, tx_hash }`. |
| `cancelOrder({ market_id, order_id })` | Cancel a specific order. |
| `cancelAllOrders(marketId?)` | Cancel all open orders. Pass `0` or omit for all markets. |

#### Convenience methods

| Method | Description |
|--------|-------------|
| `marketBuy(marketId, sizeSteps)` | Market buy. Size in steps (integer). |
| `marketSell(marketId, sizeSteps, reduceOnly?)` | Market sell. |
| `limitBuy(marketId, sizeSteps, priceTicks, postOnly?)` | Limit buy. |
| `limitSell(marketId, sizeSteps, priceTicks, postOnly?)` | Limit sell. |
| `closePosition(marketId)` | Close entire position. Returns `null` if no position. |

**Price and size** use ticks/steps (compact integers), not WAD. Check `market.config.step_price` and `market.config.step_size` for the conversion factor.

#### Account management

| Method | Description |
|--------|-------------|
| `deposit(amount)` | Deposit USDC. Amount in plain decimal (e.g. `"100"`). Gas-sponsored. |
| `updateLeverage(marketId, leverage)` | Set leverage (wad bigint, e.g. `parseWad("10")` for 10x). |
| `updateMarginMode(marketId, mode)` | Set `MarginMode.Cross` or `MarginMode.Isolated`. |
| `updateIsolatedMargin(marketId, amount)` | Add/remove isolated margin (positive to add, negative to remove). |

#### Auth

| Method | Description |
|--------|-------------|
| `isSignerRegistered()` | Check if signer is active. |
| `registerSigner(label?)` | Register a signer on-chain. **Requires `accountKey`.** |
| `revokeSigner(address?)` | Revoke a signer. **Requires `accountKey`.** |

`registerSigner` and `revokeSigner` require the `accountKey` option since they need the wallet's private key to sign the on-chain registration. Most users should create their signer via the RISEx web app instead.

---

### `WebSocketClient`

Extends `EventEmitter`. Auto-reconnects with exponential backoff.

```ts
const ws = new WebSocketClient(options?)

await ws.connect()
ws.subscribe({ channel, market_ids?, account? })
ws.unsubscribe({ channel, market_ids?, account? })
ws.disconnect()
```

| Property / Method | Description |
|-------------------|-------------|
| `ws.isConnected` | Current connection state. |
| `ws.on('message', handler)` | All messages. |
| `ws.on('open' \| 'close', handler)` | Connection lifecycle. |
| `ws.on('error', handler)` | Errors (safe — won't throw if no listener). |
| `ws.onChannel(channel, handler)` | Messages for a specific channel only. |
| `ws.offChannel(channel, handler)` | Remove a channel handler. |
| `WebSocketClient.orderbookChecksum(bids, asks)` | Static CRC32 checksum for orderbook validation. |

**Channels:** `'orderbook'` `'trades'` `'orders'` `'positions'` `'oracle'` `'ticker'`

---

### Enums

```ts
import { Side, OrderType, TimeInForce, StpMode, MarginMode } from 'risex-ts';

Side.Long         // 0
Side.Short        // 1
OrderType.Market  // 0
OrderType.Limit   // 1
TimeInForce.GoodTillCancelled  // 0
TimeInForce.ImmediateOrCancel  // 3
StpMode.None      // 3
MarginMode.Cross  // 0
MarginMode.Isolated // 1
```

### Errors

```ts
import { RiseApiError, RiseRateLimitError } from 'risex-ts';

try {
  await client.marketBuy(2, 1);
} catch (err) {
  if (err instanceof RiseApiError) {
    console.log(err.status, err.path, err.message);
  }
  if (err instanceof RiseRateLimitError) {
    console.log('Retry after', err.retryAfterMs, 'ms');
  }
}
```

### Advanced: signing primitives

For custom integrations, the signing internals are exported:

```ts
import {
  encodeOrder,
  encodeCancelOrder,
  encodeCancelAll,
  encodeLeverage,
  createPermitParams,
  createRegisterSignerSignatures,
  fixSignatureV,
  REGISTER_SIGNER_TYPES,
  VERIFY_WITNESS_TYPES,
} from 'risex-ts';
```

## Defaults and sharp edges

- **`init()` is required** — `ExchangeClient` will throw if you call authenticated methods before `init()`. It fetches the EIP-712 domain and contract addresses from the API.
- **Sizes use `sizeSteps`** — integer steps, not decimals. Check `market.config.step_size` for the step-to-decimal conversion (e.g. `step_size: "0.001"` means 1 step = 0.001).
- **Prices use `priceTicks`** — integer ticks. Check `market.config.step_price` for the tick-to-decimal conversion (e.g. `step_price: "0.1"` means 1 tick = $0.10).
- **Market orders use `priceTicks: 0`** — the matching engine ignores the price field for market orders.
- **Bitmap nonces** — the SDK fetches nonce state automatically via `GET /v1/nonce-state/{account}`. You don't need to manage nonces manually.
- **Rate limiting is automatic** — the client will wait (not throw) when the rate limit is approached. If you exhaust the bucket entirely, `RiseRateLimitError` is thrown.
- **Deposit amount is plain decimal** — `deposit('100')` deposits 100 USDC.
- **All timestamps from the API are in nanoseconds** unless documented otherwise.
- **WebSocket subscriptions use `market_ids`** — pass an array of market IDs (e.g. `[1, 2]`). Omit to subscribe to all markets.
- **Orderbook prices are decimal strings** — not WAD. e.g. `"68750.5"`, not `"68750500000000000000000"`.

## Compatibility

| Runtime | Support |
|---------|---------|
| Node.js 18+ | Full (ESM and CJS) |
| Node.js < 18 | Not supported (requires native `fetch`) |
| Browsers | Not tested; signing works but `ws` dependency needs polyfill |
| Bun / Deno | Should work (untested) |

## Troubleshooting

### `ExchangeClient not initialized. Call init() first.`

You called an authenticated method before `await client.init()`. Always init first:

```ts
const client = new ExchangeClient({ account, signerKey });
await client.init();
```

### `accountKey is required for this operation`

`registerSigner()` and `revokeSigner()` need the wallet's private key. Either:
- Create your signer via the [RISEx web app](https://rise.trade) (recommended), or
- Pass `accountKey` in the constructor options

### `SignerNotAuthorized`

The signer key isn't registered for this account. Create one via the RISEx web app, or call `registerSigner()` with `accountKey` provided.

### `Could not find router/orders_manager in system config`

The API returned a system config without the expected contract addresses. Check your `baseUrl`.

### `API /v1/orders/place → 400: ...`

Common causes:
- Signer not registered for this account
- Insufficient balance — check with `client.info.getBalance(client.account)`
- Size below minimum — check `market.config.min_order_size`
- Invalid market ID

### Rate limit errors

The SDK handles rate limiting automatically by waiting. If you see `RiseRateLimitError`, you've exhausted the full budget (500 requests in 10 seconds). Back off and retry.

### WebSocket won't connect

The default WS endpoint is `wss://ws.staging.rise.trade/ws`. Pass a custom URL if needed:

```ts
const ws = new WebSocketClient({ wsUrl: 'wss://ws.risex.trade/ws' });
```

## Contributing

```bash
git clone https://github.com/SmoothBot/risex-ts
cd risex-ts
npm install
npm test              # unit tests
npm run lint          # type-check
npm run build         # build ESM + CJS
```

Integration tests hit the staging API:

```bash
RUN_INTEGRATION=true npm test
```

## License

MIT
