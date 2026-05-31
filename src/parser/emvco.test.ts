import { describe, expect, it } from 'vitest';
import { parseQris } from './emvco';

describe('parseQris', () => {
  it('parses valid TLV payload and extracts NMID', () => {
    const payload = '0002010102115904TEST6007JAKARTA61051234562140810ID123456786304ABCD';
    const result = parseQris(payload);

    expect(result.merchantName).toBe('TEST');
    expect(result.city).toBe('JAKARTA');
    expect(result.postalCode).toBe('12345');
    expect(result.nmid).toBe('ID12345678');
  });

  it('throws on malformed QRIS payload', () => {
    expect(() => parseQris('0002010102115904TEST6007JAKARTA610512')).toThrow(
      'Invalid QRIS payload'
    );
  });
});
