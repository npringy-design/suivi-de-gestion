export type AccountingCategory = 'Chiffre d’affaires' | 'TVA' | 'Paiement' | 'Écart' | 'Ajustement';

export type AccountingCaisseKey = '' | 'ht55' | 'ht10' | 'ht20' | 'tva55' | 'tva10' | 'tva20' | 'totalTtc' | 'espReel' | 'cbReel' | 'amexReel' | 'crtReel' | 'cbTrReel' | 'ancvReel' | 'delivReel' | 'uberReel' | 'sundayReel' | 'ceReel' | 'pourboires' | 'bilanEcart' | 'ecartNegatif' | 'ecartPositif' | 'fondCaisse' | 'especesRemise';

export type AccountingMappingRow = { id: string; active: boolean; category: AccountingCategory; caisseKey: AccountingCaisseKey; caisseItem: string; company: string; debitAccount: string; creditAccount: string; accountingLabel: string; rule: string; tolerance: string; keywords: string; notes: string; };

export const ACCOUNTING_STORAGE_KEY = 'parametrage_comptable_v1';
export const ACCOUNTING_CATEGORIES: AccountingCategory[] = ['Chiffre d’affaires', 'TVA', 'Paiement', 'Écart', 'Ajustement'];
export const CAISSE_KEY_OPTIONS: Array<{ value: AccountingCaisseKey; label: string }> = [
  { value: '', label: 'Non lié' }, { value: 'ht55', label: 'HT 5,5 %' }, { value: 'ht10', label: 'HT 10 %' }, { value: 'ht20', label: 'HT 20 %' },
  { value: 'tva55', label: 'TVA 5,5 %' }, { value: 'tva10', label: 'TVA 10 %' }, { value: 'tva20', label: 'TVA 20 %' }, { value: 'totalTtc', label: 'Total TTC' },
  { value: 'espReel', label: 'Espèces réel' }, { value: 'cbReel', label: 'CB réel' }, { value: 'amexReel', label: 'AMEX réel' }, { value: 'crtReel', label: 'CRT papier réel' },
  { value: 'cbTrReel', label: 'TR carte réel' }, { value: 'ancvReel', label: 'ANCV réel' }, { value: 'delivReel', label: 'Deliveroo réel' }, { value: 'uberReel', label: 'Uber réel' },
  { value: 'sundayReel', label: 'Sunday réel' }, { value: 'ceReel', label: 'Click / Mango réel' }, { value: 'pourboires', label: 'Pourboires' }, { value: 'bilanEcart', label: 'Écart brut' },
  { value: 'ecartNegatif', label: 'Écart négatif' }, { value: 'ecartPositif', label: 'Écart positif' }, { value: 'fondCaisse', label: 'Fond caisse / 580000' }, { value: 'especesRemise', label: 'Remise espèces' },
];

const row = (id: string, category: AccountingCategory, caisseKey: AccountingCaisseKey, caisseItem: string, debitAccount: string, creditAccount: string, accountingLabel: string, rule: string, keywords = '', notes = ''): AccountingMappingRow => ({ id, active: true, category, caisseKey, caisseItem, company: 'Caisse', debitAccount, creditAccount, accountingLabel, rule, tolerance: category === 'Écart' ? '0,05' : '0,01', keywords, notes });

