import 'dotenv/config';
import { InfoClient } from '../src/index.js';

async function main() {
  const client = new InfoClient({
    baseUrl: process.env.API_URL,
  });

  // Fetch markets
  const markets = await client.getMarkets();
  console.log(`=== ${markets.length} Markets ===`);
  for (const m of markets.slice(0, 10)) {
    console.log(`  ${m.market_id}: ${m.display_name}  last=${m.last_price}  mark=${m.mark_price}`);
  }

  // Orderbook for first visible market
  const market = markets.find((m) => m.visible);
  if (market) {
    const book = await client.getOrderbook(Number(market.market_id));
    console.log(`\n=== Orderbook: ${market.display_name} ===`);
    console.log('Bids:', (book.bids || []).slice(0, 3).map((b) => `${b.price} x ${b.quantity}`).join('  '));
    console.log('Asks:', (book.asks || []).slice(0, 3).map((a) => `${a.price} x ${a.quantity}`).join('  '));
  }

  // Nonce state
  const account = process.env.ACCOUNT_ADDRESS ?? '0x39f810de204C07eD6294562Df3c40696644fa5bf';
  const nonce = await client.getNonceState(account);
  console.log(`\nNonce state: anchor=${nonce.nonce_anchor}, index=${nonce.current_bitmap_index}`);
}

main().catch(console.error);
