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

/**
 * Convert a hex signature string to base64.
 */
function hexToBase64(hex: string): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = Buffer.from(clean, 'hex');
  return bytes.toString('base64');
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

  const accountSignature = fixSignatureV(
    await accountWallet.signTypedData(ethDomain, REGISTER_SIGNER_TYPES, {
      account: accountWallet.address,
      signer: signerWallet.address,
      message,
      expiration,
      nonceAnchor: nonceState.nonce_anchor,
      nonceBitmap: nonceState.current_bitmap_index,
    }),
  );

  const signerSignature = fixSignatureV(
    await signerWallet.signTypedData(ethDomain, VERIFY_SIGNER_TYPES, {
      account: accountWallet.address,
      nonceAnchor: nonceState.nonce_anchor,
      nonceBitmap: nonceState.current_bitmap_index,
    }),
  );

  return {
    accountSignature: hexToBase64(accountSignature),
    signerSignature: hexToBase64(signerSignature),
    nonceAnchor: Number(nonceState.nonce_anchor),
    nonceBitmapIndex: nonceState.current_bitmap_index,
    expiration,
    message,
  };
}
