import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';
import { createPermitParams } from '../../src/signing/permit.js';
import type { Eip712Domain } from '../../src/types/config.js';

const TEST_WALLET = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
const TEST_ACCOUNT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TEST_TARGET = '0x0000000000000000000000000000000000000001';
const TEST_HASH = ethers.keccak256(ethers.toUtf8Bytes('test'));
const TEST_DOMAIN: Eip712Domain = {
  name: 'Test',
  version: '1',
  chainId: 1n,
  verifyingContract: '0x0000000000000000000000000000000000000001',
};

describe('createPermitParams', () => {
  it('should use anchor and bitmap from nonce state', async () => {
    const permit = await createPermitParams(
      TEST_HASH, TEST_WALLET, TEST_ACCOUNT, TEST_TARGET, TEST_DOMAIN,
      { nonce_anchor: '5', current_bitmap_index: 42 },
    );
    expect(permit.nonce_anchor).toBe(5);
    expect(permit.nonce_bitmap_index).toBe(42);
  });

  it('should advance anchor when bitmap index exceeds 255', async () => {
    const permit = await createPermitParams(
      TEST_HASH, TEST_WALLET, TEST_ACCOUNT, TEST_TARGET, TEST_DOMAIN,
      { nonce_anchor: '10', current_bitmap_index: 256 },
    );
    expect(permit.nonce_anchor).toBe(11);
    expect(permit.nonce_bitmap_index).toBe(0);
  });

  it('should advance anchor at 208 if API reports that value as exhausted', async () => {
    // The API may report values > 255 when all usable slots are consumed.
    // Values 0-255 are valid; anything above triggers advancement.
    const permit = await createPermitParams(
      TEST_HASH, TEST_WALLET, TEST_ACCOUNT, TEST_TARGET, TEST_DOMAIN,
      { nonce_anchor: '10', current_bitmap_index: 999 },
    );
    expect(permit.nonce_anchor).toBe(11);
    expect(permit.nonce_bitmap_index).toBe(0);
  });

  it('should NOT advance anchor at max valid index 255', async () => {
    const permit = await createPermitParams(
      TEST_HASH, TEST_WALLET, TEST_ACCOUNT, TEST_TARGET, TEST_DOMAIN,
      { nonce_anchor: '10', current_bitmap_index: 255 },
    );
    expect(permit.nonce_anchor).toBe(10);
    expect(permit.nonce_bitmap_index).toBe(255);
  });
});
