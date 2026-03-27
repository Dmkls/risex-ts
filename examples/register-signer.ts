import 'dotenv/config';
import { ExchangeClient } from '../src/index.js';

async function main() {
  const client = new ExchangeClient({
    accountKey: process.env.ACCOUNT_PRIVATE_KEY!,
    signerKey: process.env.SIGNER_PRIVATE_KEY!,
    baseUrl: process.env.API_URL,
  });

  console.log('Account:', client.account);
  console.log('Signer:', client.signer);

  await client.init();

  const result = await client.registerSigner();
  console.log('Result:', result);
  console.log('Active:', await client.isSignerRegistered());
}

main().catch(console.error);
