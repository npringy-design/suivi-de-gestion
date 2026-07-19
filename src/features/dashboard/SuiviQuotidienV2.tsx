import { useState, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign } from 'lucide-react';

import { useData } from '@/contexts/DataContext';
import { MONTH_NAMES } from '@/lib/constants';
import { formatEuro } from '@/lib/formatters';
import { parseMoneyValue } from '@/lib/money';
import { getDashboardRowIndices } from '@/lib/utils';
import { buildMonthRows } from '@/features/dashboard/dashboardRows';
import { computeMonthDashboard, getCaRealiseMonth, getCaBudgetMonth } from '@/features/edg/edgRealtimeSources';

// ─── Types locaux ─────────────────────────────────────────────────────────────

type Props = {
  month: number;
  year: number;
  onBack: () => void;
};

type ActiveTab = 'ca' | 'achats' | 'personnel' | 'frais';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtPct = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
const fmtNum = (v: number) => Math.round(v).toLocaleString('fr-FR');

const readComputed = (computed: Record<string, string>, rIdx: number, col: number): number =>
  parseMoneyValue(computed[`${rIdx}-${col}`]);

// ─── Styles ───────────────────────────────────────────────────────────────────

const BG_PAGE = 'linear-gradient(135deg, #07111f 0%, #0a2430 50%, #073d43 100%)';
const CARD_CLS = 'overflow-hidden rounded-2xl border border-cyan-200/15 bg-[rgba(6,31,40,0.8)] shadow-lg';
const LABEL_CLS = 'text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/60';
const TH_CLS = 'sticky top-0 z-10 bg-[#07111f] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70 border-b border-cyan-200/10 whitespace-nowrap';
const TD_CLS = 'px-3 py-2 text-right text-xs font-semibold text-amber-50/90 border-b border-cyan-200/5';
const TD_DAY = 'px-3 py-2 text-left text-xs font-semibold text-amber-50/80 border-b border-cyan-200/5 sticky left-0 bg-[rgba(6,31,40,0.95)]';
const TD_WEEK = 'px-3 py-2 text-right text-xs font-black text-cyan-200 border-b border-cyan-200/15 bg-[rgba(6,31,40,0.6)]';
const TD_DAY_WEEK = 'px-3 py-2 text-left text-xs font-black text-cyan-200 border-b border-cyan-200/15 bg-[rgba(6,31,40,0.6)] sticky left-0';

// ─── Cellule éditable ─────────────────────────────────────────────────────────

function EditCell({
  value,
  cellKey,
  month,
  onUpdate,
  align = 'right',
}: {
  value: string;
  cellKey: string;
  month: number;
  onUpdate: (month: number, cellKey: string, value: string) => void;
  align?: 'right' | 'left';
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayed = draft !== null ? draft : (parseMoneyValue(value) > 0 ? fmtNum(parseMoneyValue(value)) : '');

  return (
    <input
      ref={inputRef}
      className={[
        'w-full min-w-[70px] bg-transparent text-xs font-semibold text-amber-50/90 outline-none',
        'border-b border-transparent focus:border-cyan-400/50',
        align === 'right' ? 'text-right' : 'text-left',
      ].join(' ')}
      value={displayed}
      placeholder="—"
      onChange={e => setDraft(e.target.value)}
      onFocus={() => {
        const num = parseMoneyValue(value);
        setDraft(num > 0 ? String(num) : '');
      }}
      onBlur={() => {
        const parsed = parseMoneyValue(draft ?? '');
        onUpdate(month, cellKey, parsed > 0 ? String(parsed) : '');
        setDraft(null);
      }}
      onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.blur(); }}
    />
  );
}

// ─── Badge variation ──────────────────────────────────────────────────────────

function VarBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-cyan-100/30 text-xs">—</span>;
  const pos = pct >= 0;
  return (
    <span className={[
      'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-black',
      pos ? 'bg-[rgba(52,211,153,0.18)] text-[#6ee7b7]' : 'bg-[rgba(248,113,113,0.2)] text-[#fca5a5]',
    ].join(' ')}>
      {pos ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {fmtPct(pct)}
    </span>
  );
}

// ─── Onglet CA et couverts ─────────────────────────────────────────────────────

