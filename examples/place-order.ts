import 'dotenv/config';
import { ExchangeClient, formatWad } from '../src/index.js';

async function main() {
  const client = new ExchangeClient({
    accountKey: process.env.ACCOUNT_PRIVATE_KEY!,
    signerKey: process.env.SIGNER_PRIVATE_KEY!,
    baseUrl: process.env.API_URL,
  });

  console.log('Account:', client.account);
  console.log('Signer:', client.signer);

  // Initialize (fetches EIP-712 domain + contract addresses)
  await client.init();

  // Register signer (idempotent)
  await client.registerSigner();
  console.log('Signer registered');

  // Fetch markets
  const markets = await client.info.getMarkets();
  const market = markets.find((m) => m.visible && m.base_asset_symbol?.includes('ETH'))
    || markets.find((m) => m.visible);
  if (!market) throw new Error('No visible market');

  const marketId = Number(market.market_id);
  const minSize = BigInt(market.config.min_order_size);
  console.log(`\nUsing ${market.display_name} (id=${marketId}), min size=${formatWad(minSize.toString())}`);

  // Check balance
  console.log(`Balance: ${formatWad(await client.info.getBalance(client.account))} USDC`);

  // Place market buy
  console.log('\n--- Market Buy ---');
  const buyResult = await client.marketBuy(marketId, minSize);
  console.log('Order:', buyResult.order_id, 'tx:', buyResult.transaction_hash);

  await new Promise((r) => setTimeout(r, 3000));

  // Check position
  const pos = await client.info.getPosition(marketId, client.account);
  console.log('Position:', pos?.size !== '0' ? `${formatWad(pos!.size)} ${pos!.side === 0 ? 'Long' : 'Short'}` : 'none');

  // Close position
  console.log('\n--- Closing Position ---');
  const closeResult = await client.closePosition(marketId);
  if (closeResult) {
    console.log('Order:', closeResult.order_id, 'tx:', closeResult.transaction_hash);
  } else {
    console.log('No position to close');
  }

  await new Promise((r) => setTimeout(r, 3000));
  console.log('Final balance:', formatWad(await client.info.getBalance(client.account)), 'USDC');
}

main().catch(console.error);
