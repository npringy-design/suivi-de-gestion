import { formatDecimal, formatEuroSigned, formatEuroSymbol, formatPercentSigned } from '@/lib/formatters';
import { useHasLimonade } from '@/lib/useHasLimonade';
import { getLimonadeTm, type LimonadeFigures } from '@/features/edg/edgRealtimeSources';

export type LimonadeSectionRow = {
  label: string;
  ref: LimonadeFigures;
  actual?: LimonadeFigures;
};

type Props = {
  rows: LimonadeSectionRow[];
  total?: LimonadeSectionRow;
  refLabel?: string;
  actualLabel?: string;
  note?: string;
};

const TH = 'px-2 py-1.5 text-right text-[11px] font-black uppercase tracking-wide text-slate-500';
const TD = 'px-2 py-1.5 text-right text-xs font-semibold tabular-nums text-slate-700';

const ecartColor = (v: number) => (v < 0 ? 'text-red-700' : v > 0 ? 'text-green-800' : 'text-slate-500');
const dash = (v: number, fmt: (n: number) => string) => (v === 0 ? '—' : fmt(v));

function Cells({ row, withActual }: { row: LimonadeSectionRow; withActual: boolean }) {
  const { ref, actual } = row;
  const caEcart = actual ? actual.ca - ref.ca : 0;
  const cvEcart = actual ? actual.cvts - ref.cvts : 0;
  return (
    <>
      <td className={TD}>{dash(ref.ca, formatEuroSymbol)}</td>
      {withActual && (
        <>
          <td className={TD}>{actual ? dash(actual.ca, formatEuroSymbol) : '—'}</td>
          <td className={`${TD} ${ecartColor(caEcart)}`}>{actual ? formatEuroSigned(caEcart) : '—'}</td>
          <td className={`${TD} ${ecartColor(caEcart)}`}>{actual && ref.ca !== 0 ? formatPercentSigned((caEcart / Math.abs(ref.ca)) * 100) : '—'}</td>
        </>
      )}
      <td className={`${TD} border-l border-slate-200`}>{dash(ref.cvts, n => formatDecimal(n, 0))}</td>
      {withActual && (
        <>
          <td className={TD}>{actual ? dash(actual.cvts, n => formatDecimal(n, 0)) : '—'}</td>
          <td className={`${TD} ${ecartColor(cvEcart)}`}>{actual ? `${cvEcart > 0 ? '+' : ''}${formatDecimal(cvEcart, 0)}` : '—'}</td>
        </>
      )}
      <td className={`${TD} border-l border-slate-200`}>{dash(getLimonadeTm(ref), formatEuroSymbol)}</td>
      {withActual && <td className={TD}>{actual ? dash(getLimonadeTm(actual), formatEuroSymbol) : '—'}</td>}
    </>
  );
}

// Section « Limonade » : CA HT, couverts et TM (budget / réalisé / écart). Rendue uniquement pour
// les sites qui ont une activité limonade (jamais pour Hippo).
export default function LimonadeSection({ rows, total, refLabel = 'Budget', actualLabel = 'Réalisé', note }: Props) {
  const hasLimonade = useHasLimonade();
  if (!hasLimonade) return null;
  const withActual = [...rows, ...(total ? [total] : [])].some(r => r.actual !== undefined);

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Limonade">
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-800">Limonade</h3>
      {note && <p className="mt-1 text-[11px] font-semibold text-slate-500">{note}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${TH} text-left`} rowSpan={2}>Période</th>
              <th className={`${TH} text-center`} colSpan={withActual ? 4 : 1}>CA HT</th>
              <th className={`${TH} border-l border-slate-200 text-center`} colSpan={withActual ? 3 : 1}>Couverts</th>
              <th className={`${TH} border-l border-slate-200 text-center`} colSpan={withActual ? 2 : 1}>TM</th>
            </tr>
            <tr>
              <th className={TH}>{refLabel}</th>
              {withActual && <><th className={TH}>{actualLabel}</th><th className={TH}>Écart €</th><th className={TH}>Écart %</th></>}
              <th className={`${TH} border-l border-slate-200`}>{refLabel}</th>
              {withActual && <><th className={TH}>{actualLabel}</th><th className={TH}>Écart</th></>}
              <th className={`${TH} border-l border-slate-200`}>{refLabel}</th>
              {withActual && <th className={TH}>{actualLabel}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label} className="border-t border-slate-100">
                <td className="px-2 py-1.5 text-left text-xs font-bold text-slate-700">{row.label}</td>
                <Cells row={row} withActual={withActual} />
              </tr>
            ))}
            {total && (
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td className="px-2 py-1.5 text-left text-xs font-black text-slate-800">{total.label}</td>
                <Cells row={total} withActual={withActual} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
