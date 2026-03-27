import { ethers } from 'ethers';
import { REGISTER_SIGNER_TYPES, VERIFY_SIGNER_TYPES, REGISTER_SIGNER_MESSAGE } from './domain.js';
import { DEFAULT_SIGNER_EXPIRY_SECONDS } from '../utils/constants.js';
import type { Eip712Domain } from '../types/config.js';
import type { NonceState } from '../types/auth.js';

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
  nonceAnchor: number;
  nonceBitmapIndex: number;
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
  nonceState: NonceState,
  expirationSeconds?: number,
): Promise<RegisterSignerSignatures> {
  const expiration = Math.floor(Date.now() / 1000) + (expirationSeconds ?? DEFAULT_SIGNER_EXPIRY_SECONDS);
  const message = REGISTER_SIGNER_MESSAGE;

  const ethDomain = {
    name: domain.name,
    version: domain.version,
    chainId: domain.chainId,
    verifyingContract: domain.verifyingContract,
  };

  // Auth operations use anchor+1 with bitmap=0 to guarantee a fresh nonce space
  const authNonceAnchor = Number(nonceState.nonce_anchor) + 1;
  const authNonceBitmap = 0;

  const accountSignature = fixSignatureV(
    await accountWallet.signTypedData(ethDomain, REGISTER_SIGNER_TYPES, {
      account: accountWallet.address,
      signer: signerWallet.address,
      message,
      expiration,
      nonceAnchor: authNonceAnchor,
      nonceBitmap: authNonceBitmap,
    }),
  );

  const signerSignature = fixSignatureV(
    await signerWallet.signTypedData(ethDomain, VERIFY_SIGNER_TYPES, {
      account: accountWallet.address,
      nonceAnchor: authNonceAnchor,
      nonceBitmap: authNonceBitmap,
    }),
  );

  return {
    accountSignature,
    signerSignature,
    nonceAnchor: Number(nonceState.nonce_anchor) + 1,
    nonceBitmapIndex: 0,
    expiration,
    message,
  };
}
