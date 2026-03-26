import 'dotenv/config';
import { ExchangeClient } from '../src/index.js';

async function main() {
  // Default flow: signer was created via RISEx web app
  // Only need account address + signer private key
  const client = new ExchangeClient({
    account: process.env.ACCOUNT_ADDRESS!,
    signerKey: process.env.SIGNER_PRIVATE_KEY!,
    baseUrl: process.env.API_URL,
  });

  console.log('Account:', client.account);
  console.log('Signer:', client.signer);

  // Initialize (fetches EIP-712 domain + contract addresses)
  await client.init();

  // Signer should already be registered via the web app
  console.log('Signer active:', await client.isSignerRegistered());

  // Fetch markets
  const markets = await client.info.getMarkets();
  const market = markets.find((m) => m.visible && m.base_asset_symbol?.includes('ETH'))
    || markets.find((m) => m.visible);
  if (!market) throw new Error('No visible market');

  const marketId = Number(market.market_id);
  const stepSize = parseFloat(market.config.step_size);
  const minSize = parseFloat(market.config.min_order_size);
  const minSteps = Math.max(1, Math.ceil(minSize / stepSize));
  console.log(`\nUsing ${market.display_name} (id=${marketId}), min size=${minSize}, step=${stepSize}, min steps=${minSteps}`);

  // Place market buy
  console.log('\n--- Market Buy ---');
  const buyResult = await client.marketBuy(marketId, minSteps);
  console.log('Order:', buyResult.order_id, 'tx:', buyResult.tx_hash);

  await new Promise((r) => setTimeout(r, 3000));

  // Check position
  const pos = await client.info.getPosition(marketId, client.account);
  console.log('Position:', pos && pos.size !== '0' ? `${pos.size} ${pos.side === 0 ? 'Long' : 'Short'}` : 'none');

  // Close position
  console.log('\n--- Closing Position ---');
  const closeResult = await client.closePosition(marketId);
  if (closeResult) {
    console.log('Order:', closeResult.order_id, 'tx:', closeResult.tx_hash);
  } else {
    console.log('No position to close');
  }

  await new Promise((r) => setTimeout(r, 3000));
  const finalPos = await client.info.getPosition(marketId, client.account);
  console.log('Final position:', finalPos && finalPos.size !== '0' ? finalPos.size : 'closed');
}

main().catch(console.error);
