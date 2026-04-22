import type { ethers } from 'ethers';

export const REGISTER_SIGNER_TYPES: Record<string, ethers.TypedDataField[]> = {
  RegisterSigner: [
    { name: 'account', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'message', type: 'string' },
    { name: 'expiration', type: 'uint32' },
    { name: 'nonceAnchor', type: 'uint48' },
    { name: 'nonceBitmap', type: 'uint8' },
  ],
};

export const VERIFY_SIGNER_TYPES: Record<string, ethers.TypedDataField[]> = {
  VerifySigner: [
    { name: 'account', type: 'address' },
    { name: 'nonceAnchor', type: 'uint48' },
    { name: 'nonceBitmap', type: 'uint8' },
  ],
};

export const REVOKE_SIGNER_TYPES: Record<string, ethers.TypedDataField[]> = {
  RevokeSigner: [
    { name: 'account', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'nonceAnchor', type: 'uint48' },
    { name: 'nonceBitmap', type: 'uint8' },
  ],
};

export const VERIFY_WITNESS_TYPES: Record<string, ethers.TypedDataField[]> = {
  VerifyWitness: [
    { name: 'account', type: 'address' },
    { name: 'target', type: 'address' },
    { name: 'hash', type: 'bytes32' },
    { name: 'nonceAnchor', type: 'uint48' },
    { name: 'nonceBitmap', type: 'uint8' },
    { name: 'deadline', type: 'uint32' },
  ],
};

export const REGISTER_SIGNER_MESSAGE = 'Registering signer for RISEx';
