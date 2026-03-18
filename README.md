# risex-ts

TypeScript SDK for [RISEx](https://rise.trade), a fully onchain CLOB perpetuals DEX on RISE Chain (Ethereum L2).

```ts
import { ExchangeClient, formatWad } from 'risex-ts';

const client = new ExchangeClient({
  accountKey: process.env.ACCOUNT_PRIVATE_KEY,
  signerKey: process.env.SIGNER_PRIVATE_KEY,
});

await client.init();
await client.registerSigner();

const result = await client.marketBuy(2, '20000000000000000'); // 0.02 ETH-PERP
console.log('Order:', result.order_id);
```

## Install

```bash
npm install risex-ts
```

Requires **Node 18+**. No peer dependencies.

### Environment variables

```bash
# Your main wallet private key (hex, with or without 0x)
ACCOUNT_PRIVATE_KEY=0x...

# Signer/session key for trading
SIGNER_PRIVATE_KEY=0x...

# Optional: override API base URL (default: testnet)
API_URL=https://api.testnet.rise.trade
```

## Why use this?

- **Two clients, clean separation** — `InfoClient` for public reads, `ExchangeClient` for authenticated writes
- **Signing handled for you** — EIP-712 order encoding, nonce generation, and signer registration all built in
- **Dual ESM/CJS** — works in any Node.js project
- **Rate limiting included** — token bucket (500 req/10s REST, 10 req/s WS) so you don't get throttled
- **WebSocket with auto-reconnect** — orderbook, trades, and user data streams

## Quickstart

### Read-only: fetch markets and orderbook

```ts
import { InfoClient, formatWad } from 'risex-ts';

const info = new InfoClient();

const markets = await info.getMarkets();
for (const m of markets) {
  console.log(`${m.display_name}: ${m.last_price}`);
}

const book = await info.getOrderbook(1); // BTC-PERP
console.log('Best bid:', book.bids[0]?.price);
console.log('Best ask:', book.asks[0]?.price);

const balance = await info.getBalance('0xYourAddress');
console.log('Balance:', formatWad(balance), 'USDC');
```

### Trading: place and close a position

```ts
import { ExchangeClient, formatWad } from 'risex-ts';

const client = new ExchangeClient({
  accountKey: process.env.ACCOUNT_PRIVATE_KEY,
  signerKey: process.env.SIGNER_PRIVATE_KEY,
});

// Required: fetches EIP-712 domain and contract addresses
await client.init();

// Idempotent — safe to call every time
await client.registerSigner();

// Place a market buy on ETH-PERP (market_id=2), minimum size 0.02
const order = await client.marketBuy(2, '20000000000000000');
console.log('Filled:', order.order_id, order.transaction_hash);

// Check position
const pos = await client.info.getPosition(2, client.account);
if (pos) {
  console.log('Position:', formatWad(pos.size), pos.side === 0 ? 'Long' : 'Short');
}

// Close it
await client.closePosition(2);
```

### WebSocket: stream orderbook updates

```ts
import { WebSocketClient, formatWad } from 'risex-ts';

const ws = new WebSocketClient();

ws.onChannel('orderbook', (msg) => {
  const data = msg.data as {
    bids?: Array<{ price: string; quantity: string }>;
    asks?: Array<{ price: string; quantity: string }>;
  };
  if (data.bids?.[0]) console.log('Top bid:', formatWad(data.bids[0].price));
  if (data.asks?.[0]) console.log('Top ask:', formatWad(data.asks[0].price));
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
| `baseUrl` | `string` | `https://api.testnet.rise.trade` |
| `timeout` | `number` | `30000` |
| `logLevel` | `'debug' \| 'info' \| 'warn' \| 'error' \| 'none'` | `'warn'` |

These options are shared by `ExchangeClient` and `WebSocketClient`. The `WebSocketClient` also accepts `wsUrl` (default: `wss://ws.testnet.rise.trade/ws`).

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
| `getBalance(account)` | `string` (wad) |
| `getEquity(account)` | `string` (wad) |
| `getPosition(marketId, account)` | `Position \| null` |
| `getAllPositions(account)` | `Position[]` |
| `getOpenOrders(account, marketId?)` | `OpenOrder[]` |
| `getOrderHistory(account, marketId?, limit?)` | `OrderHistoryEntry[]` |
| `getAccountTradeHistory(account, marketId?, limit?)` | `Fill[]` |
| `getFundingPaymentHistory(account, limit?)` | `FundingPayment[]` |
| `getTransferHistory(account, limit?)` | `Transfer[]` |
| `getRealizedPnl(account)` | `RealizedPnl` |

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
  accountKey: '0x...',   // main wallet private key
  signerKey: '0x...',    // session/signer private key
  baseUrl?: string,
  timeout?: number,
  logLevel?: LogLevel,
})

