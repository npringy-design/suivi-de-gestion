import type { AccountingCaisseKey, AccountingMappingRow } from '@/accountingConfig';

export type DayTotals = Record<Exclude<AccountingCaisseKey, ''>, number>;

export type AccountingEntry = {
  date: string;
  journal: string;
  account: string;
  label: string;
  debit: number | null;
  credit: number | null;
  caisseKey: AccountingCaisseKey;
};

export type BalanceCheck = {
  totalDebit: number;
  totalCredit: number;
  ecart: number;
  isBalanced: boolean;
};

const ORDERED_KEYS: AccountingCaisseKey[] = [
  'ht55',
  'ht10',
  'ht20',
  'tva55',
  'tva10',
  'tva20',
  'totalTtc',
  'ancvReel',
  'amexReel',
  'cbReel',
  'delivReel',
  'uberReel',
  'sundayReel',
  'crtReel',
  'cbTrReel',
  'ceReel',
  'fondCaisse',
  'ecartNegatif',
  'ecartPositif',
  'pourboires',
  'especesRemise',
];

const roundMoney = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

export const buildDailyEntries = (
  date: string,
  totals: DayTotals,
  mappings: AccountingMappingRow[],
  monthNumber: number,
  year: number,
): AccountingEntry[] => {
  const entries: AccountingEntry[] = [];

  ORDERED_KEYS.forEach(key => {
    if (!key) return;
    const mapping = mappings.find(item => item.active && item.caisseKey === key);
    if (!mapping) return;

    const value = roundMoney(totals[key] || 0);
    const label = key === 'ceReel' ? `CA${monthNumber}${year} MANGO PAY` : mapping.accountingLabel;
    const debitAccount = mapping.debitAccount.trim();
    const creditAccount = mapping.creditAccount.trim();

    if (debitAccount) {
      entries.push({ date, journal: 'CA', account: debitAccount, label, debit: value, credit: null, caisseKey: key });
    }

    if (creditAccount) {
      entries.push({ date, journal: 'CA', account: creditAccount, label, debit: null, credit: value, caisseKey: key });
    }
  });

  return entries;
};

export const checkBalance = (entries: AccountingEntry[]): BalanceCheck => {
  const totalDebit = roundMoney(entries.reduce((sum, entry) => sum + (entry.debit || 0), 0));
  const totalCredit = roundMoney(entries.reduce((sum, entry) => sum + (entry.credit || 0), 0));
  const ecart = roundMoney(Math.abs(totalDebit - totalCredit));
  return {
    totalDebit,
    totalCredit,
    ecart,
    isBalanced: ecart < 0.05,
  };
};
