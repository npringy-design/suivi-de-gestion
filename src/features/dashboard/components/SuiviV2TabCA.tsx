import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

import { formatEuro } from '@/lib/formatters';
import { parseMoneyValue } from '@/lib/money';
import { getDashboardRowIndices } from '@/lib/utils';
import { buildMonthRows } from '@/features/dashboard/dashboardRows';
import { EditCell, VarBadge, TH_CLS, TD_CLS, TD_DAY, TD_WEEK, TD_DAY_WEEK, readComputed, fmtNum } from './SuiviV2Shared';

type ExpandedGroups = { ca: boolean; couverts: boolean; budget: boolean };

const STORAGE_KEY = 'sqv2_expanded_groups';

function loadExpanded(): ExpandedGroups {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ExpandedGroups) : { ca: false, couverts: false, budget: false };
  } catch {
    return { ca: false, couverts: false, budget: false };
  }
}

function saveExpanded(g: ExpandedGroups) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); } catch { /* noop */ }
}

function GroupTh({ label, expanded, onToggle, colSpan }: {
  label: string; expanded: boolean; onToggle: () => void; colSpan: number;
}) {
  return (
    <th colSpan={colSpan} className={TH_CLS + ' text-center border-l border-cyan-200/10'}>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 hover:text-cyan-200 transition-colors"
      >
        {label}
        {expanded
          ? <ChevronDown className="h-3 w-3 text-cyan-400/60" />
          : <ChevronRight className="h-3 w-3 text-cyan-400/60" />}
      </button>
    </th>
  );
}

