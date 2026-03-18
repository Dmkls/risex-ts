import type { ethers } from 'ethers';

export const REGISTER_SIGNER_TYPES: Record<string, ethers.TypedDataField[]> = {
  RegisterSigner: [
    { name: 'signer', type: 'address' },
    { name: 'message', type: 'string' },
    { name: 'expiration', type: 'uint40' },
    { name: 'nonce', type: 'uint256' },
  ],
};

export const VERIFY_SIGNER_TYPES: Record<string, ethers.TypedDataField[]> = {
  VerifySigner: [
    { name: 'account', type: 'address' },
    { name: 'nonce', type: 'uint256' },
  ],
};

export const VERIFY_SIGNATURE_TYPES: Record<string, ethers.TypedDataField[]> = {
  VerifySignature: [
    { name: 'account', type: 'address' },
    { name: 'target', type: 'address' },
    { name: 'hash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

export const REGISTER_SIGNER_MESSAGE = 'RISEx Signer Registration';
