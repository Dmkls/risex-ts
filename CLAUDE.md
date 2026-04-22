# CLAUDE.md

## Project

risex-ts — TypeScript SDK for RISEx, a fully onchain CLOB perpetuals DEX on RISE Chain (Ethereum L2).

## Commands

```bash
npm test                # unit tests (vitest)
npm run test:integration # integration tests against testnet (needs .env)
npm run lint            # type-check (tsc --noEmit)
npm run build           # dual ESM/CJS build (tsup)
```

## Architecture

- `src/clients/InfoClient.ts` — public read-only REST (markets, orderbook, balances, positions)
- `src/clients/ExchangeClient.ts` — authenticated trading (orders, signer registration, leverage). Holds `InfoClient` as `this.info`. Requires `init()` before use.
- `src/clients/WebSocketClient.ts` — WS with auto-reconnect, heartbeat, channel subscriptions
- `src/signing/` — EIP-712 domain types, 47-byte order encoding, nonce generation, permit signing, signer registration
- `src/core/` — HttpClient (fetch wrapper + rate limiter), Logger, RateLimiter
- `src/types/` — all TypeScript interfaces and enums
- `src/utils/` — constants, errors, wad format helpers

## Key patterns

- ethers v6 for all signing/encoding (not viem)
- Native fetch (Node 18+), no axios
- Prices use `price_ticks` (uint24), sizes use `size_steps` (uint32) — not WAD
- Bitmap nonces: `nonce_anchor` + `nonce_bitmap_index` (fetched via `/v1/nonce-state/{account}`)
- EIP-712 trading permit type is `VerifyWitness` (not `VerifySignature`)
- Order data is 88-bit compressed with action type hashes
- `permit_params` renamed to `permit` in all API requests
- `target` in VerifyWitness is the `router` address (from system config)
- Signature V values are fixed to 27/28 via `fixSignatureV`
- Contract addresses and EIP-712 domain are fetched at runtime via `init()`

## API base

- Testnet: `https://api.testnet.rise.trade`
- System config: `GET /v1/system/config` (has contract addresses)
- EIP-712 domain: `GET /v1/auth/eip712-domain`
- Nonce state: `GET /v1/nonce-state/{account}`

## Git

- Remote uses SSH host alias `github-risex` (deploy key at `~/.ssh/risex_deploy_key`)
- Branch protection on main — use PRs
