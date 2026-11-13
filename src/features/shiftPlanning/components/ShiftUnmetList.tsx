import type { ShiftUnmet, ShiftUnmetKind } from '@/types/dataTypes';

const KIND_LABELS: Array<{ kind: ShiftUnmetKind; label: string }> = [
  { kind: 'repos', label: 'Repos' },
  { kind: 'besoin', label: 'Besoins non couverts' },
  { kind: 'productivite', label: 'Productivité' },
  { kind: 'contrat', label: 'Heures de contrat' },
  { kind: 'modele', label: 'Modèles manquants' },
];

export default function ShiftUnmetList({ unmet }: { unmet: ShiftUnmet[] }) {
  if (unmet.length === 0) return null;
  return (
    <details className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm">
      <summary className="cursor-pointer text-sm font-bold">Points non respectés ({unmet.length})</summary>
      <div className="mt-2 space-y-3">
        {KIND_LABELS.map(({ kind, label }) => {
          const items = unmet.filter(item => item.kind === kind);
          if (items.length === 0) return null;
          return (
            <div key={kind}>
              <div className="font-bold">{label} ({items.length})</div>
              <ul className="mt-1 space-y-1">
                {items.map((item, index) => <li key={index}>{item.message}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
    </details>
  );
}
