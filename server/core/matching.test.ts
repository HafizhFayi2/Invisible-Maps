import { describe, expect, it } from 'vitest';
import { fuzzyMatchScore, haversineMeters } from './matching';

describe('matching utils', () => {
  it('returns high score for similar merchant names', () => {
    const score = fuzzyMatchScore('Warung Nasi Ibu Sari', 'warung nasi ibu sari');
    expect(score).toBeGreaterThan(0.9);
  });

  it('calculates zero distance for same coordinates', () => {
    const distance = haversineMeters({ lat: -6.2, lng: 106.8 }, { lat: -6.2, lng: 106.8 });
    expect(distance).toBeCloseTo(0, 5);
  });
});
