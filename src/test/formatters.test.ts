import { describe, it, expect } from 'vitest';

import { formatEuro, formatPercent } from '@/lib/formatters';

describe('formatEuro', () => {
  it('retourne "0" pour la valeur 0', () => {
    expect(formatEuro(0)).toBe('0');
  });

  it('formate un entier positif sans decimales', () => {
    expect(formatEuro(1000)).toBe('1 000');
  });

  it('arrondit sans decimales', () => {
    expect(formatEuro(1234.9)).toBe('1 235');
  });

  it('formate un nombre negatif', () => {
    expect(formatEuro(-500)).toBe('-500');
  });

  it('formate un grand nombre avec separateur de milliers', () => {
    const result = formatEuro(123456);
    expect(result).toContain('123');
    expect(result).toContain('456');
  });
});

describe('formatPercent', () => {
  it('formate un pourcentage avec deux decimales', () => {
    expect(formatPercent(12.5)).toBe('12.50%');
  });

  it('formate 0 en "0.00%"', () => {
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('retourne une chaine vide pour Infinity', () => {
    expect(formatPercent(Infinity)).toBe('');
  });

  it('retourne une chaine vide pour NaN', () => {
    expect(formatPercent(NaN)).toBe('');
  });

  it('formate un pourcentage negatif', () => {
    expect(formatPercent(-3.14)).toBe('-3.14%');
  });
});
