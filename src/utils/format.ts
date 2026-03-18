import { ethers } from 'ethers';
import { WAD_DECIMALS } from './constants.js';

/**
 * Format a wad string (18-decimal integer string) into a human-readable decimal.
 */
export function formatWad(value: string): string {
  if (!value) return '0';
  if (value.includes('.')) return value;
  try {
    return ethers.formatUnits(value, WAD_DECIMALS);
  } catch {
    return value;
  }
}

/**
 * Parse a human-readable decimal string into a wad bigint (18 decimals).
 */
export function parseWad(value: string): bigint {
  return ethers.parseUnits(value, WAD_DECIMALS);
}

/**
 * Parse a human-readable decimal string into a wad string (18 decimals).
 */
export function parseWadString(value: string): string {
  return ethers.parseUnits(value, WAD_DECIMALS).toString();
}
