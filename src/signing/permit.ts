import { ethers } from 'ethers';
import { VERIFY_SIGNATURE_TYPES } from './domain.js';
import { createNonce } from './nonce.js';
import { fixSignatureV } from './signer.js';
import type { PermitParams } from '../types/auth.js';
import type { Eip712Domain } from '../types/config.js';

/**
 * Create permit params by signing the hash of encoded contract data.
 */
export async function createPermitParams(
  encodedData: Uint8Array,
  signerWallet: ethers.Wallet,
  account: string,
  target: string,
  domain: Eip712Domain,
  deadlineSeconds?: number,
): Promise<PermitParams> {
  const hash = ethers.keccak256(encodedData);
  const nonce = createNonce(account);
  const deadline = Math.floor(Date.now() / 1000) + (deadlineSeconds ?? 300);

  const ethDomain = {
    name: domain.name,
    version: domain.version,
    chainId: domain.chainId,
    verifyingContract: domain.verifyingContract,
  };

  const signature = fixSignatureV(
    await signerWallet.signTypedData(ethDomain, VERIFY_SIGNATURE_TYPES, {
      account,
      target,
      hash,
      nonce,
      deadline,
    }),
  );

  return {
    account,
    signer: signerWallet.address,
    nonce,
    deadline: String(deadline),
    signature,
  };
}