export const DEFAULT_ACCOUNTING_MAPPINGS: AccountingMappingRow[] = [
  row('ca-ht-5-5', 'Chiffre d’affaires', 'ht55', 'CA HT TVA 5,5 %', '', '707015', 'CAISSE', 'Ventes HT rattachées au taux 5,5 %.', 'CA 5,5; TVA 5,5'),
  row('ca-ht-10', 'Chiffre d’affaires', 'ht10', 'CA HT TVA 10 %', '', '707010', 'CAISSE', 'Ventes HT rattachées au taux 10 %.', 'CA 10; TVA 10'),
  row('ca-ht-20', 'Chiffre d’affaires', 'ht20', 'CA HT TVA 20 %', '', '707020', 'CAISSE', 'Ventes HT rattachées au taux 20 %.', 'CA 20; TVA 20'),
  row('tva-5-5', 'TVA', 'tva55', 'TVA collectée 5,5 %', '', '445715', 'CAISSE', 'TVA collectée associée aux ventes 5,5 %.', 'TVA 5,5; 445715'),
  row('tva-10', 'TVA', 'tva10', 'TVA collectée 10 %', '', '445710', 'CAISSE', 'TVA collectée associée aux ventes 10 %.', 'TVA 10; 445710'),
  row('tva-20', 'TVA', 'tva20', 'TVA collectée 20 %', '', '445720', 'CAISSE', 'TVA collectée associée aux ventes 20 %.', 'TVA 20; 445720'),
  row('especes', 'Paiement', 'totalTtc', 'Total TTC journée caisse', '531100', '', 'CAISSE', 'Débit 531100 = total TTC enregistré par la caisse. Ne pas confondre avec les espèces réelles.', 'TOTAL TTC; CAISSE TOTALE', 'Première ligne 531100 du journal comptable.'),
  row('ancv', 'Paiement', 'ancvReel', 'ANCV', '511200', '', 'CAISSE - ANCV', 'Encaissements ANCV.', 'ANCV'),
  row('amex', 'Paiement', 'amexReel', 'AMEX', '511220', '', 'CAISSE - AMEX', 'Encaissements AMEX.', 'AMEX'),
  row('cb', 'Paiement', 'cbReel', 'Carte bleue', '511210', '', 'CAISSE - CB', 'Cartes bancaires classiques.', 'CB; CARTE BLEUE; NEPTING'),
  row('deliveroo', 'Paiement', 'delivReel', 'Deliveroo', '511240', '', 'CAISSE - DELIVEROO', 'Ventes réglées via Deliveroo.', 'DELIVEROO'),
  row('uber', 'Paiement', 'uberReel', 'Uber Eats', '511250', '', 'CAISSE - UBER', 'Ventes réglées via Uber Eats.', 'UBER; UBEREATS'),
  row('sunday', 'Paiement', 'sundayReel', 'Sunday', '511260', '', 'CAISSE - SUNDAY', 'Paiement Sunday ou TPE Sunday.', 'SUNDAY'),
  row('tr-papier', 'Paiement', 'crtReel', 'Titres restaurant papier', '511230', '', 'CAISSE - CRT', 'Titres restaurant papier remis ou à remettre.', 'CRT; TR PAPIER'),
  row('tr-carte', 'Paiement', 'cbTrReel', 'Cartes titres restaurant', '511230', '', 'CAISSE - TRD', 'Cartes TR dématérialisées.', 'CARTE TR; TRD'),
  row('click-collect', 'Paiement', 'ceReel', 'Click and Collect / Mango Pay', '511270', '', 'CAISSE - MANGO PAY', 'Flux Click and Collect ou paiement web. Libellé généré dynamiquement dans l’export.', 'MANGO PAY; CLICK COLLECT'),
  row('virement-interne', 'Ajustement', 'fondCaisse', 'Fond de caisse / Virement interne', '580000', '', 'CAISSE', 'Règle brouillon : débit 580000 = espèces réelles du jour.', '580; FOND CAISSE; VIREMENT INTERNE', 'À vérifier sur plusieurs jours avec le modèle comptable.'),
  row('ecart-negatif', 'Écart', 'ecartNegatif', 'Écart caisse négatif', '658000', '', 'CAISSE', 'Charge ou perte de caisse.', 'ECART; MANQUANT'),
  row('ecart-positif', 'Écart', 'ecartPositif', 'Écart caisse positif', '', '758000', 'CAISSE', 'Produit ou excédent de caisse.', 'ECART; EXCEDENT'),
  row('pourboires', 'Ajustement', 'pourboires', 'Pourboires', '', '511280', 'POURBOIRE', 'Ligne de pourboire isolée du CA.', 'POURBOIRE; TIPS', 'Ligne au crédit selon le modèle fourni.'),
  row('especes-remise-banque', 'Ajustement', 'especesRemise', 'Contrepartie caisse 531100', '', '531100', 'CAISSE', 'Crédit 531100 = moyens de paiement + 580000 + écart négatif - écart positif - pourboires.', 'REMISE BANQUE; 531100', 'Règle brouillon déduite du fichier comptable fourni.'),
];

