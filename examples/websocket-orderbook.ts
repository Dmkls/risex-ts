import 'dotenv/config';
import { WebSocketClient } from '../src/index.js';
import type { WsMessage } from '../src/index.js';

async function main() {
  const ws = new WebSocketClient({
    wsUrl: process.env.WS_URL,
    logLevel: 'info',
  });

  ws.on('open', () => console.log('Connected'));
  ws.on('close', () => console.log('Disconnected'));
  ws.on('error', (err) => console.error('Error:', err));

  // Subscribe to orderbook for market 0 (BTC)
  ws.onChannel('orderbook', (msg: WsMessage) => {
    const data = msg.data as { bids?: Array<[string, string]>; asks?: Array<[string, string]> };
    const topBid = data.bids?.[0];
    const topAsk = data.asks?.[0];
    console.log(
      `Orderbook | Bid: ${topBid ? `${topBid[0]} x ${topBid[1]}` : '-'} | Ask: ${topAsk ? `${topAsk[0]} x ${topAsk[1]}` : '-'}`,
    );
  });

  await ws.connect();
  ws.subscribe({ channel: 'orderbook', market_id: 0 });
  ws.subscribe({ channel: 'trades', market_id: 0 });

  ws.onChannel('trades', (msg: WsMessage) => {
    const data = msg.data as { price?: string; size?: string; side?: number };
    console.log(`Trade | ${data.side === 0 ? 'BUY' : 'SELL'} ${data.size} @ ${data.price}`);
  });

  // Run for 30 seconds
  setTimeout(() => {
    ws.disconnect();
    console.log('Done');
  }, 30_000);
}

main().catch(console.error);