export default function TabCA({
  month,
  year,
  computed,
  rawDashboard,
  computedN1,
  updateDashboard,
}: {
  month: number;
  year: number;
  computed: Record<string, string>;
  rawDashboard: Record<string, string>;
  computedN1: Record<string, string>;
  updateDashboard: (month: number, cellKey: string, value: string) => void;
}) {
  const [expanded, setExpanded] = useState<ExpandedGroups>(loadExpanded);

  const toggle = (g: keyof ExpandedGroups) => {
    const next = { ...expanded, [g]: !expanded[g] };
    setExpanded(next);
    saveExpanded(next);
  };

  const rows = useMemo(() => buildMonthRows(year, month), [year, month]);
  const indices = useMemo(() => getDashboardRowIndices(month, year), [month, year]);

  // Totaux semaine
  const weekTotals = useMemo(() => {
    const totals: Record<number, { vae: number; caMidi: number; caSoir: number; caLimo: number; caTotal: number; cvtsMidi: number; cvtsSoir: number; cvts: number; budgetCA: number; ecart: number }> = {};
    rows.forEach(row => {
      if (row.type === 'day' && row.dayIndex != null && row.weekIndex != null) {
        const rIdx = indices[row.dayIndex];
        const w = row.weekIndex;
        if (!totals[w]) totals[w] = { vae: 0, caMidi: 0, caSoir: 0, caLimo: 0, caTotal: 0, cvtsMidi: 0, cvtsSoir: 0, cvts: 0, budgetCA: 0, ecart: 0 };
        totals[w].vae      += readComputed(computed, rIdx, 17);
        totals[w].caMidi   += readComputed(computed, rIdx, 18);
        totals[w].caSoir   += readComputed(computed, rIdx, 19);
        totals[w].caLimo   += readComputed(computed, rIdx, 20);
        totals[w].caTotal  += readComputed(computed, rIdx, 21);
        totals[w].cvtsMidi += readComputed(computed, rIdx, 25);
        totals[w].cvtsSoir += readComputed(computed, rIdx, 27);
        totals[w].cvts     += readComputed(computed, rIdx, 29);
        totals[w].budgetCA += readComputed(computed, rIdx, 3);
        totals[w].ecart    += readComputed(computed, rIdx, 22);
      }
    });
    return totals;
  }, [rows, indices, computed]);

  // Totaux mois
  const monthTotal = useMemo(() => {
    let vae = 0, caMidi = 0, caSoir = 0, caLimo = 0, caTotal = 0, cumul = 0, cvtsMidi = 0, cvtsSoir = 0, cvts = 0, cvtsCumul = 0, budgetCA = 0, ecart = 0;
    Object.values(indices).forEach(rIdx => {
      vae      += readComputed(computed, rIdx, 17);
      caMidi   += readComputed(computed, rIdx, 18);
      caSoir   += readComputed(computed, rIdx, 19);
      caLimo   += readComputed(computed, rIdx, 20);
      caTotal  += readComputed(computed, rIdx, 21);
      cumul    += readComputed(computed, rIdx, 23);
      cvtsMidi += readComputed(computed, rIdx, 25);
      cvtsSoir += readComputed(computed, rIdx, 27);
      cvts     += readComputed(computed, rIdx, 29);
      cvtsCumul += readComputed(computed, rIdx, 32);
      budgetCA += readComputed(computed, rIdx, 3);
      ecart    += readComputed(computed, rIdx, 22);
    });
    return { vae, caMidi, caSoir, caLimo, caTotal, cumul, cvtsMidi, cvtsSoir, cvts, cvtsCumul, budgetCA, ecart };
  }, [indices, computed]);

  // Colonne count
  const caColCount = expanded.ca ? 6 : 1;
  const cvtsColCount = expanded.couverts ? 5 : 1;
  const budgetColCount = expanded.budget ? 3 : 1;

  return (
    <div className="overflow-auto">
      <table className="border-separate border-spacing-0 text-sm">
        <thead>
          {/* Row 1 : groupes */}
          <tr>
            <th rowSpan={2} className={TH_CLS + ' text-left sticky left-0 bg-[#07111f] min-w-[110px]'}>Jour</th>
            <GroupTh label="CA HT" expanded={expanded.ca} onToggle={() => toggle('ca')} colSpan={caColCount} />
            <GroupTh label="Couverts" expanded={expanded.couverts} onToggle={() => toggle('couverts')} colSpan={cvtsColCount} />
            <GroupTh label="vs Budget" expanded={expanded.budget} onToggle={() => toggle('budget')} colSpan={budgetColCount} />
          </tr>
          {/* Row 2 : sous-colonnes */}
          <tr>
            {expanded.ca ? (
              <>
                <th className={TH_CLS}>VAE</th>
                <th className={TH_CLS}>Midi</th>
                <th className={TH_CLS}>Soir</th>
                <th className={TH_CLS}>Limo</th>
                <th className={TH_CLS}>Total HT</th>
                <th className={TH_CLS}>Cumul</th>
              </>
            ) : (
              <th className={TH_CLS}>Total HT</th>
            )}
            {expanded.couverts ? (
              <>
                <th className={TH_CLS}>Midi</th>
                <th className={TH_CLS}>Soir</th>
                <th className={TH_CLS}>Total</th>
                <th className={TH_CLS}>Moy</th>
                <th className={TH_CLS}>Cumul</th>
              </>
            ) : (
              <th className={TH_CLS}>Total</th>
            )}
            {expanded.budget ? (
              <>
                <th className={TH_CLS}>Écart €</th>
                <th className={TH_CLS}>% budget</th>
                <th className={TH_CLS}>Var % N-1</th>
              </>
            ) : (
              <th className={TH_CLS}>%</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            if (row.type === 'month_total' || row.type === 'fg_box4_total') return null;

            if (row.type === 'total' && row.weekIndex != null) {
              const w = weekTotals[row.weekIndex] || { vae: 0, caMidi: 0, caSoir: 0, caLimo: 0, caTotal: 0, cvtsMidi: 0, cvtsSoir: 0, cvts: 0, budgetCA: 0, ecart: 0 };
              const ecartPct = w.budgetCA > 0 ? (w.ecart / w.budgetCA) * 100 : null;
              const varPctN1 = null; // pas calculable au niveau semaine sans N-1 indexed
              return (
                <tr key={ri}>
                  <td className={TD_DAY_WEEK}>{row.label}</td>
                  {expanded.ca ? (
                    <>
                      <td className={TD_WEEK}>{w.vae > 0 ? formatEuro(w.vae) : '—'}</td>
                      <td className={TD_WEEK}>{w.caMidi > 0 ? formatEuro(w.caMidi) : '—'}</td>
                      <td className={TD_WEEK}>{w.caSoir > 0 ? formatEuro(w.caSoir) : '—'}</td>
                      <td className={TD_WEEK}>{w.caLimo > 0 ? formatEuro(w.caLimo) : '—'}</td>
                      <td className={TD_WEEK}>{w.caTotal > 0 ? formatEuro(w.caTotal) : '—'}</td>
                      <td className={TD_WEEK}>—</td>
                    </>
                  ) : (
                    <td className={TD_WEEK}>{w.caTotal > 0 ? formatEuro(w.caTotal) : '—'}</td>
                  )}
                  {expanded.couverts ? (
                    <>
                      <td className={TD_WEEK}>{w.cvtsMidi > 0 ? fmtNum(w.cvtsMidi) : '—'}</td>
                      <td className={TD_WEEK}>{w.cvtsSoir > 0 ? fmtNum(w.cvtsSoir) : '—'}</td>
                      <td className={TD_WEEK}>{w.cvts > 0 ? fmtNum(w.cvts) : '—'}</td>
                      <td className={TD_WEEK}>—</td>
                      <td className={TD_WEEK}>—</td>
                    </>
                  ) : (
                    <td className={TD_WEEK}>{w.cvts > 0 ? fmtNum(w.cvts) : '—'}</td>
                  )}
                  {expanded.budget ? (
                    <>
                      <td className={TD_WEEK}>{w.ecart !== 0 ? formatEuro(w.ecart) : '—'}</td>
                      <td className={TD_WEEK}><VarBadge pct={ecartPct} /></td>
                      <td className={TD_WEEK}><VarBadge pct={varPctN1} /></td>
                    </>
                  ) : (
                    <td className={TD_WEEK}><VarBadge pct={ecartPct} /></td>
                  )}
                </tr>
              );
            }

            if (row.type !== 'day' || row.dayIndex == null) return null;

            const rIdx = indices[row.dayIndex];
            const vae     = readComputed(computed, rIdx, 17);
            const caMidi  = readComputed(computed, rIdx, 18);
            const caSoir  = readComputed(computed, rIdx, 19);
            const caLimo  = readComputed(computed, rIdx, 20);
            const caTotal = readComputed(computed, rIdx, 21);
            const cumul   = readComputed(computed, rIdx, 23);
            const cvtsMidi = readComputed(computed, rIdx, 25);
            const cvtsSoir = readComputed(computed, rIdx, 27);
            const cvts    = readComputed(computed, rIdx, 29);
            const moyJour = readComputed(computed, rIdx, 30);
            const cvtsCumul = readComputed(computed, rIdx, 32);
            const budget  = readComputed(computed, rIdx, 3);
            const ecart   = readComputed(computed, rIdx, 22);
            const varN1   = readComputed(computed, rIdx, 24);
            const caN1    = readComputed(computedN1, rIdx, 21);

            const ecartPct = budget > 0 ? (ecart / budget) * 100 : null;
            const varN1Pct = caN1 > 0 ? ((caTotal - caN1) / caN1) * 100 : null;
            const isSaisi = caTotal > 0;
            const rowBg = !isSaisi ? 'bg-[rgba(251,191,36,0.04)]' : '';

            const rawVae  = rawDashboard[`${rIdx}-17`] ?? '';
            const rawMidi = rawDashboard[`${rIdx}-18`] ?? '';
            const rawSoir = rawDashboard[`${rIdx}-19`] ?? '';
            const rawLimo = rawDashboard[`${rIdx}-20`] ?? '';
            const rawCvtsMidi = rawDashboard[`${rIdx}-25`] ?? '';
            const rawCvtsSoir = rawDashboard[`${rIdx}-27`] ?? '';
            const cvtsSaisis = parseMoneyValue(rawCvtsMidi) + parseMoneyValue(rawCvtsSoir);

            return (
              <tr key={ri} className={rowBg}>
                <td className={TD_DAY + (row.isWeekend ? ' text-cyan-300/70' : '')}>
                  {row.isWeekend ? <span className="mr-1 text-cyan-400/50">◆</span> : null}
                  {row.label?.split(' ').slice(0, 2).join(' ')}
                </td>

                {/* CA group */}
                {expanded.ca ? (
                  <>
                    <td className={TD_CLS}><EditCell value={rawVae} cellKey={`${rIdx}-17`} month={month} onUpdate={updateDashboard} /></td>
                    <td className={TD_CLS}><EditCell value={rawMidi} cellKey={`${rIdx}-18`} month={month} onUpdate={updateDashboard} /></td>
                    <td className={TD_CLS}><EditCell value={rawSoir} cellKey={`${rIdx}-19`} month={month} onUpdate={updateDashboard} /></td>
                    <td className={TD_CLS}><EditCell value={rawLimo} cellKey={`${rIdx}-20`} month={month} onUpdate={updateDashboard} /></td>
                    <td className={TD_CLS + ' font-black text-amber-50'}>{caTotal > 0 ? formatEuro(caTotal) : <span className="text-cyan-100/20">—</span>}</td>
                    <td className={TD_CLS}>{cumul > 0 ? formatEuro(cumul) : '—'}</td>
                  </>
                ) : (
                  <td className={TD_CLS + ' font-black text-amber-50'}>
                    {caTotal > 0 ? formatEuro(caTotal) : <span className="text-cyan-100/20">—</span>}
                  </td>
                )}

                {/* Couverts group */}
                {expanded.couverts ? (
                  <>
                    <td className={TD_CLS}>
                      {cvtsSaisis > 0 ? fmtNum(cvtsMidi) : <EditCell value={rawCvtsMidi} cellKey={`${rIdx}-25`} month={month} onUpdate={updateDashboard} />}
                    </td>
                    <td className={TD_CLS}>
                      {cvtsSaisis > 0 ? fmtNum(cvtsSoir) : <EditCell value={rawCvtsSoir} cellKey={`${rIdx}-27`} month={month} onUpdate={updateDashboard} />}
                    </td>
                    <td className={TD_CLS}>{cvts > 0 ? fmtNum(cvts) : '—'}</td>
                    <td className={TD_CLS}>{moyJour > 0 ? formatEuro(moyJour) : '—'}</td>
                    <td className={TD_CLS}>{cvtsCumul > 0 ? fmtNum(cvtsCumul) : '—'}</td>
                  </>
                ) : (
                  <td className={TD_CLS}>
                    {cvtsSaisis > 0 ? fmtNum(cvts) : (
                      <div className="flex gap-1">
                        <EditCell value={rawCvtsMidi} cellKey={`${rIdx}-25`} month={month} onUpdate={updateDashboard} />
                        <span className="text-cyan-100/30">/</span>
                        <EditCell value={rawCvtsSoir} cellKey={`${rIdx}-27`} month={month} onUpdate={updateDashboard} />
                      </div>
                    )}
                  </td>
                )}

                {/* Budget group */}
                {expanded.budget ? (
                  <>
                    <td className={TD_CLS}>{ecart !== 0 ? formatEuro(ecart) : '—'}</td>
                    <td className={TD_CLS}><VarBadge pct={ecartPct} /></td>
                    <td className={TD_CLS}><VarBadge pct={varN1 !== 0 ? varN1 : varN1Pct} /></td>
                  </>
                ) : (
                  <td className={TD_CLS}><VarBadge pct={ecartPct} /></td>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className={TD_DAY_WEEK + ' text-amber-300'}>TOTAL MOIS</td>
            {expanded.ca ? (
              <>
                <td className={TD_WEEK}>{monthTotal.vae > 0 ? formatEuro(monthTotal.vae) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.caMidi > 0 ? formatEuro(monthTotal.caMidi) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.caSoir > 0 ? formatEuro(monthTotal.caSoir) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.caLimo > 0 ? formatEuro(monthTotal.caLimo) : '—'}</td>
                <td className={TD_WEEK + ' text-amber-50 font-black'}>{monthTotal.caTotal > 0 ? formatEuro(monthTotal.caTotal) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.cumul > 0 ? formatEuro(monthTotal.cumul) : '—'}</td>
              </>
            ) : (
              <td className={TD_WEEK + ' text-amber-50 font-black'}>{monthTotal.caTotal > 0 ? formatEuro(monthTotal.caTotal) : '—'}</td>
            )}
            {expanded.couverts ? (
              <>
                <td className={TD_WEEK}>{monthTotal.cvtsMidi > 0 ? fmtNum(monthTotal.cvtsMidi) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.cvtsSoir > 0 ? fmtNum(monthTotal.cvtsSoir) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.cvts > 0 ? fmtNum(monthTotal.cvts) : '—'}</td>
                <td className={TD_WEEK}>—</td>
                <td className={TD_WEEK}>{monthTotal.cvtsCumul > 0 ? fmtNum(monthTotal.cvtsCumul) : '—'}</td>
              </>
            ) : (
              <td className={TD_WEEK}>{monthTotal.cvts > 0 ? fmtNum(monthTotal.cvts) : '—'}</td>
            )}
            {expanded.budget ? (
              <>
                <td className={TD_WEEK}>{monthTotal.ecart !== 0 ? formatEuro(monthTotal.ecart) : '—'}</td>
                <td className={TD_WEEK}><VarBadge pct={monthTotal.budgetCA > 0 ? (monthTotal.ecart / monthTotal.budgetCA) * 100 : null} /></td>
                <td className={TD_WEEK}>—</td>
              </>
            ) : (
              <td className={TD_WEEK}>
                <VarBadge pct={monthTotal.budgetCA > 0 ? (monthTotal.ecart / monthTotal.budgetCA) * 100 : null} />
              </td>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