const keyValues = new Set(CAISSE_KEY_OPTIONS.map(option => option.value));
const defaultById = new Map(DEFAULT_ACCOUNTING_MAPPINGS.map(item => [item.id, item]));
const cleanCategory = (value: unknown, fallback: AccountingCategory): AccountingCategory => ACCOUNTING_CATEGORIES.includes(value as AccountingCategory) ? value as AccountingCategory : fallback;
const cleanKey = (value: unknown, fallback: AccountingCaisseKey): AccountingCaisseKey => typeof value === 'string' && keyValues.has(value as AccountingCaisseKey) ? value as AccountingCaisseKey : fallback;

export const normalizeAccountingMappings = (input: unknown): AccountingMappingRow[] => {
  if (!Array.isArray(input)) return DEFAULT_ACCOUNTING_MAPPINGS;
  const savedById = new Map<string, Partial<AccountingMappingRow>>();
  input.forEach(item => {
    if (item && typeof item === 'object') {
      const candidate = item as Partial<AccountingMappingRow>;
      if (typeof candidate.id === 'string' && candidate.id) savedById.set(candidate.id, candidate);
    }
  });
  const normalDefaults = DEFAULT_ACCOUNTING_MAPPINGS.map(defaultRow => {
    const saved = savedById.get(defaultRow.id);
    if (!saved) return defaultRow;
    return { ...defaultRow, active: typeof saved.active === 'boolean' ? saved.active : defaultRow.active, category: cleanCategory(saved.category, defaultRow.category), caisseKey: defaultRow.caisseKey, caisseItem: saved.caisseItem || defaultRow.caisseItem, company: typeof saved.company === 'string' ? saved.company : defaultRow.company, debitAccount: typeof saved.debitAccount === 'string' ? saved.debitAccount : defaultRow.debitAccount, creditAccount: typeof saved.creditAccount === 'string' ? saved.creditAccount : defaultRow.creditAccount, accountingLabel: saved.accountingLabel || defaultRow.accountingLabel, rule: defaultRow.rule, tolerance: saved.tolerance || defaultRow.tolerance, keywords: typeof saved.keywords === 'string' ? saved.keywords : defaultRow.keywords, notes: defaultRow.notes };
  });
  const customRows = input.filter(item => item && typeof item === 'object').map(item => item as Partial<AccountingMappingRow>).filter(item => typeof item.id === 'string' && item.id && !defaultById.has(item.id)).map(item => ({ id: item.id || `custom-${Date.now()}`, active: typeof item.active === 'boolean' ? item.active : true, category: cleanCategory(item.category, 'Paiement'), caisseKey: cleanKey(item.caisseKey, ''), caisseItem: item.caisseItem || '', company: item.company || '', debitAccount: item.debitAccount || '', creditAccount: item.creditAccount || '', accountingLabel: item.accountingLabel || '', rule: item.rule || '', tolerance: item.tolerance || '0,01', keywords: item.keywords || '', notes: item.notes || '' }));
  return [...normalDefaults, ...customRows];
};

export const loadAccountingMappings = (): AccountingMappingRow[] => {
  try {
    const saved = localStorage.getItem(ACCOUNTING_STORAGE_KEY);
    if (!saved) return DEFAULT_ACCOUNTING_MAPPINGS;
    return normalizeAccountingMappings(JSON.parse(saved));
  } catch {
    return DEFAULT_ACCOUNTING_MAPPINGS;
  }
};

export const saveAccountingMappings = (rows: AccountingMappingRow[]) => {
  try {
    localStorage.setItem(ACCOUNTING_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // LocalStorage peut être bloqué sans rendre l’écran inutilisable.
  }
};
