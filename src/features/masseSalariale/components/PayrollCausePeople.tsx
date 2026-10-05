import { formatDecimal, formatEuroSigned, formatEuroSymbol } from '@/lib/formatters';

import type { PayrollCause, PayrollCausePerson } from '../payrollVarianceAnalysis';

type PayrollCausePeopleProps = {
  cause: PayrollCause;
};

// Hausse du coût = rose, baisse = vert.
export const toneText = (amount: number) => (amount > 0 ? 'text-pink-700' : 'text-emerald-700');
const toneChip = (amount: number) => (amount > 0 ? 'bg-pink-700/10 text-pink-700' : 'bg-emerald-700/10 text-emerald-700');

const formatHours = (value: number) => `${formatDecimal(value, 2).replace(/,00$/, '')} h`;

// « SOW MOHAMED AL MUSTAFA » → « SOW M. »
const shortName = (nom: string) => {
  const [lastName, firstName] = nom.trim().split(/\s+/);
  return firstName ? `${lastName} ${firstName.charAt(0).toUpperCase()}.` : lastName ?? nom;
};

// Une phrase par personne, adaptée à la cause : tag (entrées/sorties), heures, taux horaire ou rémunération.
function PersonSentence({ person }: { person: PayrollCausePerson }) {
  if (person.tag) {
    return (
      <>
        <b className="text-slate-800">{person.nom}</b>
        <span className={`ml-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${toneChip(person.amount)}`}>{person.tag.label}</span>
      </>
    );
  }
  if (person.hours) {
    return <><b className="text-slate-800">{person.nom}</b> passe de {formatHours(person.hours.from)} à {formatHours(person.hours.to)}</>;
  }
  if (person.costs) {
    return (
      <><b className="text-slate-800">{shortName(person.nom)}</b> : aucune heure, charges seules, {formatEuroSymbol(person.costs.from)} → {formatEuroSymbol(person.costs.to)}</>
    );
  }
  if (person.rate) {
    return (
      <><b className="text-slate-800">{person.nom}</b> passe de {formatDecimal(person.rate.from, 2)} à {formatDecimal(person.rate.to, 2)} €/h</>
    );
  }
  return <><b className="text-slate-800">{person.nom}</b> : rémunération {formatEuroSigned(person.amount)}</>;
}

// Toujours visible sous sa cause : pas de dépliage.
export default function PayrollCausePeople({ cause }: PayrollCausePeopleProps) {
  return (
    <ul className="m-0 grid list-none gap-1 pl-5">
      {cause.people.map(person => (
        <li key={`${person.key}-${person.tag?.label ?? ''}`} className="flex items-baseline justify-between gap-3 text-[11.5px] font-semibold text-slate-500">
          <span className="min-w-0"><PersonSentence person={person} /></span>
          <span className={`shrink-0 font-bold tabular-nums ${toneText(person.amount)}`}>{formatEuroSigned(person.amount)}</span>
        </li>
      ))}
    </ul>
  );
}
