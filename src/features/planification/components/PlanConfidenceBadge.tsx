import type { PlanConfidence, PlanServiceProposal } from '@/types/dataTypes';

const STYLES: Record<PlanConfidence, string> = {
  fiable: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200',
  faible: 'border-amber-300/40 bg-amber-400/15 text-amber-200',
  critique: 'border-rose-300/50 bg-rose-500/20 text-rose-200',
};

const CONFIDENCE_LABEL: Record<PlanConfidence, string> = { fiable: 'Fiable', faible: 'Faible', critique: 'Critique' };

const SOURCE_TEXT: Record<PlanServiceProposal['source'], string> = {
  groupe: 'moyenne du groupe jour × statut vacances',
  repli: 'repli : pas d\'historique pour ce statut vacances, jour de semaine seul',
  aucune: 'aucun historique pour ce jour de semaine',
  ferme: 'service fermé la plupart du temps dans ce groupe',
};

export const proposalTitle = (p: PlanServiceProposal): string =>
  `${CONFIDENCE_LABEL[p.confidence]} · n=${p.n} · ${SOURCE_TEXT[p.source]}${p.source === 'groupe' || p.source === 'repli' ? ` · ${p.estimator}` : ''}${p.manual ? ' · saisie manuelle' : ''}`;

export default function PlanConfidenceBadge({ proposal }: { proposal: PlanServiceProposal }) {
  const label = proposal.manual
    ? 'Manuel'
    : proposal.source === 'repli' ? `Repli n=${proposal.n}`
      : proposal.source === 'aucune' ? 'Aucune'
        : proposal.source === 'ferme' ? 'Fermé'
          : `n=${proposal.n}`;
  return (
    <span
      title={proposalTitle(proposal)}
      className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${STYLES[proposal.confidence]}`}
    >
      {label}
    </span>
  );
}
