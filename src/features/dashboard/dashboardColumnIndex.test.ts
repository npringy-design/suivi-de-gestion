import { describe, expect, it } from 'vitest';

import { dashboardColumns } from '@/features/dashboard/dashboardColumns';
import {
  COL,
  HOURS_PROJECTION_CUISINE_SALLE,
  HOURS_PROJECTION_GLOBAL,
  HOURS_REALISE_CUISINE_SALLE,
  HOURS_REALISE_GLOBAL,
} from '@/features/dashboard/dashboardColumnIndex';

const header = (index: number) => dashboardColumns[index].slice(0, 3).join(' | ').replace(/\n/g, ' ');

// Garde-fou : si une colonne est insérée ou déplacée dans dashboardColumns.ts, ce test casse au lieu
// de laisser un calcul lire silencieusement la mauvaise colonne.
describe('index nommés des colonnes du Suivi quotidien', () => {
  it.each([
    ['BUDGET_CA_MIDI', 'CA | Midi Saisie | CA HT MIDI'],
    ['BUDGET_CA_SOIR', 'CA | Soir Saisie | CA HT SOIR'],
    ['BUDGET_CA_LIMONADE', 'CA | Limonade Saisie | CA HT LIMONADE'],
    ['BUDGET_CA_JOUR', 'CA | TOTAL JOUR | CAHT JOUR'],
    ['BUDGET_CA_CUMUL', 'CA | CUMUL DEPUIS LE 01 | CAHTCUMUL'],
    ['BUDGET_CVTS_MIDI', 'RESTAURANTS | MIDI Prevision Saisie | NB CVTS'],
    ['BUDGET_TM_MIDI', 'RESTAURANTS | MIDI Prevision Saisie | CVTS MOY HT'],
    ['BUDGET_CVTS_SOIR', 'RESTAURANTS | SOIR Prevision Saisie | NB CVTS'],
    ['BUDGET_TM_SOIR', 'RESTAURANTS | SOIR Prevision Saisie | CVTS MOY HT'],
    ['BUDGET_CVTS_JOUR', 'RESTAURANTS | JOUR Prevision Saisie | NB CVTS'],
    ['BUDGET_TM_JOUR', 'RESTAURANTS | JOUR Prevision Saisie | CVTS MOY HT'],
    ['BUDGET_CVTS_LIMONADE', 'LIMONADE | JOUR Prevision Saisie | NB CVTS'],
    ['BUDGET_TM_LIMONADE', 'LIMONADE | JOUR Prevision Saisie | CVTS MOY HT'],
    ['REALISE_CA_VAE', 'REALISE | CA HT | VAE'],
    ['REALISE_CA_MIDI', 'REALISE | CA HT | MIDI'],
    ['REALISE_CA_SOIR', 'REALISE | CA HT | SOIR'],
    ['REALISE_CA_LIMONADE', 'REALISE | CA HT | LIMONADE'],
    ['REALISE_CA_JOUR', 'REALISE | CA HT | TOTAL JOUR'],
    ['REALISE_ECART_BUDGET', 'REALISE | CA HT | ECART BUDGET'],
    ['REALISE_CA_CUMUL', 'REALISE | CA HT | CUMUL DEPUIS LE 01'],
    ['REALISE_CVTS_MIDI', 'REALISE | COUVERTS RESTAURANT | MIDI NB CVTS'],
    ['REALISE_CVTS_SOIR', 'REALISE | COUVERTS RESTAURANT | SOIR NB CVTS'],
    ['REALISE_CVTS_JOUR', 'REALISE | COUVERTS RESTAURANT | TOTAL JOUR'],
    ['REALISE_TM_JOUR', 'REALISE | COUVERTS RESTAURANT | MOY JOUR'],
    ['REALISE_CVTS_LIMONADE', 'REALISE | COUVERTS LIMONADE | NB CVTS'],
    ['REALISE_CVTS_COMPLET_JOUR', 'REALISE | COUVERTS | TOTAL JOUR'],
    ['DEMARQUE_PERSONNEL', 'DEMARQUES | PERSONNEL | '],
    ['DEMARQUE_OPERATIONNEL', 'DEMARQUES | OPERATIONEL | '],
    ['DEMARQUE_TOTAL', 'DEMARQUES | TOTAL | '],
    ['ACHAT_PREMIER', 'COUT MATIERE | ACHATS LIQUIDE HT | C10'],
    ['ACHAT_DERNIER', 'COUT MATIERE | ACHATS SOLIDES HT | MARTEL'],
    ['ACHAT_TOTAL', 'COUT MATIERE | ACHAT HT | TOTAL HT'],
    ['HEURES_PROJECTION', 'FRAIS DE PERSONNEL PROJECTION |  | TOTAL HEURES TRAVAILLEES'],
    ['COUT_PROJECTION', 'FRAIS DE PERSONNEL PROJECTION |  | COUT GLOBAL'],
    ['HEURES_REALISE', 'FRAIS DE PERSONNEL REALISE |  | TOTAL HEURES TRAVAILLEES'],
    ['COUT_REALISE', 'FRAIS DE PERSONNEL REALISE |  | COUT GLOBAL'],
    ['CONTRAT_NOM', 'CONTRAT MENSUALISES |  | Nom'],
    ['CONTRAT_MONTANT', 'CONTRAT MENSUALISES |  | Montant'],
  ] as const)('%s', (name, expected) => {
    expect(header(COL[name])).toBe(expected);
  });

  it('colonnes d\'heures par catégorie', () => {
    HOURS_PROJECTION_CUISINE_SALLE.forEach(i => expect(header(i)).toMatch(/^FRAIS DE PERSONNEL PROJECTION \| PROJECTION S\/C \| .*(CUISINE|SALLE)/));
    HOURS_REALISE_CUISINE_SALLE.forEach(i => expect(header(i)).toMatch(/^FRAIS DE PERSONNEL REALISE \| FRAIS PERSONNEL REALISE \| .*(CUISINE|SALLE)/));
    HOURS_PROJECTION_GLOBAL.forEach(i => expect(header(i)).toMatch(/^FRAIS DE PERSONNEL PROJECTION \| PROJECTION S\/C \| /));
    HOURS_REALISE_GLOBAL.forEach(i => expect(header(i)).toMatch(/^FRAIS DE PERSONNEL REALISE \| FRAIS PERSONNEL REALISE \| /));
    expect(header(HOURS_REALISE_GLOBAL[0])).not.toMatch(/CUISINE|SALLE/);
  });
});
