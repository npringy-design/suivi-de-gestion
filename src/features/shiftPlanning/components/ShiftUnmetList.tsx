import type { ShiftUnmet } from '@/types/dataTypes';

export default function ShiftUnmetList({ unmet }: { unmet: ShiftUnmet[] }) {
  if (unmet.length === 0) return null;
  return (
    <details className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm">
      <summary className="cursor-pointer text-sm font-bold">Points non respectés ({unmet.length})</summary>
      <ul className="mt-2 space-y-1">
        {unmet.map((item, index) => <li key={index}>{item.message}</li>)}
      </ul>
    </details>
  );
}
