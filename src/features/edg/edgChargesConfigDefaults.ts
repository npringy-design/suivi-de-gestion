import type { EdgChargesConfig } from '@/types/dataTypes';

// Les 17 lignes EDG sous Résultat Gestion concernées par l'auto-remplissage réalisé piloté
// par ParametrageEdg — même clés que dans edgMensuel/edgMensuelRealise, ordre d'affichage.
export const EDG_CHARGE_ROWS: { key: string; label: string }[] = [
  { key: 'amortissements', label: 'Amortissements' },
  { key: 'credit_bail', label: 'Crédit Bail' },
  { key: 'loyers_murs', label: 'Loyers Murs' },
  { key: 'charges_locatives', label: 'Charges locatives et GIE' },
  { key: 'impots_taxes', label: 'Impots et taxes' },
  { key: 'redevances_spre', label: 'Redavances Spre SACEM' },
  { key: 'redevances_flo', label: 'Redevances Grpe Flo' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'except_gestion', label: 'Except de gestion(Diff.de caisse+Remb Ass)' },
  { key: 'frais_banque', label: 'Frais de banque' },
  { key: 'net_financier', label: 'Net financier' },
  { key: 'amortissement_except', label: 'Amortissement except.' },
  { key: 'frais_holding', label: 'Frais de Holding' },
  { key: 'pertes_except', label: 'Pertes exceptionnelles' },
  { key: 'retraitement_daa', label: 'Retraitement DAA & Net financier' },
  { key: 'remboursement_net', label: 'Remboursement net financier' },
  { key: 'remboursement_capital', label: 'Remboursement Capital emprunté' },
];

const DEFAULT_FIXED_KEYS = new Set([
  'amortissements', 'credit_bail', 'loyers_murs', 'charges_locatives', 'impots_taxes',
  'marketing', 'net_financier', 'frais_holding', 'remboursement_net', 'remboursement_capital',
]);

const DEFAULT_PERCENT_KEYS = new Set(['redevances_spre', 'redevances_flo', 'frais_banque']);

// Reste en 'manuel' par défaut : except_gestion, amortissement_except, pertes_except, retraitement_daa.
export const createDefaultEdgChargesConfig = (): EdgChargesConfig => {
  const config: EdgChargesConfig = {};
  EDG_CHARGE_ROWS.forEach(({ key }) => {
    if (DEFAULT_FIXED_KEYS.has(key)) {
      config[key] = { mode: 'fixe' };
    } else if (DEFAULT_PERCENT_KEYS.has(key)) {
      config[key] = { mode: 'pourcentage', pourcentage: 0 };
    } else {
      config[key] = { mode: 'manuel' };
    }
  });
  return config;
};