await client.init()  // required before any authenticated call
```

**Properties:**
- `client.account` — main wallet address
- `client.signer` — signer address
- `client.info` — the underlying `InfoClient`

#### Auth

| Method | Description |
|--------|-------------|
| `registerSigner(label?)` | Register the signer key (idempotent). Returns `{ alreadyActive: true }` if already registered. |
| `isSignerRegistered()` | Check if signer is active. |
| `revokeSigner(address?)` | Revoke a signer. |

#### Orders

| Method | Description |
|--------|-------------|
| `placeOrder(params)` | Place an order with full `OrderParams`. Returns `{ order_id, transaction_hash }`. |
| `cancelOrder({ market_id, order_id })` | Cancel a specific order. |
| `cancelAllOrders(marketId?)` | Cancel all open orders (optionally filtered by market). |

#### Convenience methods

| Method | Description |
|--------|-------------|
| `marketBuy(marketId, size)` | Market buy. Size as bigint or string (wad). |
| `marketSell(marketId, size, reduceOnly?)` | Market sell. |
| `limitBuy(marketId, size, price, postOnly?)` | Limit buy. |
| `limitSell(marketId, size, price, postOnly?)` | Limit sell. |
| `closePosition(marketId)` | Close entire position. Returns `null` if no position. |

#### Account management

| Method | Description |
|--------|-------------|
| `deposit(amount)` | Deposit USDC. Amount in plain decimal (e.g. `"100"`). Gas-sponsored. |
| `updateLeverage(marketId, leverage)` | Set leverage (wad bigint, e.g. `parseWad("10")` for 10x). |
| `updateMarginMode(marketId, mode)` | Set `MarginMode.Cross` or `MarginMode.Isolated`. |
| `updateIsolatedMargin(marketId, amount)` | Add/remove isolated margin (positive to add, negative to remove). |
| `placeTpSlOrder(params)` | Place take-profit/stop-loss order. |
| `cancelTpSlOrder(params)` | Cancel a TP/SL order. |

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

### Utilities

```ts
import { formatWad, parseWad, parseWadString } from 'risex-ts';

formatWad('1000000000000000000')  // '1.0'
parseWad('1.5')                   // 1500000000000000000n
parseWadString('1.5')             // '1500000000000000000'
```

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
import { RiseApiError, RiseSigningError, RiseRateLimitError } from 'risex-ts';

try {
  await client.marketBuy(2, '20000000000000000');
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
  createNonce,
  encodeOrder,
  encodeCancelOrder,
  encodeLeverage,
  createPermitParams,
  createRegisterSignerSignatures,
  fixSignatureV,
  REGISTER_SIGNER_TYPES,
  VERIFY_SIGNATURE_TYPES,
} from 'risex-ts';
```

## Defaults and sharp edges

- **`init()` is required** — `ExchangeClient` will throw if you call authenticated methods before `init()`. It fetches the EIP-712 domain and contract addresses from the API.
- **Sizes and prices are wad strings** — 18-decimal integer strings (e.g. `'1000000000000000000'` = 1.0). Use `parseWad('1.0')` to convert.
- **Market orders use price `'0'`** — the matching engine ignores the price field for market orders.
- **Signer expiry** — signers expire after 30 days by default. Call `registerSigner()` again to re-register.
- **Rate limiting is automatic** — the client will wait (not throw) when the rate limit is approached. If you exhaust the bucket entirely, `RiseRateLimitError` is thrown.
- **Deposit amount is plain decimal** — `deposit('100')` deposits 100 USDC, not a wad value.
- **All timestamps from the API are in nanoseconds** unless documented otherwise.
- **WebSocket subscriptions use `market_ids`** — pass an array of market IDs (e.g. `[1, 2]`). Omit to subscribe to all markets.
- **WebSocket URL** — defaults to `wss://ws.testnet.rise.trade/ws`. Pass `wsUrl` in options to override for mainnet or custom environments.

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
const client = new ExchangeClient({ accountKey, signerKey });
await client.init(); // don't forget this
```

### `Could not find orders_manager in system config`

The API returned a system config without the expected contract addresses. This usually means the API endpoint is down or changed. Check your `baseUrl`.

### `API /v1/orders/place → 400: ...`

Common causes:
- Signer not registered — call `await client.registerSigner()` first
- Insufficient balance — check with `client.info.getBalance(client.account)`
- Size below minimum — check `market.config.min_order_size`
- Invalid market ID

### Rate limit errors

The SDK handles rate limiting automatically by waiting. If you see `RiseRateLimitError`, you've exhausted the full budget (500 requests in 10 seconds). Back off and retry.

### WebSocket won't connect

The default WS endpoint is `wss://ws.testnet.rise.trade/ws`. Pass a custom URL if needed:

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

Integration tests hit the testnet API:

```bash
RUN_INTEGRATION=true npm test
```

## License

MIT
