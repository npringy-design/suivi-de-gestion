import { describe, it, expect } from 'vitest';

import { buildDailyEntries, checkBalance } from '@/utils/buildDailyEntries';
import type { DayTotals } from '@/utils/buildDailyEntries';
import type { AccountingMappingRow } from '@/accountingConfig';

const makeMapping = (caisseKey: string, debitAccount: string, creditAccount: string): AccountingMappingRow => ({
  id: `test-${caisseKey}`,
  active: true,
  category: 'Paiement',
  caisseKey: caisseKey as AccountingMappingRow['caisseKey'],
  caisseItem: caisseKey,
  company: 'Caisse',
  accountingLabel: `Label ${caisseKey}`,
  debitAccount,
  creditAccount,
  rule: '',
  tolerance: '0,01',
  keywords: '',
  notes: '',
});

const BASE_TOTALS: DayTotals = {
  ht55: 100,
  ht10: 200,
  ht20: 50,
  tva55: 5.5,
  tva10: 20,
  tva20: 10,
  totalTtc: 385.5,
  espReel: 0,
  ancvReel: 0,
  amexReel: 0,
  cbReel: 300,
  delivReel: 0,
  uberReel: 0,
  sundayReel: 0,
  crtReel: 0,
  cbTrReel: 0,
  bilanEcart: 0,
  ceReel: 0,
  fondCaisse: 0,
  ecartNegatif: 0,
  ecartPositif: 0,
  pourboires: 0,
  especesRemise: 85.5,
};

describe('buildDailyEntries', () => {
  it('genere une entree debit et une entree credit par mapping actif', () => {
    const mappings = [makeMapping('ht55', '701000', '511000')];
    const entries = buildDailyEntries('2026-01-15', BASE_TOTALS, mappings, 1, 2026);
    expect(entries).toHaveLength(2);
    expect(entries[0].debit).toBe(100);
    expect(entries[0].credit).toBeNull();
    expect(entries[1].credit).toBe(100);
    expect(entries[1].debit).toBeNull();
  });

  it('ignore les mappings inactifs', () => {
    const mappings: AccountingMappingRow[] = [{
      id: 'test-inactive',
      active: false,
      category: 'Paiement',
      caisseKey: 'ht55',
      caisseItem: 'ht55',
      company: 'Caisse',
      accountingLabel: 'HT 5.5',
      debitAccount: '701000',
      creditAccount: '511000',
      rule: '',
      tolerance: '0,01',
      keywords: '',
      notes: '',
    }];
    const entries = buildDailyEntries('2026-01-15', BASE_TOTALS, mappings, 1, 2026);
    expect(entries).toHaveLength(0);
  });

  it('genere seulement debit si creditAccount est vide', () => {
    const mappings = [makeMapping('ht10', '701100', '')];
    const entries = buildDailyEntries('2026-01-15', BASE_TOTALS, mappings, 1, 2026);
    expect(entries).toHaveLength(1);
    expect(entries[0].debit).toBe(200);
  });

  it('utilise le label specifique MANGO PAY pour ceReel', () => {
    const totals = { ...BASE_TOTALS, ceReel: 50 };
    const mappings = [makeMapping('ceReel', '512000', '411000')];
    const entries = buildDailyEntries('2026-01-15', totals, mappings, 1, 2026);
    expect(entries[0].label).toBe('CA12026 MANGO PAY');
  });

  it('arrondit les montants a 2 decimales', () => {
    const totals = { ...BASE_TOTALS, ht55: 100.005 };
    const mappings = [makeMapping('ht55', '701000', '511000')];
    const entries = buildDailyEntries('2026-01-15', totals, mappings, 1, 2026);
    expect(entries[0].debit).toBe(100.01);
  });

  it('traite une valeur 0 comme 0 et non comme absente', () => {
    const totals = { ...BASE_TOTALS, cbReel: 0 };
    const mappings = [makeMapping('cbReel', '512000', '411000')];
    const entries = buildDailyEntries('2026-01-15', totals, mappings, 1, 2026);
    expect(entries).toHaveLength(2);
    expect(entries[0].debit).toBe(0);
  });
});

describe('checkBalance', () => {
  it('est equilibre quand debit === credit', () => {
    const entries = [
      { date: '2026-01-15', journal: 'CA', account: '701000', label: 'HT', debit: 100, credit: null, caisseKey: 'ht55' as const },
      { date: '2026-01-15', journal: 'CA', account: '511000', label: 'HT', debit: null, credit: 100, caisseKey: 'ht55' as const },
    ];
    const result = checkBalance(entries);
    expect(result.isBalanced).toBe(true);
    expect(result.ecart).toBe(0);
  });

  it('detecte un desequilibre superieur a 0.05', () => {
    const entries = [
      { date: '2026-01-15', journal: 'CA', account: '701000', label: 'HT', debit: 100, credit: null, caisseKey: 'ht55' as const },
      { date: '2026-01-15', journal: 'CA', account: '511000', label: 'HT', debit: null, credit: 99.90, caisseKey: 'ht55' as const },
    ];
    const result = checkBalance(entries);
    expect(result.isBalanced).toBe(false);
    expect(result.ecart).toBeCloseTo(0.10, 2);
  });

  it('accepte un ecart inferieur a 0.05 (tolerance arrondi)', () => {
    const entries = [
      { date: '2026-01-15', journal: 'CA', account: '701000', label: 'HT', debit: 100, credit: null, caisseKey: 'ht55' as const },
      { date: '2026-01-15', journal: 'CA', account: '511000', label: 'HT', debit: null, credit: 99.97, caisseKey: 'ht55' as const },
    ];
    const result = checkBalance(entries);
    expect(result.isBalanced).toBe(true);
  });

  it('retourne totalDebit et totalCredit corrects', () => {
    const entries = [
      { date: '2026-01-15', journal: 'CA', account: '701000', label: 'HT', debit: 50, credit: null, caisseKey: 'ht55' as const },
      { date: '2026-01-15', journal: 'CA', account: '702000', label: 'HT', debit: 30, credit: null, caisseKey: 'ht10' as const },
      { date: '2026-01-15', journal: 'CA', account: '511000', label: 'HT', debit: null, credit: 80, caisseKey: 'ht55' as const },
    ];
    const result = checkBalance(entries);
    expect(result.totalDebit).toBe(80);
    expect(result.totalCredit).toBe(80);
  });
});
