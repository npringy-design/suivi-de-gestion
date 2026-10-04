import { payrollNameKey } from '@/features/dashboard/importHelpers/personnelSalaryImport';
import type { PayrollStoredLine } from '@/types/dataTypes';

// Décomposition de l'écart de coût salarial global entre un mois N et le même mois N-1, en 3 causes + un résiduel.
// Chaque personne n'entre que dans UNE cause :
//  1. Entrées / sorties : arrivées (+), départs (−), sortants avec STC (+ en N, − en N-1), montant net ;
//  2. Heures travaillées : (hN − hN-1) × tauxN-1 pour les personnes présentes aux deux dates ;
//  3. Taux horaire / rémunération : (tauxN − tauxN-1) × hN ; forfaits jour (pas d'heures à comparer) : tout l'écart de coût.
// Pour une personne aux heures comparables, 2 + 3 = coûtN − coûtN-1 exactement. Heures nulles d'un seul côté : tout dans 2.
// Le résiduel (écart des totaux du PDF − somme des causes) n'est pas une cause de coût : il signale des lignes manquantes.

export type PayrollCauseKind = 'entriesExits' | 'hours' | 'rate';

export type PayrollPersonTag = {
  kind: 'arrival' | 'departure' | 'stc';
  label: string; // « Arrivée », « Départ », « STC 2026 »
};

export type PayrollCausePerson = {
  key: string;
  nom: string;
  amount: number;
  tag?: PayrollPersonTag; // cause 1
  hours?: { from: number; to: number }; // cause 2
  rate?: { from: number; to: number }; // cause 3, €/h
  forfait?: boolean; // cause 3 : rémunération d'un forfait jour
};

export type PayrollCause = {
  kind: PayrollCauseKind;
  label: string;
  amount: number;
  people: PayrollCausePerson[];
};

export type PayrollVarianceAnalysis = {
  totalDiff: number; // coût global N − coût global N-1 (totaux), arrondi au centime
  causes: PayrollCause[]; // causes non nulles, dans l'ordre de calcul
  residual: number; // lignes du PDF non détaillées : totalDiff − somme des causes (exact au centime)
};

type PayrollVarianceInput = {
  current: PayrollStoredLine[];
  previous: PayrollStoredLine[];
  currentTotal: number;
  previousTotal: number;
};

const CAUSE_LABELS: Record<PayrollCauseKind, string> = {
  entriesExits: 'Entrées / sorties',
  hours: 'Heures travaillées vs N-1',
  rate: 'Taux horaire / rémunération',
};

const toCents = (value: number) => Math.round(value * 100);
const fromCents = (cents: number) => cents / 100;

const stcLabel = (exitDate: string | undefined) => {
  const year = exitDate?.match(/(\d{4})$/)?.[1];
  return year ? `STC ${year}` : 'STC';
};

const buildCause = (kind: PayrollCauseKind, people: PayrollCausePerson[]): PayrollCause | null => {
  const cents = toCents(people.reduce((sum, person) => sum + person.amount, 0));
  if (cents === 0) return null;
  return {
    kind,
    label: CAUSE_LABELS[kind],
    amount: fromCents(cents),
    people: people
      .map(person => ({ ...person, amount: fromCents(toCents(person.amount)) }))
      .filter(person => person.amount !== 0)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
  };
};

export const analyzePayrollVariance = ({ current, previous, currentTotal, previousTotal }: PayrollVarianceInput): PayrollVarianceAnalysis => {
  const entriesExits: PayrollCausePerson[] = [];
  const hoursEffect: PayrollCausePerson[] = [];
  const rateEffect: PayrollCausePerson[] = [];

  // Sortants avec STC : coût des sortants de N en plus, coût des sortants de N-1 en moins.
  const staying = (lines: PayrollStoredLine[], sign: 1 | -1) => lines.filter(line => {
    if (!line.exitDate) return true;
    entriesExits.push({
      key: line.key,
      nom: line.nom,
      amount: sign * line.coutGlobal,
      tag: { kind: 'stc', label: stcLabel(line.exitDate) },
    });
    return false;
  });
  const currentStaying = staying(current, 1);
  const previousStaying = staying(previous, -1);

  // Appariement par clé (matricule ou nom normalisé), repli sur le nom normalisé sans ordre prénom/nom.
  const previousByKey = new Map(previousStaying.map(line => [line.key, line]));
  const previousByName = new Map(previousStaying.map(line => [payrollNameKey(line.nom), line]));
  const matched = new Set<PayrollStoredLine>();

  currentStaying.forEach(line => {
    const other = [previousByKey.get(line.key), previousByName.get(payrollNameKey(line.nom))].find(candidate => candidate && !matched.has(candidate));
    if (!other) {
      entriesExits.push({ key: line.key, nom: line.nom, amount: line.coutGlobal, tag: { kind: 'arrival', label: 'Arrivée' } });
      return;
    }
    matched.add(other);
    const diff = line.coutGlobal - other.coutGlobal;
    const base = { key: line.key, nom: line.nom };

    if (line.forfaitJour || other.forfaitJour || (line.heures <= 0 && other.heures <= 0)) {
      rateEffect.push({ ...base, amount: diff, forfait: true });
    } else if (line.heures > 0 && other.heures > 0) {
      const previousRate = other.coutGlobal / other.heures;
      const currentRate = line.coutGlobal / line.heures;
      hoursEffect.push({ ...base, amount: (line.heures - other.heures) * previousRate, hours: { from: other.heures, to: line.heures } });
      rateEffect.push({ ...base, amount: (currentRate - previousRate) * line.heures, rate: { from: previousRate, to: currentRate } });
    } else {
      hoursEffect.push({ ...base, amount: diff, hours: { from: other.heures, to: line.heures } });
    }
  });
  previousStaying.filter(line => !matched.has(line)).forEach(line => {
    entriesExits.push({ key: line.key, nom: line.nom, amount: -line.coutGlobal, tag: { kind: 'departure', label: 'Départ' } });
  });

  const causes = [
    buildCause('entriesExits', entriesExits),
    buildCause('hours', hoursEffect),
    buildCause('rate', rateEffect),
  ].filter((cause): cause is PayrollCause => cause !== null);

  // Le résiduel absorbe les arrondis : somme des causes + résiduel = écart total, exactement (en centimes).
  const totalCents = toCents(currentTotal - previousTotal);
  const explainedCents = causes.reduce((sum, cause) => sum + toCents(cause.amount), 0);
  return { totalDiff: fromCents(totalCents), causes, residual: fromCents(totalCents - explainedCents) };
};
