import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import { WebSocketClient, ExchangeClient, fixSignatureV } from '../../src/index.js';
import type { WsMessage, WsChannel, Eip712Domain } from '../../src/index.js';
import 'dotenv/config';

const RUN = process.env.RUN_INTEGRATION === 'true';

interface SubscribeAck {
  type: 'subscribed';
  channel: string;
  status: 'success' | 'error';
  message?: string;
}

function isSubscribeAck(msg: unknown): msg is SubscribeAck {
  return typeof msg === 'object' && msg !== null && (msg as { type?: unknown }).type === 'subscribed';
}

interface AuthAck {
  method: 'auth';
  status: 'success' | 'error';
  message?: string;
  data?: { account: string; signer: string };
}

function isAuthAck(msg: unknown): msg is AuthAck {
  return typeof msg === 'object' && msg !== null && (msg as { method?: unknown }).method === 'auth';
}

/**
 * Authenticate over WS using the SDK's published constants, signed by the
 * session signer key, then subscribe to a private channel on the same
 * connection. Returns both the auth ack and the subscribe ack.
 *
 * The auth `nonce` is a Unix-seconds timestamp validated within ±60s of server
 * time — NOT the bitmap nonce used for order signing. Auth and the subscribe
 * must share one connection: auth state is bound to the socket.
 */
async function authAndSubscribe(
  channel: WsChannel,
  signer: ethers.Wallet,
  account: string,
  domain: Eip712Domain,
  timeoutMs = 10_000,
): Promise<{ auth: AuthAck; sub: SubscribeAck }> {
  const ws = new WebSocketClient({ wsUrl: process.env.WS_URL });
  await ws.connect();
  try {
    const nonce = Math.floor(Date.now() / 1000);
    const signature = fixSignatureV(
      await signer.signTypedData(
        {
          name: domain.name,
          version: domain.version,
          chainId: domain.chainId,
          verifyingContract: domain.verifyingContract,
        },
        WebSocketClient.AUTH_TYPES,
        { signer: signer.address, message: WebSocketClient.AUTH_MESSAGE, nonce },
      ),
    );

    const authAck = new Promise<AuthAck>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no auth ack within ${timeoutMs}ms`)), timeoutMs);
      ws.on('message', (m: WsMessage) => {
        if (isAuthAck(m)) {
          clearTimeout(timer);
          resolve(m);
        }
      });
    });

    ws.authenticate({
      account,
      signer: signer.address,
      message: WebSocketClient.AUTH_MESSAGE,
      nonce,
      expiration: nonce + 365 * 24 * 60 * 60,
      signature,
    });
    const auth = await authAck;

    const subAck = new Promise<SubscribeAck>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no subscribe ack for ${channel} within ${timeoutMs}ms`)), timeoutMs);
      ws.on('message', (m: WsMessage) => {
        if (isSubscribeAck(m) && m.channel === channel) {
          clearTimeout(timer);
          resolve(m);
        }
      });
    });

    ws.subscribe({ channel });
    return { auth, sub: await subAck };
  } finally {
    ws.disconnect();
  }
}

