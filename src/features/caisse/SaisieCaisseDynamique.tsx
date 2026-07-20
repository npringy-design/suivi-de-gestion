import { useState, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft, CreditCard, Smartphone, Wallet, Banknote, ShoppingBag, Store, Package,
  FileText, Receipt, Coins, Building2, Truck, UtensilsCrossed, Coffee, Wine, Star,
  Tag, Zap, Clock, BarChart2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

const BG_PAGE = '#f8fafc';
const TH = 'sticky top-0 z-10 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 border-b border-slate-200 whitespace-nowrap';
const TD = 'px-4 py-2 text-sm text-slate-700 border-b border-slate-100';
const TD_DAY = TD + ' font-semibold text-slate-800 sticky left-0 bg-white';
const TD_TOTAL = 'px-4 py-2.5 text-sm font-black border-t border-slate-200 bg-slate-50';

const ICON_MAP: Record<string, LucideIcon> = {
  CreditCard, Smartphone, Wallet, Banknote, ShoppingBag, Store, Package, FileText,
  Receipt, Coins, Building2, Truck, UtensilsCrossed, Coffee, Wine, Star, Tag, Zap,
  Clock, BarChart2,
};

function SysIcon({ name, cls }: { name: string; cls?: string }) {
  const Icon = ICON_MAP[name] ?? CreditCard;
  return <Icon className={cls ?? 'h-5 w-5'} />;
}

function EditCell({ value, onCommit, placeholder }: { value: string; onCommit: (v: string) => void; placeholder?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const num = parseMoneyValue(value);

  return (
    <input
      ref={inputRef}
      className="w-full bg-transparent text-sm text-slate-800 outline-none border-b border-transparent focus:border-teal-500/60 text-right"
      value={draft !== null ? draft : (num > 0 ? num.toLocaleString('fr-FR') : '')}
      placeholder={placeholder ?? '—'}
      onChange={e => setDraft(e.target.value)}
      onFocus={() => { setDraft(num > 0 ? String(num) : ''); }}
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
  const accentColor = sys?.accentColor ?? '#0d9488';
  const isReconciliation = sys?.inputType === 'reconciliation';
  const columns = sys?.columns ?? [];

  const monthData = data[activeMonth];
  const rawCaisse: Record<string, string> = monthData?.caisseDynamique ?? {};

  const getRaw = useCallback((day: number, field: string) =>
    rawCaisse[`${systemId}:${day}:${field}`] ?? '', [rawCaisse, systemId]);

  const setRaw = useCallback((day: number, field: string, value: string) => {
    (updateCaisseDynamique as (m: number, s: string, d: number, f: string, v: string) => void)(
      activeMonth, systemId, day, field, value,
    );
  }, [activeMonth, systemId, updateCaisseDynamique]);

  const rows = useMemo(() => buildMonthRows(year, activeMonth), [year, activeMonth]);
  const dayRows = rows.filter(r => r.type === 'day' && r.dayIndex != null);

  // Colonnes "saisie" pour le calcul des colonnes "calcule"
  const saisieCols = columns.filter(c => c.type === 'saisie');

  const calcEcart = useCallback((day: number): number => {
    if (saisieCols.length < 2) return 0;
    return parseMoneyValue(getRaw(day, saisieCols[0].id)) - parseMoneyValue(getRaw(day, saisieCols[1].id));
  }, [saisieCols, getRaw]);

  // KPIs
  const { totalMontant, joursRenseignes } = useMemo(() => {
    let total = 0;
    let jours = 0;
    for (const r of dayRows) {
      const day = r.dayIndex! + 1;
      let val = 0;
      if (isReconciliation) {
        val = saisieCols.length > 0 ? parseMoneyValue(getRaw(day, saisieCols[0].id)) : 0;
      } else {
        val = parseMoneyValue(getRaw(day, 'montant'));
      }
      if (val > 0) { total += val; jours++; }
    }
    return { totalMontant: total, joursRenseignes: jours };
  }, [dayRows, isReconciliation, saisieCols, getRaw]);

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: BG_PAGE }}>
      <div className="mx-auto flex max-w-[900px] flex-col gap-5">

        {/* Header */}
        <header className="overflow-hidden rounded-3xl border border-cyan-200/15 bg-[rgba(6,31,40,0.9)] p-5 shadow-xl">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-50 ring-1 ring-white/15 transition hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            {/* Icône système */}
            <div
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: accentColor + '33', color: accentColor }}
            >
              <SysIcon name={sys?.icon ?? 'CreditCard'} cls="h-5 w-5" />
            </div>

            <div className="flex-1">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/60">Saisie mensuelle</div>
              <h1 className="mt-0.5 text-2xl font-black tracking-tight text-amber-50">{systemName}</h1>
              {sys?.description && <div className="mt-0.5 text-xs text-cyan-100/50">{sys.description}</div>}
            </div>

            {/* Total en-tête */}
            <div className="shrink-0 text-right">
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-100/50">Total ce mois</div>
              <div className="mt-0.5 text-xl font-black" style={{ color: accentColor }}>
                {totalMontant > 0 ? formatEuro(totalMontant) : '—'}
              </div>
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
                    ? 'text-white shadow-md'
                    : 'border border-cyan-200/15 text-cyan-100/60 hover:border-cyan-200/30 hover:text-cyan-100',
                ].join(' ')}
                style={activeMonth === i ? { background: accentColor } : {}}
              >
                {m.slice(0, 4).toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Total ce mois',
              value: totalMontant > 0 ? formatEuro(totalMontant) : '—',
              color: accentColor,
            },
            {
              label: 'Jours renseignés',
              value: (
                <span>
                  {joursRenseignes}
                  <span className="ml-1 text-sm font-semibold text-slate-400">/ {dayRows.length}</span>
                </span>
              ),
              color: '#0f172a',
            },
            {
              label: 'Moy. / jour',
              value: joursRenseignes > 0 ? formatEuro(totalMontant / joursRenseignes) : '—',
              color: '#0f172a',
            },
          ].map((kpi, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{kpi.label}</div>
              <div className="mt-1 text-xl font-black" style={{ color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Tableau */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-auto">
            {isReconciliation ? (
              /* Mode Rapprochement */
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className={TH + ' text-left sticky left-0 bg-white'} style={{ minWidth: 110 }}>Date</th>
                    {columns.map(col => (
                      <th key={col.id} className={TH + ' text-right'} style={{ minWidth: 130 }}>
                        <span>{col.name}</span>
                        {col.type === 'calcule' && (
                          <span className="ml-1 rounded bg-violet-100 px-1 text-[8px] font-black text-violet-500">calc.</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dayRows.map((row, ri) => {
                    const day = row.dayIndex! + 1;
                    const ecart = calcEcart(day);

                    return (
                      <tr key={ri}>
                        <td className={TD_DAY + (row.isWeekend ? ' text-cyan-300/70' : '')}>
                          {row.label?.split(' ').slice(0, 2).join(' ')}
                        </td>
                        {columns.map(col => {
                          if (col.type === 'calcule') {
                            return (
                              <td key={col.id} className={TD + ' text-right bg-white'}>
                                <span className="text-sm font-semibold text-slate-600">
                                  {ecart !== 0 ? (
                                    <span style={{ color: ecart >= 0 ? '#059669' : '#dc2626' }}>
                                      {formatEuro(ecart)}
                                    </span>
                                  ) : '—'}
                                </span>
                              </td>
                            );
                          }
                          if (col.type === 'commentaire') {
                            return (
                              <td key={col.id} className={TD} style={{ background: '#fffbeb' }}>
                                <input
                                  className="w-full bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-300 focus:text-slate-800"
                                  value={getRaw(day, col.id)}
                                  placeholder="—"
                                  onChange={e => setRaw(day, col.id, e.target.value)}
                                />
                              </td>
                            );
                          }
                          // saisie
                          return (
                            <td key={col.id} className={TD + ' text-right'} style={{ background: '#fffbeb' }}>
                              <EditCell
                                value={getRaw(day, col.id)}
                                onCommit={v => setRaw(day, col.id, parseMoneyValue(v) > 0 ? String(parseMoneyValue(v)) : '')}
                                placeholder="0,00"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className={TD_TOTAL + ' sticky left-0 bg-slate-50'} style={{ color: accentColor }}>
                      TOTAL {MONTH_NAMES[activeMonth].toUpperCase()} {year}
                    </td>
                    {columns.map(col => {
                      if (col.type === 'calcule') {
                        const totalEcart = dayRows.reduce((sum, r) => sum + calcEcart(r.dayIndex! + 1), 0);
                        return (
                          <td key={col.id} className={TD_TOTAL + ' text-right'}>
                            <span style={{ color: totalEcart >= 0 ? '#059669' : '#dc2626' }}>
                              {totalEcart !== 0 ? formatEuro(totalEcart) : '—'}
                            </span>
                          </td>
                        );
                      }
                      if (col.type === 'commentaire') {
                        return <td key={col.id} className={TD_TOTAL} />;
                      }
                      const colTotal = dayRows.reduce((sum, r) =>
                        sum + parseMoneyValue(getRaw(r.dayIndex! + 1, col.id)), 0);
                      return (
                        <td key={col.id} className={TD_TOTAL + ' text-right text-slate-900'}>
                          {colTotal > 0 ? formatEuro(colTotal) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            ) : (
              /* Mode Journalier */
              <table className="min-w-[500px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className={TH + ' text-left sticky left-0 bg-white'} style={{ minWidth: 120 }}>Date</th>
                    <th className={TH + ' text-right'} style={{ minWidth: 140 }}>Montant (€)</th>
                    <th className={TH + ' text-left'} style={{ minWidth: 240 }}>Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {dayRows.map((row, ri) => {
                    const day = row.dayIndex! + 1;
                    const montant = getRaw(day, 'montant');
                    const commentaire = getRaw(day, 'commentaire');
                    const hasMontant = parseMoneyValue(montant) > 0;

                    return (
                      <tr key={ri} className={!hasMontant ? 'opacity-60' : ''}>
                        <td className={TD_DAY + (row.isWeekend ? ' text-cyan-300/70' : '')}>
                          {row.label?.split(' ').slice(0, 2).join(' ')}
                        </td>
                        <td className={TD + ' text-right'}>
                          <EditCell
                            value={montant}
                            onCommit={v => setRaw(day, 'montant', parseMoneyValue(v) > 0 ? String(parseMoneyValue(v)) : '')}
                            placeholder="0,00"
                          />
                        </td>
                        <td className={TD}>
                          <input
                            className="w-full bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-300 focus:text-slate-800"
                            value={commentaire}
                            placeholder="—"
                            onChange={e => setRaw(day, 'commentaire', e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className={TD_TOTAL + ' sticky left-0 bg-slate-50'} style={{ color: accentColor }}>
                      TOTAL {MONTH_NAMES[activeMonth].toUpperCase()} {year}
                    </td>
                    <td className={TD_TOTAL + ' text-right text-slate-900'}>{totalMontant > 0 ? formatEuro(totalMontant) : '—'}</td>
                    <td className={TD_TOTAL} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
