import { useState, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';

import { useData } from '@/contexts/DataContext';
import { MONTH_NAMES } from '@/lib/constants';
import { formatEuro } from '@/lib/formatters';
import { parseMoneyValue } from '@/lib/money';
import { buildMonthRows } from '@/features/dashboard/dashboardRows';

type Props = {
  systemId: string;
  month: number;
  year: number;
  onBack: () => void;
};

const BG_PAGE = 'linear-gradient(135deg, #07111f 0%, #0a2430 50%, #073d43 100%)';
const TH = 'sticky top-0 z-10 bg-[#07111f] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70 border-b border-cyan-200/10 whitespace-nowrap';
const TD = 'px-4 py-2 text-sm text-amber-50/90 border-b border-cyan-200/5';
const TD_DAY = TD + ' font-semibold text-amber-50/80 sticky left-0 bg-[rgba(6,31,40,0.95)]';
const TD_TOTAL = 'px-4 py-2.5 text-sm font-black border-t border-cyan-200/15 bg-[rgba(6,31,40,0.6)]';

function EditCell({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <input
      ref={inputRef}
      className="w-full bg-transparent text-sm text-amber-50/90 outline-none border-b border-transparent focus:border-cyan-400/50"
      value={draft !== null ? draft : (parseMoneyValue(value) > 0 ? parseMoneyValue(value).toLocaleString('fr-FR') : '')}
      placeholder="—"
      onChange={e => setDraft(e.target.value)}
      onFocus={() => { const n = parseMoneyValue(value); setDraft(n > 0 ? String(n) : ''); }}
      onBlur={() => { onCommit(draft ?? ''); setDraft(null); }}
      onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.blur(); }}
    />
  );
}

export default function SaisieCaisseDynamique({ systemId, month, year, onBack }: Props) {
  const { data, updateCaisseDynamique, companySettings } = useData();
  const [activeMonth, setActiveMonth] = useState(month);

  const sys = (companySettings.caisseSystemes ?? []).find(s => s.id === systemId);
  const systemName = sys?.name ?? systemId;

  const monthData = data[activeMonth];
  const rawCaisse: Record<string, string> = monthData?.caisseDynamique ?? {};

  const getVal = useCallback((day: number, field: 'montant' | 'commentaire') =>
    rawCaisse[`${systemId}:${day}:${field}`] ?? '', [rawCaisse, systemId]);

  const setVal = useCallback((day: number, field: 'montant' | 'commentaire', value: string) => {
    updateCaisseDynamique(activeMonth, systemId, day, field, value);
  }, [activeMonth, systemId, updateCaisseDynamique]);

  const rows = useMemo(() => buildMonthRows(year, activeMonth), [year, activeMonth]);
  const dayRows = rows.filter(r => r.type === 'day' && r.dayIndex != null);

  const totalMontant = useMemo(() =>
    dayRows.reduce((sum, r) => sum + parseMoneyValue(getVal(r.dayIndex! + 1, 'montant')), 0),
    [dayRows, getVal],
  );

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: BG_PAGE }}>
      <div className="mx-auto flex max-w-[900px] flex-col gap-5">

        {/* Header */}
        <header className="overflow-hidden rounded-3xl border border-cyan-200/15 bg-[rgba(6,31,40,0.8)] p-5 shadow-xl">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-50 ring-1 ring-white/15 transition hover:bg-white/20"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/60">Saisie mensuelle</div>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-amber-50">{systemName}</h1>
            </div>
          </div>

          {/* Pills mois */}
          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
            {MONTH_NAMES.map((m, i) => (
              <button
                key={i}
                onClick={() => setActiveMonth(i)}
                className={[
                  'shrink-0 rounded-lg px-3 py-1.5 text-xs font-black transition',
                  activeMonth === i
                    ? 'bg-gradient-to-r from-[#078892] to-[#0f5d66] text-white shadow-md'
                    : 'border border-cyan-200/15 text-cyan-100/60 hover:border-cyan-200/30 hover:text-cyan-100',
                ].join(' ')}
              >
                {m.slice(0, 4).toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        {/* Tableau */}
        <div className="overflow-hidden rounded-2xl border border-cyan-200/15 bg-[rgba(6,31,40,0.8)] shadow-lg">
          <div className="overflow-auto">
            <table className="min-w-[500px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className={TH + ' text-left sticky left-0 bg-[#07111f] min-w-[120px]'}>Date</th>
                  <th className={TH + ' text-right min-w-[140px]'}>Montant (€)</th>
                  <th className={TH + ' text-left min-w-[240px]'}>Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {dayRows.map((row, ri) => {
                  const day = row.dayIndex! + 1;
                  const montant = getVal(day, 'montant');
                  const commentaire = getVal(day, 'commentaire');
                  const hasMontant = parseMoneyValue(montant) > 0;

                  return (
                    <tr key={ri} className={!hasMontant ? 'opacity-60' : ''}>
                      <td className={TD_DAY + (row.isWeekend ? ' text-cyan-300/70' : '')}>
                        {row.label?.split(' ').slice(0, 2).join(' ')}
                      </td>
                      <td className={TD + ' text-right'}>
                        <EditCell
                          value={montant}
                          onCommit={v => setVal(day, 'montant', parseMoneyValue(v) > 0 ? String(parseMoneyValue(v)) : '')}
                        />
                      </td>
                      <td className={TD}>
                        <input
                          className="w-full bg-transparent text-sm text-cyan-100/70 outline-none placeholder:text-cyan-100/20 focus:text-amber-50/90"
                          value={commentaire}
                          placeholder="—"
                          onChange={e => setVal(day, 'commentaire', e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className={TD_TOTAL + ' text-amber-300 sticky left-0 bg-[rgba(6,31,40,0.6)]'}>TOTAL {MONTH_NAMES[activeMonth].toUpperCase()} {year}</td>
                  <td className={TD_TOTAL + ' text-right text-amber-50'}>{totalMontant > 0 ? formatEuro(totalMontant) : '—'}</td>
                  <td className={TD_TOTAL} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
