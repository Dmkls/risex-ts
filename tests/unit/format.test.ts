import { describe, it, expect } from 'vitest';
import { formatWad, parseWad, parseWadString } from '../../src/utils/format.js';

describe('formatWad', () => {
  it('should format 1e18 as "1.0"', () => {
    expect(formatWad('1000000000000000000')).toBe('1.0');
  });

  it('should format 0 as "0.0"', () => {
    expect(formatWad('0')).toBe('0.0');
  });

  it('should return "0" for empty string', () => {
    expect(formatWad('')).toBe('0');
  });

  it('should return value as-is if it already has a decimal', () => {
    expect(formatWad('1.5')).toBe('1.5');
  });

  it('should format large values correctly', () => {
    expect(formatWad('50000000000000000000000')).toBe('50000.0');
  });

  it('should format small values correctly', () => {
    expect(formatWad('1000000000000000')).toBe('0.001');
  });
});

describe('parseWad', () => {
  it('should parse "1" to 1e18', () => {
    expect(parseWad('1')).toBe(BigInt('1000000000000000000'));
  });

  it('should parse "0.001" correctly', () => {
    expect(parseWad('0.001')).toBe(BigInt('1000000000000000'));
  });

  it('should parse "50000" correctly', () => {
    expect(parseWad('50000')).toBe(BigInt('50000000000000000000000'));
  });
});

describe('parseWadString', () => {
  it('should return string representation', () => {
    expect(parseWadString('1')).toBe('1000000000000000000');
  });
});