/** Connect, send a single subscribe, and resolve with the server's ack. */
async function subscribeAndAwaitAck(
  channel: WsChannel | string,
  market_ids?: number[],
  timeoutMs = 8_000,
): Promise<SubscribeAck> {
  const ws = new WebSocketClient({ wsUrl: process.env.WS_URL });
  try {
    await ws.connect();
  } catch (err) {
    ws.disconnect();
    throw err;
  }

  const ack = new Promise<SubscribeAck>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ack for ${channel} within ${timeoutMs}ms`)), timeoutMs);
    ws.on('message', (m: WsMessage) => {
      if (isSubscribeAck(m) && m.channel === channel) {
        clearTimeout(timer);
        resolve(m);
      }
    });
  });

  // Use `as WsChannel` so we can probe channel names that aren't in the union
  // (e.g. to verify they're still rejected).
  ws.subscribe({ channel: channel as WsChannel, market_ids });
  try {
    return await ack;
  } finally {
    ws.disconnect();
  }
}

describe.skipIf(!RUN)('WebSocketClient integration', () => {
  let ws: WebSocketClient | undefined;

  afterEach(() => {
    ws?.disconnect();
    ws = undefined;
  });

  it('connects and receives orderbook data', async () => {
    ws = new WebSocketClient({ wsUrl: process.env.WS_URL });
    const messages: WsMessage[] = [];
    ws.onChannel('orderbook', (msg) => messages.push(msg));
    await ws.connect();
    ws.subscribe({ channel: 'orderbook', market_ids: [1] });

    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (messages.length > 0) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 10_000);
    });

    expect(messages.length).toBeGreaterThan(0);
  }, 15_000);

  // Regression guard: every channel name in WsChannel must be accepted by the
  // server, and the removed `ticker` name must still be rejected. Catches
  // future drift between the SDK type and the server's channel registry —
  // which is the bug that hid the broken `funding` feed for vault clients.
  describe('WsChannel ↔ server channel registry', () => {
    const PUBLIC_CHANNELS: WsChannel[] = ['orderbook', 'trades', 'orders', 'positions', 'oracle', 'funding'];
    const PRIVATE_CHANNELS: WsChannel[] = ['fills', 'account'];

    for (const channel of PUBLIC_CHANNELS) {
      it(`server accepts subscribe to '${channel}'`, async () => {
        const ack = await subscribeAndAwaitAck(channel, [1]);
        expect(ack.status, `server rejected '${channel}': ${ack.message}`).toBe('success');
      }, 12_000);
    }

    for (const channel of PRIVATE_CHANNELS) {
      it(`server rejects unauthenticated subscribe to private '${channel}'`, async () => {
        const ack = await subscribeAndAwaitAck(channel, [1]);
        expect(ack.status).toBe('error');
        expect(ack.message ?? '').toMatch(/authentication required/i);
      }, 12_000);
    }

    it("server still rejects the legacy 'ticker' name", async () => {
      const ack = await subscribeAndAwaitAck('ticker', [1]);
      expect(ack.status).toBe('error');
      expect(ack.message ?? '').toMatch(/invalid channel/i);
    }, 12_000);
  });

  // The flip side of the rejection guard above: with a valid EIP-712 auth the
  // server must accept the private channels. Guards the auth handshake end to
  // end — the EIP-712 Register types, the 'sign in with RISEx' message, and the
  // {method:'auth'} envelope. Requires SIGNER_PRIVATE_KEY + ACCOUNT_ADDRESS and
  // the signer to be a registered, active session key for the account.
  describe('authenticated private channels', () => {
    let signer: ethers.Wallet;
    let account: string;
    let domain: Eip712Domain;

    beforeAll(async () => {
      const ex = new ExchangeClient({
        account: process.env.ACCOUNT_ADDRESS!,
        signerKey: process.env.SIGNER_PRIVATE_KEY!,
        baseUrl: process.env.API_URL,
      });
      await ex.init();
      account = ex.account;
      domain = await ex.info.getEip712Domain();
      signer = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY!);
      // Auth requires the signer to be an active on-chain session key. If this
      // fails, auth would bounce with "session key not active" for an unrelated
      // reason — surface it here instead.
      expect(await ex.isSignerRegistered(), 'signer must be a registered session key').toBe(true);
    }, 30_000);

    for (const channel of ['account', 'fills'] as WsChannel[]) {
      it(`authenticates and subscribes to private '${channel}'`, async () => {
        const { auth, sub } = await authAndSubscribe(channel, signer, account, domain);
        expect(auth.status, `auth bounced: ${auth.message}`).toBe('success');
        expect(sub.status, `subscribe rejected: ${sub.message}`).toBe('success');
      }, 20_000);
    }
  });
});
