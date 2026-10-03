import { payrollNameKey } from '@/features/dashboard/importHelpers/personnelSalaryImport';
import type { PayrollStoredLine } from '@/types/dataTypes';

// Décomposition de l'écart de coût salarial global entre un mois N et le même mois N-1.
// Chaque personne n'entre que dans UNE cause. Pour une personne présente aux deux dates avec des heures des deux côtés,
// découpage standard effet volume / effet prix : (hN − hN-1) × tauxN-1 (heures / contrat) + (tauxN − tauxN-1) × hN (coût horaire),
// dont la somme est exactement coûtN − coûtN-1. Heures nulles d'un côté : tout l'écart va dans « Heures / contrat ».

export type PayrollCauseKind = 'leavers' | 'arrivals' | 'departures' | 'hours' | 'hourlyRate';

export type PayrollCausePerson = { key: string; nom: string; amount: number };

export type PayrollCause = {
  kind: PayrollCauseKind;
  label: string;
  amount: number;
  people: PayrollCausePerson[];
};

export type PayrollVarianceAnalysis = {
  totalDiff: number; // coût global N − coût global N-1 (totaux), arrondi au centime
  causes: PayrollCause[]; // causes non nulles, dans l'ordre de calcul
  residual: number; // non détaillé : totalDiff − somme des causes (au centime près, exact)
};

type PayrollVarianceInput = {
  current: PayrollStoredLine[];
  previous: PayrollStoredLine[];
  currentTotal: number;
  previousTotal: number;
};

const toCents = (value: number) => Math.round(value * 100);
const fromCents = (cents: number) => cents / 100;

const plural = (count: number) => `${count} pers.`;

type RawPerson = { key: string; nom: string; amount: number };

const buildCause = (kind: PayrollCauseKind, label: string, people: RawPerson[], withCount: boolean): PayrollCause | null => {
  const detailed = people
    .map(person => ({ key: person.key, nom: person.nom, cents: toCents(person.amount) }))
    .filter(person => person.cents !== 0);
  const cents = toCents(people.reduce((sum, person) => sum + person.amount, 0));
  if (cents === 0) return null;
  return {
    kind,
    label: withCount ? `${label} (${plural(detailed.length)})` : label,
    amount: fromCents(cents),
    people: detailed.map(person => ({ key: person.key, nom: person.nom, amount: fromCents(person.cents) })).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
  };
};

export const analyzePayrollVariance = ({ current, previous, currentTotal, previousTotal }: PayrollVarianceInput): PayrollVarianceAnalysis => {
  const leavers: RawPerson[] = [];
  const arrivals: RawPerson[] = [];
  const departures: RawPerson[] = [];
  const hoursEffect: RawPerson[] = [];
  const rateEffect: RawPerson[] = [];

  // 1. Sortants / STC : coût des sortants de N en plus, coût des sortants de N-1 en moins.
  const stay = (lines: PayrollStoredLine[], sign: 1 | -1) => lines.filter(line => {
    if (!line.exitDate) return true;
    leavers.push({ key: line.key, nom: line.nom, amount: sign * line.coutGlobal });
    return false;
  });
  const currentStaying = stay(current, 1);
  const previousStaying = stay(previous, -1);

  // Appariement par clé (matricule ou nom normalisé), repli sur le nom normalisé sans ordre prénom/nom.
  const previousByKey = new Map(previousStaying.map(line => [line.key, line]));
  const previousByName = new Map(previousStaying.map(line => [payrollNameKey(line.nom), line]));
  const matched = new Set<PayrollStoredLine>();

  currentStaying.forEach(line => {
    const other = [previousByKey.get(line.key), previousByName.get(payrollNameKey(line.nom))].find(candidate => candidate && !matched.has(candidate));
    if (!other) {
      arrivals.push({ key: line.key, nom: line.nom, amount: line.coutGlobal });
      return;
    }
    matched.add(other);
    if (line.heures > 0 && other.heures > 0) {
      const previousRate = other.coutGlobal / other.heures;
      const currentRate = line.coutGlobal / line.heures;
      hoursEffect.push({ key: line.key, nom: line.nom, amount: (line.heures - other.heures) * previousRate });
      rateEffect.push({ key: line.key, nom: line.nom, amount: (currentRate - previousRate) * line.heures });
    } else {
      hoursEffect.push({ key: line.key, nom: line.nom, amount: line.coutGlobal - other.coutGlobal });
    }
  });
  previousStaying.filter(line => !matched.has(line)).forEach(line => {
    departures.push({ key: line.key, nom: line.nom, amount: -line.coutGlobal });
  });

  const causes = [
    buildCause('leavers', 'Sortants / STC', leavers, true),
    buildCause('arrivals', 'Arrivées', arrivals, true),
    buildCause('departures', 'Départs', departures, true),
    buildCause('hours', 'Heures / contrat (même personne)', hoursEffect, false),
    buildCause('hourlyRate', 'Coût horaire (même personne)', rateEffect, false),
  ].filter((cause): cause is PayrollCause => cause !== null);

  // Le résiduel absorbe les arrondis : somme des causes + résiduel = écart total, exactement (en centimes).
  const totalCents = toCents(currentTotal - previousTotal);
  const explainedCents = causes.reduce((sum, cause) => sum + toCents(cause.amount), 0);
  return { totalDiff: fromCents(totalCents), causes, residual: fromCents(totalCents - explainedCents) };
};
