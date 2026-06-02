import 'dotenv/config';
import { ethers } from 'ethers';
import { WebSocketClient, ExchangeClient, InfoClient } from '../src/index.js';
import type { WsMessage } from '../src/index.js';
import { fixSignatureV } from '../src/signing/signer.js';

const SIGNER_KEY = process.env.SIGNER_PRIVATE_KEY!;
const BASE_URL = 'https://api.testnet.rise.trade';
const WS_URL = 'wss://ws.testnet.rise.trade/ws';

async function main() {
  const wallet = new ethers.Wallet(SIGNER_KEY);
  const account = wallet.address;
  console.log(`Account/Signer: ${account}\n`);

  // Ensure signer is registered
  const exchange = new ExchangeClient({
    baseUrl: BASE_URL,
    accountKey: SIGNER_KEY,
    signerKey: SIGNER_KEY,
  });
  await exchange.init();
  if (!(await exchange.isSignerRegistered())) {
    console.log('Registering signer...');
    await exchange.registerSigner();
  }
  console.log('Signer registered\n');

  // Fetch EIP-712 domain
  const info = new InfoClient({ baseUrl: BASE_URL });
  const domain = await info.getEip712Domain();
  const ethDomain = {
    name: domain.name,
    version: domain.version,
    chainId: domain.chainId,
    verifyingContract: domain.verifyingContract,
  };
  console.log('Domain:', ethDomain);

  // Connect WS
  const ws = new WebSocketClient({ wsUrl: WS_URL, logLevel: 'warn' });

  ws.on('open', () => console.log('\nWS Connected'));
  ws.on('close', () => console.log('WS Disconnected'));
  ws.on('error', (err) => console.error('WS Error:', err));
  ws.on('message', (msg: WsMessage) => {
    console.log(JSON.stringify(msg, null, 2));
  });

  await ws.connect();

  // Sign EIP-712 Register { signer, message, nonce }
  const nonce = Math.floor(Date.now() / 1000);
  const expiration = nonce + 365 * 24 * 60 * 60;
  const message = WebSocketClient.AUTH_MESSAGE;

  const signature = fixSignatureV(
    await wallet.signTypedData(ethDomain, WebSocketClient.AUTH_TYPES, {
      signer: account,
      message,
      nonce,
    }),
  );

  console.log(`\nAuth: nonce=${nonce}, message="${message}"`);
  ws.authenticate({ account, signer: account, message, nonce, expiration, signature });

  // Wait for auth ack, then subscribe to private channels. The server
  // auto-fills `makers` with the authenticated account for private channels,
  // so we don't need to send it. `fills` has no snapshot — it stays silent
  // until a fill actually happens.
  setTimeout(() => {
    console.log('\nSubscribing to fills...');
    ws.subscribe({ channel: 'fills' });

    console.log('Subscribing to orders...');
    ws.subscribe({ channel: 'orders', market_ids: [1] });

    console.log('Subscribing to positions...\n');
    ws.subscribe({ channel: 'positions', market_ids: [1] });
  }, 2000);

  setTimeout(() => {
    ws.disconnect();
    console.log('Done');
  }, 15_000);
}

main().catch(console.error);
