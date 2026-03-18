import { ethers } from 'ethers';
import { REGISTER_SIGNER_TYPES, VERIFY_SIGNER_TYPES, REGISTER_SIGNER_MESSAGE } from './domain.js';
import { createNonce } from './nonce.js';
import { DEFAULT_SIGNER_EXPIRY_SECONDS } from '../utils/constants.js';
import type { Eip712Domain } from '../types/config.js';

/**
 * Fix EIP-712 signature V value.
 * Some signers produce v=0/1 instead of v=27/28.
 */
export function fixSignatureV(sig: string): string {
  const bytes = ethers.getBytes(sig);
  if (bytes.length === 65 && bytes[64] < 27) bytes[64] += 27;
  return ethers.hexlify(bytes);
}

export interface RegisterSignerSignatures {
  accountSignature: string;
  signerSignature: string;
  nonce: string;
  expiration: number;
  message: string;
}

/**
 * Create both signatures needed to register a signer.
 */
export async function createRegisterSignerSignatures(
  accountWallet: ethers.Wallet,
  signerWallet: ethers.Wallet,
  domain: Eip712Domain,
  expirationSeconds?: number,
): Promise<RegisterSignerSignatures> {
  const nonce = createNonce(accountWallet.address);
  const expiration = Math.floor(Date.now() / 1000) + (expirationSeconds ?? DEFAULT_SIGNER_EXPIRY_SECONDS);
  const message = REGISTER_SIGNER_MESSAGE;

  const ethDomain = {
    name: domain.name,
    version: domain.version,
    chainId: domain.chainId,
    verifyingContract: domain.verifyingContract,
  };

  const accountSignature = fixSignatureV(
    await accountWallet.signTypedData(ethDomain, REGISTER_SIGNER_TYPES, {
      signer: signerWallet.address,
      message,
      expiration,
      nonce,
    }),
  );

  const signerSignature = fixSignatureV(
    await signerWallet.signTypedData(ethDomain, VERIFY_SIGNER_TYPES, {
      account: accountWallet.address,
      nonce,
    }),
  );

  return { accountSignature, signerSignature, nonce, expiration, message };
}
