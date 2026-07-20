import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

import { formatEuro } from '@/lib/formatters';
import { parseMoneyValue } from '@/lib/money';
import { getDashboardRowIndices } from '@/lib/utils';
import { buildMonthRows } from '@/features/dashboard/dashboardRows';
import { EditCell, VarBadge, TH_CLS, TD_CLS, TD_DAY, TD_WEEK, TD_DAY_WEEK, readComputed, fmtNum } from './SuiviV2Shared';

type ColPrefs = { ca: boolean; couverts: boolean };

const STORAGE_KEY = 'sqv2_col_prefs';

function loadPrefs(): ColPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ColPrefs) : { ca: false, couverts: false };
  } catch {
    return { ca: false, couverts: false };
  }
}

function savePrefs(p: ColPrefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

function GroupTh({ label, expanded, onToggle, colSpan }: {
  label: string; expanded: boolean; onToggle: () => void; colSpan: number;
}) {
  return (
    <th colSpan={colSpan} className={TH_CLS + ' text-center border-l border-slate-200'}>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 hover:text-teal-600 transition-colors"
      >
        {label}
        {expanded
          ? <ChevronDown className="h-3 w-3" style={{ color: '#0d9488' }} />
          : <ChevronRight className="h-3 w-3" style={{ color: '#94a3b8' }} />}
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
  const [prefs, setPrefs] = useState<ColPrefs>(loadPrefs);

  const toggle = (g: keyof ColPrefs) => {
    const next = { ...prefs, [g]: !prefs[g] };
    setPrefs(next);
    savePrefs(next);
  };

  const rows = useMemo(() => buildMonthRows(year, month), [year, month]);
  const indices = useMemo(() => getDashboardRowIndices(month, year), [month, year]);

  // Totaux semaine
  const weekTotals = useMemo(() => {
    const totals: Record<number, { vae: number; caMidi: number; caSoir: number; caLimo: number; caTotal: number; cvtsMidi: number; cvtsSoir: number; cvts: number; ecart: number }> = {};
    rows.forEach(row => {
      if (row.type === 'day' && row.dayIndex != null && row.weekIndex != null) {
        const rIdx = indices[row.dayIndex];
        const w = row.weekIndex;
        if (!totals[w]) totals[w] = { vae: 0, caMidi: 0, caSoir: 0, caLimo: 0, caTotal: 0, cvtsMidi: 0, cvtsSoir: 0, cvts: 0, ecart: 0 };
        totals[w].vae      += readComputed(computed, rIdx, 17);
        totals[w].caMidi   += readComputed(computed, rIdx, 18);
        totals[w].caSoir   += readComputed(computed, rIdx, 19);
        totals[w].caLimo   += readComputed(computed, rIdx, 20);
        totals[w].caTotal  += readComputed(computed, rIdx, 21);
        totals[w].cvtsMidi += readComputed(computed, rIdx, 25);
        totals[w].cvtsSoir += readComputed(computed, rIdx, 27);
        totals[w].cvts     += readComputed(computed, rIdx, 29);
        totals[w].ecart    += readComputed(computed, rIdx, 22);
      }
    });
    return totals;
  }, [rows, indices, computed]);

  // Totaux mois
  const monthTotal = useMemo(() => {
    let vae = 0, caMidi = 0, caSoir = 0, caLimo = 0, caTotal = 0, cumul = 0;
    let cvtsMidi = 0, cvtsSoir = 0, cvts = 0, cvtsCumul = 0, ecart = 0;
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
      ecart    += readComputed(computed, rIdx, 22);
    });
    return { vae, caMidi, caSoir, caLimo, caTotal, cumul, cvtsMidi, cvtsSoir, cvts, cvtsCumul, ecart };
  }, [indices, computed]);

  // CA: réduit=2 cols (Midi+Soir), développé=7 cols (Midi/Soir/Limo/VAE/Total/Cumul/Écart€)
  const caColCount = prefs.ca ? 7 : 2;
  // Couverts: réduit=2 cols (Total+MoyHT), développé=7 cols
  const cvtsColCount = prefs.couverts ? 7 : 2;

  return (
    <div className="overflow-auto">
      <table className="border-separate border-spacing-0 text-sm">
        <thead>
          {/* Row 1 : groupes */}
          <tr>
            <th rowSpan={2} className={TH_CLS + ' text-left sticky left-0 bg-white min-w-[110px]'}>Jour</th>
            <GroupTh label="CA HT" expanded={prefs.ca} onToggle={() => toggle('ca')} colSpan={caColCount} />
            <GroupTh label="Couverts" expanded={prefs.couverts} onToggle={() => toggle('couverts')} colSpan={cvtsColCount} />
          </tr>
          {/* Row 2 : sous-colonnes */}
          <tr>
            {prefs.ca ? (
              <>
                <th className={TH_CLS}>Midi</th>
                <th className={TH_CLS}>Soir</th>
                <th className={TH_CLS}>Limo</th>
                <th className={TH_CLS}>VAE</th>
                <th className={TH_CLS}>Total HT</th>
                <th className={TH_CLS}>Cumul</th>
                <th className={TH_CLS}>Écart €</th>
              </>
            ) : (
              <>
                <th className={TH_CLS}>Midi</th>
                <th className={TH_CLS}>Soir</th>
              </>
            )}
            {prefs.couverts ? (
              <>
                <th className={TH_CLS}>Midi nb</th>
                <th className={TH_CLS}>Midi moy</th>
                <th className={TH_CLS}>Soir nb</th>
                <th className={TH_CLS}>Soir moy</th>
                <th className={TH_CLS}>Total</th>
                <th className={TH_CLS}>Moy.jour</th>
                <th className={TH_CLS}>Cumul</th>
              </>
            ) : (
              <>
                <th className={TH_CLS}>Total</th>
                <th className={TH_CLS}>Moy. HT</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            if (row.type === 'month_total' || row.type === 'fg_box4_total') return null;

            if (row.type === 'total' && row.weekIndex != null) {
              const w = weekTotals[row.weekIndex] || { vae: 0, caMidi: 0, caSoir: 0, caLimo: 0, caTotal: 0, cvtsMidi: 0, cvtsSoir: 0, cvts: 0, ecart: 0 };
              const wMoyHT = w.cvts > 0 ? w.caTotal / w.cvts : 0;
              const wMidiMoy = w.cvtsMidi > 0 ? w.caMidi / w.cvtsMidi : 0;
              const wSoirMoy = w.cvtsSoir > 0 ? w.caSoir / w.cvtsSoir : 0;
              return (
                <tr key={ri}>
                  <td className={TD_DAY_WEEK}>{row.label}</td>
                  {prefs.ca ? (
                    <>
                      <td className={TD_WEEK}>{w.caMidi > 0 ? formatEuro(w.caMidi) : '—'}</td>
                      <td className={TD_WEEK}>{w.caSoir > 0 ? formatEuro(w.caSoir) : '—'}</td>
                      <td className={TD_WEEK}>{w.caLimo > 0 ? formatEuro(w.caLimo) : '—'}</td>
                      <td className={TD_WEEK}>{w.vae > 0 ? formatEuro(w.vae) : '—'}</td>
                      <td className={TD_WEEK}>{w.caTotal > 0 ? formatEuro(w.caTotal) : '—'}</td>
                      <td className={TD_WEEK}>—</td>
                      <td className={TD_WEEK}>{w.ecart !== 0 ? formatEuro(w.ecart) : '—'}</td>
                    </>
                  ) : (
                    <>
                      <td className={TD_WEEK}>{w.caMidi > 0 ? formatEuro(w.caMidi) : '—'}</td>
                      <td className={TD_WEEK}>{w.caSoir > 0 ? formatEuro(w.caSoir) : '—'}</td>
                    </>
                  )}
                  {prefs.couverts ? (
                    <>
                      <td className={TD_WEEK}>{w.cvtsMidi > 0 ? fmtNum(w.cvtsMidi) : '—'}</td>
                      <td className={TD_WEEK}>{wMidiMoy > 0 ? formatEuro(wMidiMoy) : '—'}</td>
                      <td className={TD_WEEK}>{w.cvtsSoir > 0 ? fmtNum(w.cvtsSoir) : '—'}</td>
                      <td className={TD_WEEK}>{wSoirMoy > 0 ? formatEuro(wSoirMoy) : '—'}</td>
                      <td className={TD_WEEK}>{w.cvts > 0 ? fmtNum(w.cvts) : '—'}</td>
                      <td className={TD_WEEK}>—</td>
                      <td className={TD_WEEK}>—</td>
                    </>
                  ) : (
                    <>
                      <td className={TD_WEEK}>{w.cvts > 0 ? fmtNum(w.cvts) : '—'}</td>
                      <td className={TD_WEEK}>{wMoyHT > 0 ? formatEuro(wMoyHT) : '—'}</td>
                    </>
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
            const ecart   = readComputed(computed, rIdx, 22);

            const moyHT = cvts > 0 ? caTotal / cvts : 0;
            const midiMoy = cvtsMidi > 0 ? caMidi / cvtsMidi : 0;
            const soirMoy = cvtsSoir > 0 ? caSoir / cvtsSoir : 0;

            const isSaisi = caTotal > 0;
            const rowBg = !isSaisi ? 'bg-amber-50/30' : '';

            const rawVae  = rawDashboard[`${rIdx}-17`] ?? '';
            const rawMidi = rawDashboard[`${rIdx}-18`] ?? '';
            const rawSoir = rawDashboard[`${rIdx}-19`] ?? '';
            const rawLimo = rawDashboard[`${rIdx}-20`] ?? '';
            const rawCvtsMidi = rawDashboard[`${rIdx}-25`] ?? '';
            const rawCvtsSoir = rawDashboard[`${rIdx}-27`] ?? '';
            const cvtsSaisis = parseMoneyValue(rawCvtsMidi) + parseMoneyValue(rawCvtsSoir);

            void computedN1; // utilisé dans les calculs N-1 du groupe Budget (supprimé)

            return (
              <tr key={ri} className={rowBg}>
                <td className={TD_DAY + (row.isWeekend ? ' text-teal-600/70' : '')}>
                  {row.isWeekend ? <span className="mr-1 text-teal-400/50">◆</span> : null}
                  {row.label?.split(' ').slice(0, 2).join(' ')}
                </td>

                {/* CA group */}
                {prefs.ca ? (
                  <>
                    <td className={TD_CLS}><EditCell value={rawMidi} cellKey={`${rIdx}-18`} month={month} onUpdate={updateDashboard} /></td>
                    <td className={TD_CLS}><EditCell value={rawSoir} cellKey={`${rIdx}-19`} month={month} onUpdate={updateDashboard} /></td>
                    <td className={TD_CLS}><EditCell value={rawLimo} cellKey={`${rIdx}-20`} month={month} onUpdate={updateDashboard} /></td>
                    <td className={TD_CLS}><EditCell value={rawVae} cellKey={`${rIdx}-17`} month={month} onUpdate={updateDashboard} /></td>
                    <td className={TD_CLS + ' font-black text-slate-900'}>{caTotal > 0 ? formatEuro(caTotal) : <span className="text-slate-300">—</span>}</td>
                    <td className={TD_CLS}>{cumul > 0 ? formatEuro(cumul) : '—'}</td>
                    <td className={TD_CLS}>{ecart !== 0 ? formatEuro(ecart) : '—'}</td>
                  </>
                ) : (
                  <>
                    <td className={TD_CLS}><EditCell value={rawMidi} cellKey={`${rIdx}-18`} month={month} onUpdate={updateDashboard} /></td>
                    <td className={TD_CLS}><EditCell value={rawSoir} cellKey={`${rIdx}-19`} month={month} onUpdate={updateDashboard} /></td>
                  </>
                )}

                {/* Couverts group */}
                {prefs.couverts ? (
                  <>
                    <td className={TD_CLS}>
                      {cvtsSaisis > 0 ? fmtNum(cvtsMidi) : <EditCell value={rawCvtsMidi} cellKey={`${rIdx}-25`} month={month} onUpdate={updateDashboard} />}
                    </td>
                    <td className={TD_CLS}>{midiMoy > 0 ? formatEuro(midiMoy) : '—'}</td>
                    <td className={TD_CLS}>
                      {cvtsSaisis > 0 ? fmtNum(cvtsSoir) : <EditCell value={rawCvtsSoir} cellKey={`${rIdx}-27`} month={month} onUpdate={updateDashboard} />}
                    </td>
                    <td className={TD_CLS}>{soirMoy > 0 ? formatEuro(soirMoy) : '—'}</td>
                    <td className={TD_CLS}>{cvts > 0 ? fmtNum(cvts) : '—'}</td>
                    <td className={TD_CLS}>{moyJour > 0 ? formatEuro(moyJour) : '—'}</td>
                    <td className={TD_CLS}>{cvtsCumul > 0 ? fmtNum(cvtsCumul) : '—'}</td>
                  </>
                ) : (
                  <>
                    <td className={TD_CLS}>
                      {cvtsSaisis > 0 ? fmtNum(cvts) : (
                        <div className="flex gap-1">
                          <EditCell value={rawCvtsMidi} cellKey={`${rIdx}-25`} month={month} onUpdate={updateDashboard} />
                          <span className="text-slate-300">/</span>
                          <EditCell value={rawCvtsSoir} cellKey={`${rIdx}-27`} month={month} onUpdate={updateDashboard} />
                        </div>
                      )}
                    </td>
                    <td className={TD_CLS}>{moyHT > 0 ? formatEuro(moyHT) : '—'}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className={TD_DAY_WEEK + ' text-teal-800 font-black'}>TOTAL MOIS</td>
            {prefs.ca ? (
              <>
                <td className={TD_WEEK}>{monthTotal.caMidi > 0 ? formatEuro(monthTotal.caMidi) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.caSoir > 0 ? formatEuro(monthTotal.caSoir) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.caLimo > 0 ? formatEuro(monthTotal.caLimo) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.vae > 0 ? formatEuro(monthTotal.vae) : '—'}</td>
                <td className={TD_WEEK + ' font-black text-slate-900'}>{monthTotal.caTotal > 0 ? formatEuro(monthTotal.caTotal) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.cumul > 0 ? formatEuro(monthTotal.cumul) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.ecart !== 0 ? formatEuro(monthTotal.ecart) : '—'}</td>
              </>
            ) : (
              <>
                <td className={TD_WEEK}>{monthTotal.caMidi > 0 ? formatEuro(monthTotal.caMidi) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.caSoir > 0 ? formatEuro(monthTotal.caSoir) : '—'}</td>
              </>
            )}
            {prefs.couverts ? (
              <>
                <td className={TD_WEEK}>{monthTotal.cvtsMidi > 0 ? fmtNum(monthTotal.cvtsMidi) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.cvtsMidi > 0 && monthTotal.caMidi > 0 ? formatEuro(monthTotal.caMidi / monthTotal.cvtsMidi) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.cvtsSoir > 0 ? fmtNum(monthTotal.cvtsSoir) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.cvtsSoir > 0 && monthTotal.caSoir > 0 ? formatEuro(monthTotal.caSoir / monthTotal.cvtsSoir) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.cvts > 0 ? fmtNum(monthTotal.cvts) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.cvts > 0 && monthTotal.caTotal > 0 ? formatEuro(monthTotal.caTotal / monthTotal.cvts) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.cvtsCumul > 0 ? fmtNum(monthTotal.cvtsCumul) : '—'}</td>
              </>
            ) : (
              <>
                <td className={TD_WEEK}>{monthTotal.cvts > 0 ? fmtNum(monthTotal.cvts) : '—'}</td>
                <td className={TD_WEEK}>{monthTotal.cvts > 0 && monthTotal.caTotal > 0 ? formatEuro(monthTotal.caTotal / monthTotal.cvts) : '—'}</td>
              </>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
