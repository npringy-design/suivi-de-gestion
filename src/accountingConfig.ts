export type AccountingCategory = 'Chiffre d’affaires' | 'TVA' | 'Paiement' | 'Écart' | 'Ajustement';

export type AccountingCaisseKey = '' | 'ht55' | 'ht10' | 'ht20' | 'tva55' | 'tva10' | 'tva20' | 'totalTtc' | 'espReel' | 'cbReel' | 'amexReel' | 'crtReel' | 'cbTrReel' | 'ancvReel' | 'delivReel' | 'uberReel' | 'sundayReel' | 'ceReel' | 'pourboires' | 'bilanEcart' | 'ecartNegatif' | 'ecartPositif' | 'fondCaisse' | 'especesRemise';

export type AccountingMappingRow = {
  id: string;
  active: boolean;
  category: AccountingCategory;
  caisseKey: AccountingCaisseKey;
  caisseItem: string;
  company: string;
  debitAccount: string;
  creditAccount: string;
  accountingLabel: string;
  rule: string;
  tolerance: string;
  keywords: string;
  notes: string;
};

export const ACCOUNTING_STORAGE_KEY = 'parametrage_comptable_v1';

export const ACCOUNTING_CATEGORIES: AccountingCategory[] = ['Chiffre d’affaires', 'TVA', 'Paiement', 'Écart', 'Ajustement'];

export const CAISSE_KEY_OPTIONS: Array<{ value: AccountingCaisseKey; label: string }> = [
  { value: '', label: 'Non lié' },
  { value: 'ht55', label: 'HT 5,5 %' },
  { value: 'ht10', label: 'HT 10 %' },
  { value: 'ht20', label: 'HT 20 %' },
  { value: 'tva55', label: 'TVA 5,5 %' },
  { value: 'tva10', label: 'TVA 10 %' },
  { value: 'tva20', label: 'TVA 20 %' },
  { value: 'totalTtc', label: 'Total TTC' },
  { value: 'espReel', label: 'Espèces réel' },
  { value: 'cbReel', label: 'CB réel' },
  { value: 'amexReel', label: 'AMEX réel' },
  { value: 'crtReel', label: 'CRT papier réel' },
  { value: 'cbTrReel', label: 'TR carte réel' },
  { value: 'ancvReel', label: 'ANCV réel' },
  { value: 'delivReel', label: 'Deliveroo réel' },
  { value: 'uberReel', label: 'Uber réel' },
  { value: 'sundayReel', label: 'Sunday réel' },
  { value: 'ceReel', label: 'Click / Mango réel' },
  { value: 'pourboires', label: 'Pourboires' },
  { value: 'bilanEcart', label: 'Écart brut' },
  { value: 'ecartNegatif', label: 'Écart négatif' },
  { value: 'ecartPositif', label: 'Écart positif' },
  { value: 'fondCaisse', label: 'Fond caisse / 580000' },
  { value: 'especesRemise', label: 'Remise espèces' },
];

export const isAccountingCaisseKey = (value: string): value is AccountingCaisseKey => {
  return CAISSE_KEY_OPTIONS.some(option => option.value === value);
};
