import 'dotenv/config';
import { WebSocketClient, formatWad } from '../src/index.js';
import type { WsMessage } from '../src/index.js';

async function main() {
  const ws = new WebSocketClient({
    wsUrl: process.env.WS_URL,
    logLevel: 'info',
  });

  ws.on('open', () => console.log('Connected'));
  ws.on('close', () => console.log('Disconnected'));
  ws.on('error', (err) => console.error('Error:', err));

  // Subscribe to orderbook for BTC (market_id=1)
  ws.onChannel('orderbook', (msg: WsMessage) => {
    const data = msg.data as {
      bids?: Array<{ price: string; quantity: string }>;
      asks?: Array<{ price: string; quantity: string }>;
    };
    const topBid = data.bids?.[0];
    const topAsk = data.asks?.[0];
    console.log(
      `Orderbook | Bid: ${topBid ? `${formatWad(topBid.price)} x ${formatWad(topBid.quantity)}` : '-'} | Ask: ${topAsk ? `${formatWad(topAsk.price)} x ${formatWad(topAsk.quantity)}` : '-'}`,
    );
  });

  ws.onChannel('trades', (msg: WsMessage) => {
    const data = msg.data as { price?: string; size?: string; maker_side?: number };
    console.log(`Trade | ${data.maker_side === 0 ? 'BUY' : 'SELL'} ${data.size} @ ${data.price}`);
  });

  await ws.connect();
  ws.subscribe({ channel: 'orderbook', market_ids: [1] });
  ws.subscribe({ channel: 'trades', market_ids: [1] });

  // Run for 30 seconds
  setTimeout(() => {
    ws.disconnect();
    console.log('Done');
  }, 30_000);
}

main().catch(console.error);
