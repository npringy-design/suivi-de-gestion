import { describe, it, expect } from 'vitest';

import type { DayDataTheorique, MonthData } from '../contexts/DataContext';

describe('DataContext Types', () => {
  describe('DayDataTheorique', () => {
    it('should have required fields', () => {
      const dayData: DayDataTheorique = {
        total_ca: '100',
        cb: '50',
        amex: '30',
        tr_papier: '10',
        tr_carte: '5',
        ancv: '3',
        especes: '2',
        click_collect: '0',
        uber: '0',
        deliveroo: '0',
        sunday: '0',
        commentaire: '',
      };
      expect(dayData.total_ca).toBe('100');
      expect(dayData.cb).toBe('50');
      expect(dayData.amex).toBe('30');
    });
  });

  describe('Numeric conversion', () => {
    it('should parse numeric strings correctly', () => {
      const parseNum = (v: string | number) => {
        if (typeof v === 'number') return v;
        return parseFloat((v || '0').toString().replace(',', '.')) || 0;
      };

      expect(parseNum('100.50')).toBe(100.50);
      expect(parseNum('100,50')).toBe(100.50);
      expect(parseNum('100')).toBe(100);
      expect(parseNum('')).toBe(0);
      expect(parseNum(100)).toBe(100);
    });
  });

  describe('Currency formatting', () => {
    it('should format currency correctly', () => {
      const fe = (v: number) => 
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

      expect(fe(100)).toContain('100');
      expect(fe(1000)).toContain('1');
      expect(fe(0)).toContain('0');
    });
  });
});