function TabCA({
  month,
  year,
  computed,
  rawDashboard,
  updateDashboard,
}: {
  month: number;
  year: number;
  computed: Record<string, string>;
  rawDashboard: Record<string, string>;
  updateDashboard: (month: number, cellKey: string, value: string) => void;
}) {
  const rows = useMemo(() => buildMonthRows(year, month), [year, month]);
  const indices = useMemo(() => getDashboardRowIndices(month, year), [month, year]);

  const weekTotals = useMemo(() => {
    const totals: Record<number, { caMidi: number; caSoir: number; caLimo: number; caTotal: number; cvts: number; budgetCA: number }> = {};
    rows.forEach(row => {
      if (row.type === 'day' && row.dayIndex != null && row.weekIndex != null) {
        const rIdx = indices[row.dayIndex];
        const w = row.weekIndex;
        if (!totals[w]) totals[w] = { caMidi: 0, caSoir: 0, caLimo: 0, caTotal: 0, cvts: 0, budgetCA: 0 };
        totals[w].caMidi   += readComputed(computed, rIdx, 18);
        totals[w].caSoir   += readComputed(computed, rIdx, 19);
        totals[w].caLimo   += readComputed(computed, rIdx, 20);
        totals[w].caTotal  += readComputed(computed, rIdx, 21);
        totals[w].cvts     += readComputed(computed, rIdx, 29);
        totals[w].budgetCA += readComputed(computed, rIdx, 3);
      }
    });
    return totals;
  }, [rows, indices, computed]);

  const monthTotal = useMemo(() => {
    let caMidi = 0, caSoir = 0, caLimo = 0, caTotal = 0, cvts = 0, budgetCA = 0;
    Object.values(indices).forEach(rIdx => {
      caMidi   += readComputed(computed, rIdx, 18);
      caSoir   += readComputed(computed, rIdx, 19);
      caLimo   += readComputed(computed, rIdx, 20);
      caTotal  += readComputed(computed, rIdx, 21);
      cvts     += readComputed(computed, rIdx, 29);
      budgetCA += readComputed(computed, rIdx, 3);
    });
    return { caMidi, caSoir, caLimo, caTotal, cvts, budgetCA };
  }, [indices, computed]);

  return (
    <div className="overflow-auto">
      <table className="min-w-[700px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className={TH_CLS + ' text-left sticky left-0 bg-[#07111f] min-w-[120px]'}>Jour</th>
            <th className={TH_CLS}>CA Midi</th>
            <th className={TH_CLS}>CA Soir</th>
            <th className={TH_CLS}>CA Limo</th>
            <th className={TH_CLS}>Total HT</th>
            <th className={TH_CLS}>Couverts</th>
            <th className={TH_CLS}>vs Budget</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            if (row.type === 'month_total' || row.type === 'fg_box4_total') return null;

            if (row.type === 'total' && row.weekIndex != null) {
              const w = weekTotals[row.weekIndex] || { caMidi: 0, caSoir: 0, caLimo: 0, caTotal: 0, cvts: 0, budgetCA: 0 };
              const ecartPct = w.budgetCA > 0 ? ((w.caTotal - w.budgetCA) / w.budgetCA) * 100 : null;
              return (
                <tr key={ri}>
                  <td className={TD_DAY_WEEK}>{row.label}</td>
                  <td className={TD_WEEK}>{w.caMidi > 0 ? formatEuro(w.caMidi) : '—'}</td>
                  <td className={TD_WEEK}>{w.caSoir > 0 ? formatEuro(w.caSoir) : '—'}</td>
                  <td className={TD_WEEK}>{w.caLimo > 0 ? formatEuro(w.caLimo) : '—'}</td>
                  <td className={TD_WEEK}>{w.caTotal > 0 ? formatEuro(w.caTotal) : '—'}</td>
                  <td className={TD_WEEK}>{w.cvts > 0 ? fmtNum(w.cvts) : '—'}</td>
                  <td className={TD_WEEK}><VarBadge pct={ecartPct} /></td>
                </tr>
              );
            }

            if (row.type !== 'day' || row.dayIndex == null) return null;

            const rIdx = indices[row.dayIndex];
            const caTotal = readComputed(computed, rIdx, 21);
            const budget  = readComputed(computed, rIdx, 3);
            const ecartPct = caTotal > 0 && budget > 0 ? ((caTotal - budget) / budget) * 100 : null;
            const isSaisi = caTotal > 0;
            const rowBg = !isSaisi ? 'bg-[rgba(251,191,36,0.04)]' : '';

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
                <td className={TD_CLS}>
                  <EditCell value={rawMidi} cellKey={`${rIdx}-18`} month={month} onUpdate={updateDashboard} />
                </td>
                <td className={TD_CLS}>
                  <EditCell value={rawSoir} cellKey={`${rIdx}-19`} month={month} onUpdate={updateDashboard} />
                </td>
                <td className={TD_CLS}>
                  <EditCell value={rawLimo} cellKey={`${rIdx}-20`} month={month} onUpdate={updateDashboard} />
                </td>
                <td className={TD_CLS + ' font-black text-amber-50'}>
                  {caTotal > 0 ? formatEuro(caTotal) : <span className="text-cyan-100/20">—</span>}
                </td>
                <td className={TD_CLS}>
                  {cvtsSaisis > 0 ? fmtNum(cvtsSaisis) : (
                    <div className="flex gap-1">
                      <EditCell value={rawCvtsMidi} cellKey={`${rIdx}-25`} month={month} onUpdate={updateDashboard} />
                      <span className="text-cyan-100/30">/</span>
                      <EditCell value={rawCvtsSoir} cellKey={`${rIdx}-27`} month={month} onUpdate={updateDashboard} />
                    </div>
                  )}
                </td>
                <td className={TD_CLS}><VarBadge pct={ecartPct} /></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className={TD_DAY_WEEK + ' text-amber-300'}>TOTAL MOIS</td>
            <td className={TD_WEEK + ' text-amber-200'}>{monthTotal.caMidi > 0 ? formatEuro(monthTotal.caMidi) : '—'}</td>
            <td className={TD_WEEK + ' text-amber-200'}>{monthTotal.caSoir > 0 ? formatEuro(monthTotal.caSoir) : '—'}</td>
            <td className={TD_WEEK + ' text-amber-200'}>{monthTotal.caLimo > 0 ? formatEuro(monthTotal.caLimo) : '—'}</td>
            <td className={TD_WEEK + ' text-amber-50 font-black'}>{monthTotal.caTotal > 0 ? formatEuro(monthTotal.caTotal) : '—'}</td>
            <td className={TD_WEEK + ' text-amber-200'}>{monthTotal.cvts > 0 ? fmtNum(monthTotal.cvts) : '—'}</td>
            <td className={TD_WEEK}>
              <VarBadge pct={monthTotal.budgetCA > 0 ? ((monthTotal.caTotal - monthTotal.budgetCA) / monthTotal.budgetCA) * 100 : null} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Onglet Achats ─────────────────────────────────────────────────────────────

function TabAchats({
  month,
  year,
  rawDashboard,
  updateDashboard,
}: {
  month: number;
  year: number;
  rawDashboard: Record<string, string>;
  updateDashboard: (month: number, cellKey: string, value: string) => void;
}) {
  const { companySettings } = useData();
  const rows = useMemo(() => buildMonthRows(year, month), [year, month]);
  const indices = useMemo(() => getDashboardRowIndices(month, year), [month, year]);

  // Fournisseurs avec colonne de store daily (pas les FG qui ont un stockage différent)
  const sections = companySettings.purchaseSections.map(sec => ({
    ...sec,
    suppliers: sec.suppliers.filter(s => s.storeColumn !== null && s.storeColumn < 90),
  })).filter(sec => sec.suppliers.length > 0);

  const allSuppliers = sections.flatMap(s => s.suppliers);

  const cellKey = useCallback((rIdx: number, sup: { id: string; storeColumn: number | null }) =>
    sup.storeColumn !== null ? `${rIdx}-${sup.storeColumn}` : `xs_${sup.id}_${rIdx}`, []);

  return (
    <div className="overflow-auto">
      <table className="min-w-[600px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className={TH_CLS + ' text-left sticky left-0 bg-[#07111f] min-w-[120px]'}>Jour</th>
            {sections.map(sec => (
              <th
                key={sec.id}
                colSpan={sec.suppliers.length}
                className={TH_CLS + ' text-center border-l border-cyan-200/10'}
              >
                {sec.name}
              </th>
            ))}
            <th className={TH_CLS}>Total</th>
          </tr>
          <tr>
            <th className={TH_CLS + ' sticky left-0 bg-[#07111f]'} />
            {allSuppliers.map(sup => (
              <th key={sup.id} className={TH_CLS + ' text-[9px]'}>{sup.name}</th>
            ))}
            <th className={TH_CLS} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            if (row.type === 'month_total' || row.type === 'fg_box4_total') return null;

            if (row.type === 'total' && row.weekIndex != null) {
              const weekDays = rows.filter(r => r.type === 'day' && r.weekIndex === row.weekIndex && r.dayIndex != null);
              const weekSums = allSuppliers.map(sup => {
                return weekDays.reduce((sum, d) => {
                  const rIdx = d.dayIndex != null ? indices[d.dayIndex] : -1;
                  return sum + (rIdx >= 0 ? parseMoneyValue(rawDashboard[cellKey(rIdx, sup)] ?? '') : 0);
                }, 0);
              });
              const totalWeek = weekSums.reduce((a, b) => a + b, 0);
              return (
                <tr key={ri}>
                  <td className={TD_DAY_WEEK}>{row.label}</td>
                  {weekSums.map((v, i) => (
                    <td key={i} className={TD_WEEK}>{v > 0 ? formatEuro(v) : '—'}</td>
                  ))}
                  <td className={TD_WEEK + ' text-amber-200'}>{totalWeek > 0 ? formatEuro(totalWeek) : '—'}</td>
                </tr>
              );
            }

            if (row.type !== 'day' || row.dayIndex == null) return null;

            const rIdx = indices[row.dayIndex];
            const dayTotal = allSuppliers.reduce((sum, sup) =>
              sum + parseMoneyValue(rawDashboard[cellKey(rIdx, sup)] ?? ''), 0);

            return (
              <tr key={ri}>
                <td className={TD_DAY + (row.isWeekend ? ' text-cyan-300/70' : '')}>
                  {row.label?.split(' ').slice(0, 2).join(' ')}
                </td>
                {allSuppliers.map(sup => (
                  <td key={sup.id} className={TD_CLS}>
                    <EditCell
                      value={rawDashboard[cellKey(rIdx, sup)] ?? ''}
                      cellKey={cellKey(rIdx, sup)}
                      month={month}
                      onUpdate={updateDashboard}
                    />
                  </td>
                ))}
                <td className={TD_CLS + ' font-black text-amber-50'}>
                  {dayTotal > 0 ? formatEuro(dayTotal) : <span className="text-cyan-100/20">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className={TD_DAY_WEEK + ' text-amber-300'}>TOTAL MOIS</td>
            {allSuppliers.map(sup => {
              const total = Object.values(indices).reduce((sum, rIdx) =>
                sum + parseMoneyValue(rawDashboard[cellKey(rIdx, sup)] ?? ''), 0);
              return <td key={sup.id} className={TD_WEEK}>{total > 0 ? formatEuro(total) : '—'}</td>;
            })}
            <td className={TD_WEEK + ' text-amber-200 font-black'}>
              {formatEuro(Object.values(indices).reduce((sum, rIdx) =>
                sum + allSuppliers.reduce((s, sup) => s + parseMoneyValue(rawDashboard[cellKey(rIdx, sup)] ?? ''), 0), 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Onglets Personnel + Frais (lecture seule) ────────────────────────────────

function TabPersonnel({ computed, month, year }: { computed: Record<string, string>; month: number; year: number }) {
  const indices = useMemo(() => getDashboardRowIndices(month, year), [month, year]);
  const totalHeures = Object.values(indices).reduce((s, r) => s + parseMoneyValue(computed[`${r}-76`]), 0);
  const totalCout = Object.values(indices).reduce((s, r) => s + parseMoneyValue(computed[`${r}-87`]), 0);
  const ca = Object.values(indices).reduce((s, r) => s + parseMoneyValue(computed[`${r}-21`]), 0);
  const fraisPersoRatio = ca > 0 ? (totalCout / ca) * 100 : 0;

  return (
    <div className="p-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Heures totales travaillées', value: totalHeures > 0 ? totalHeures.toFixed(2) + ' h' : '—' },
          { label: 'Coût global S/C', value: totalCout > 0 ? formatEuro(totalCout) : '—' },
          { label: 'Frais personnel %', value: fraisPersoRatio > 0 ? fraisPersoRatio.toFixed(1) + ' %' : '—' },
          { label: 'CA réalisé mois', value: ca > 0 ? formatEuro(ca) : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-cyan-200/10 bg-[rgba(6,31,40,0.5)] p-4">
            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/60">{label}</div>
            <div className="text-2xl font-black text-amber-50">{value}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-cyan-100/40">Édition disponible dans le Suivi Quotidien existant (onglet Vue complète).</p>
    </div>
  );
}

function TabFrais({ computed }: { computed: Record<string, string> }) {
  const allKeys = Object.keys(computed);
  const sumCol = useCallback((col: number) =>
    allKeys.reduce((s, k) => {
      if (k.endsWith(`-${col}`) && /^\d+-\d+$/.test(k)) return s + parseMoneyValue(computed[k]);
      return s;
    }, 0), [allKeys, computed]);

  return (
    <div className="p-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Entretien et réparation', value: sumCol(97) },
          { label: 'Ecolab / Diversey', value: sumCol(101) },
          { label: 'Marketing local', value: sumCol(105) },
          { label: 'Contrats mensualisés', value: sumCol(107) },
          { label: 'Total Frais Généraux', value: sumCol(97) + sumCol(101) + sumCol(105) + sumCol(107) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-cyan-200/10 bg-[rgba(6,31,40,0.5)] p-4">
            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/60">{label}</div>
            <div className="text-2xl font-black text-amber-50">{value > 0 ? formatEuro(value) : '—'}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-cyan-100/40">Édition disponible dans le Suivi Quotidien existant (onglet Vue complète).</p>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function SuiviQuotidienV2({ month, year: _year, onBack }: Props) {
  const { data, allData, updateDashboard, companySettings, selectedYear } = useData();
  const [activeMonth, setActiveMonth] = useState(month);
  const [activeTab, setActiveTab] = useState<ActiveTab>('ca');
  const YEAR = selectedYear;

  const monthData = data[activeMonth];
  const rawDashboard = monthData?.dashboard ?? {};

  const computed = useMemo(
    () => computeMonthDashboard(monthData, activeMonth, YEAR),
    [monthData, activeMonth, YEAR],
  );

  // N-1 : même mois l'année précédente
  const lastYearMonthData = allData[YEAR - 1]?.[activeMonth];
  const computedN1 = useMemo(
    () => computeMonthDashboard(lastYearMonthData, activeMonth, YEAR - 1),
    [lastYearMonthData, activeMonth, YEAR],
  );

  const indices = useMemo(() => getDashboardRowIndices(activeMonth, YEAR), [activeMonth, YEAR]);
  const dayNumbers = Object.keys(indices).map(Number);

  // Jours saisis = au moins un CA réalisé > 0 (col 21 calculée)
  const nbJoursSaisis = dayNumbers.filter(d => readComputed(computed, indices[d], 21) > 0).length;
  const nbJoursTotal = dayNumbers.length;

  // KPIs
  const caCumul = getCaRealiseMonth(computed, activeMonth, YEAR);
  const caCumulN1 = getCaRealiseMonth(computedN1, activeMonth, YEAR - 1);
  const caN1Pct = caCumulN1 > 0 ? ((caCumul - caCumulN1) / caCumulN1) * 100 : null;

  const cvtsCumul = Object.values(indices).reduce((s, r) => s + readComputed(computed, r, 29), 0);
  const cvtsCumulN1 = Object.values(indices).reduce((s, r) => s + readComputed(computedN1, r, 29), 0);
  const cvtsN1Pct = cvtsCumulN1 > 0 ? ((cvtsCumul - cvtsCumulN1) / cvtsCumulN1) * 100 : null;

  const ticketMoyen = cvtsCumul > 0 ? caCumul / cvtsCumul : 0;
  const budgetTotal = getCaBudgetMonth(computed, activeMonth, YEAR);
  const ecartBudget = caCumul - budgetTotal;

  const kpis = [
    {
      label: 'CA cumulé',
      value: caCumul > 0 ? formatEuro(caCumul) : '—',
      icon: DollarSign,
      badge: caN1Pct,
      badgeLabel: 'vs N-1',
    },
    {
      label: 'Couverts cumulés',
      value: cvtsCumul > 0 ? fmtNum(cvtsCumul) : '—',
      icon: Users,
      badge: cvtsN1Pct,
      badgeLabel: 'vs N-1',
    },
    {
      label: 'Ticket moyen',
      value: ticketMoyen > 0 ? formatEuro(ticketMoyen) : '—',
      icon: TrendingUp,
      badge: null,
      badgeLabel: '',
    },
    {
      label: 'Écart budget cumulé',
      value: budgetTotal > 0 ? formatEuro(ecartBudget) : '—',
      icon: ShoppingCart,
      badge: budgetTotal > 0 ? ((ecartBudget / budgetTotal) * 100) : null,
      badgeLabel: '%',
    },
  ];

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'ca', label: 'CA et couverts' },
    { key: 'achats', label: 'Achats' },
    { key: 'personnel', label: 'Personnel' },
    { key: 'frais', label: 'Frais' },
  ];

  const monthLabel = MONTH_NAMES[activeMonth] + ' ' + YEAR;

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: BG_PAGE }}>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5">

        {/* Header */}
        <header className="overflow-hidden rounded-3xl border border-cyan-200/15 bg-[rgba(6,31,40,0.8)] p-5 shadow-xl">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-50 ring-1 ring-white/15 transition hover:bg-white/20"
              aria-label="Retour accueil"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/60">
                {companySettings.enseigne} — {companySettings.localisation}
              </div>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-amber-50">
                Suivi quotidien — {monthLabel}
              </h1>
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

        {/* Barre de progression */}
        <div className="rounded-2xl border border-cyan-200/15 bg-[rgba(6,31,40,0.8)] px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-black text-amber-50">
              {nbJoursSaisis} jour{nbJoursSaisis > 1 ? 's' : ''} saisi{nbJoursSaisis > 1 ? 's' : ''} sur {nbJoursTotal}
            </span>
            <span className="text-xs font-semibold text-cyan-100/60">
              {nbJoursTotal > 0 ? Math.round((nbJoursSaisis / nbJoursTotal) * 100) : 0} %
            </span>
          </div>
          <div className="h-2 rounded-full bg-cyan-100/10">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-[#078892] to-[#0f5d66] transition-all"
              style={{ width: nbJoursTotal > 0 ? `${(nbJoursSaisis / nbJoursTotal) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* 4 KPI cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, badge }) => (
            <div key={label} className={CARD_CLS + ' p-4'}>
              <div className="mb-2 flex items-center justify-between">
                <span className={LABEL_CLS}>{label}</span>
                <Icon className="h-4 w-4 text-cyan-300/60" />
              </div>
              <div className="text-2xl font-black text-amber-50">{value}</div>
              {badge !== null && <div className="mt-1.5"><VarBadge pct={badge} /></div>}
            </div>
          ))}
        </div>

        {/* Tableau avec onglets */}
        <div className={CARD_CLS}>
          {/* Onglets */}
          <div className="flex border-b border-cyan-200/10 px-5">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={[
                  'px-4 py-3.5 text-xs font-black tracking-wider transition',
                  activeTab === key
                    ? 'border-b-2 border-amber-400 text-amber-300'
                    : 'text-cyan-100/50 hover:text-cyan-100/80',
                ].join(' ')}
              >
                {label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Contenu onglet */}
          {activeTab === 'ca' && (
            <TabCA
              month={activeMonth}
              year={YEAR}
              computed={computed}
              rawDashboard={rawDashboard}
              updateDashboard={updateDashboard}
            />
          )}
          {activeTab === 'achats' && (
            <TabAchats
              month={activeMonth}
              year={YEAR}
              rawDashboard={rawDashboard}
              updateDashboard={updateDashboard}
            />
          )}
          {activeTab === 'personnel' && (
            <TabPersonnel computed={computed} month={activeMonth} year={YEAR} />
          )}
          {activeTab === 'frais' && (
            <TabFrais computed={computed} />
          )}
        </div>

      </div>
    </div>
  );
}
