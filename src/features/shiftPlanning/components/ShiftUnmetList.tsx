import type { ShiftUnmet } from '@/types/dataTypes';

export default function ShiftUnmetList({ unmet }: { unmet: ShiftUnmet[] }) {
  if (unmet.length === 0) return null;
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm">
      <div className="mb-1 font-bold">Génération : {unmet.length} point{unmet.length > 1 ? 's' : ''} non tenu{unmet.length > 1 ? 's' : ''}</div>
      <ul className="space-y-1">
        {unmet.map((item, index) => <li key={index}>{item.message}</li>)}
      </ul>
    </div>
  );
}
