import 'dotenv/config';
import { ExchangeClient } from '../src/index.js';

/**
 * ERC-1271 Smart Contract Wallet Order Example
 *
 * Prerequisites:
 * 1. Your contract wallet implements IERC1271 (isValidSignature)
 * 2. The signing EOA is registered as a signer for the contract wallet
 *    (via POST /v1/auth/register-signer, same as regular flow)
 * 3. The contract wallet recognizes the signer as authorized
 */
async function main() {
  // ACCOUNT_ADDRESS is the smart contract wallet address
  // SIGNER_PRIVATE_KEY is the EOA authorized by the contract wallet
  const client = new ExchangeClient({
    account: process.env.ACCOUNT_ADDRESS!,
    signerKey: process.env.SIGNER_PRIVATE_KEY!,
    baseUrl: process.env.API_URL,
    erc1271: true,
  });

  console.log('Contract wallet:', client.account);
  console.log('Signer EOA:', client.signer);

  await client.init();

  console.log('ERC-1271 mode — skipping signer registration check');

  // Fetch markets
  const markets = await client.info.getMarkets();
  const market = markets.find((m) => m.visible);
  if (!market) throw new Error('No visible market');

  const marketId = Number(market.market_id);
  const stepSize = parseFloat(market.config.step_size);
  const minSize = parseFloat(market.config.min_order_size);
  const minSteps = Math.max(1, Math.ceil(minSize / stepSize));
  console.log(`\nUsing ${market.display_name} (id=${marketId}), min steps=${minSteps}`);

  // Place market buy
  console.log('\n--- Market Buy (ERC-1271) ---');
  const buyResult = await client.marketBuy(marketId, minSteps);
  console.log('Order:', buyResult.order_id, 'tx:', buyResult.tx_hash);

  await new Promise((r) => setTimeout(r, 3000));

  // Check position
  const pos = await client.info.getPosition(marketId, client.account);
  console.log('Position:', pos && pos.size !== '0' ? `${pos.size} ${pos.side === 0 ? 'Long' : 'Short'}` : 'none');

  // Close position
  console.log('\n--- Closing Position (ERC-1271) ---');
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
