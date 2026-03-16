import React, { useState, useMemo, useCallback } from 'react';
import { useData } from './DataContext';

interface SaisieTheoriqueProps {
  month: number;
  year: number;
  onBack: () => void;
}

const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();

const formatMonthYear = (month: number, year: number) => {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }).replace(' ', '-');
};

const formatDate = (day: number, month: number, year: number) => {
  const date = new Date(year, month, day);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const CurrencyInput = React.memo(({ value, onChange, className }: { value: string; onChange: (val: string) => void; className?: string }) => {
  const [isFocused, setIsFocused] = useState(false);

  const displayValue = useMemo(() => {
    if (isFocused || !value) return value;
    const num = parseFloat(value.replace(',', '.'));
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(num);
  }, [value, isFocused]);

  return (
    <input
      type="text"
      className={className || "w-full h-full p-2 bg-transparent outline-none text-center transition-colors focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md"}
      value={displayValue}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9.,-]/g, ''))}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
  );
});
CurrencyInput.displayName = 'CurrencyInput';

type DayData = {
  total_ca: string; cb: string; amex: string; tr_papier: string; tr_carte: string;
  ancv: string; especes: string; click_collect: string; uber: string;
  deliveroo: string; sunday: string; commentaire: string;
};

const EMPTY_DAY: DayData = {
  total_ca: '', cb: '', amex: '', tr_papier: '', tr_carte: '', ancv: '',
  especes: '', click_collect: '', uber: '', deliveroo: '', sunday: '', commentaire: ''
};

const COLUMNS_TO_SUM: (keyof DayData)[] = [
  'cb', 'amex', 'tr_papier', 'tr_carte', 'ancv', 'especes',
  'click_collect', 'uber', 'deliveroo', 'sunday'
];

const parseVal = (s: string) => { const n = parseFloat((s || '').replace(',', '.')); return isNaN(n) ? 0 : n; };
const formatCurrency = (num: number) => num === 0 ? '-' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(num);

const NAV = '#1e293b';

export default function SaisieTheorique({ month, year, onBack }: SaisieTheoriqueProps) {

  const tableScrollRef = React.useRef<HTMLDivElement>(null);
  const mirrorScrollRef = React.useRef<HTMLDivElement>(null);
  const phantomRef = React.useRef<HTMLDivElement>(null);
  const isSyncingRef = React.useRef(false);

  React.useEffect(() => {
    const table = tableScrollRef.current;
    const mirror = mirrorScrollRef.current;
    const phantom = phantomRef.current;
    if (!table || !mirror || !phantom) return;
    const syncWidth = () => { phantom.style.width = table.scrollWidth + "px"; };
    syncWidth();
    const ro = new ResizeObserver(syncWidth);
    ro.observe(table);
    const onTable = () => { if (isSyncingRef.current) return; isSyncingRef.current = true; mirror.scrollLeft = table.scrollLeft; isSyncingRef.current = false; };
    const onMirror = () => { if (isSyncingRef.current) return; isSyncingRef.current = true; table.scrollLeft = mirror.scrollLeft; isSyncingRef.current = false; };
    table.addEventListener("scroll", onTable);
    mirror.addEventListener("scroll", onMirror);
    return () => { table.removeEventListener("scroll", onTable); mirror.removeEventListener("scroll", onMirror); ro.disconnect(); };
  }, []);

  const { data: globalData, updateTheorique } = useData();
  const daysInMonth = getDaysInMonth(month, year);
  const monthYearLabel = formatMonthYear(month, year);
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);
  const data = globalData[month]?.theorique ?? {};
  const [showAlert, setShowAlert] = useState(false);

  const handleDataChange = useCallback((day: number, field: keyof DayData, value: string) => {
    updateTheorique(month, day, field, value);
  }, [month, updateTheorique]);

  const dayStats = useMemo(() => {
    return days.map(day => {
      const d = data[day] ?? EMPTY_DAY;
      const totalEncaisse = COLUMNS_TO_SUM.reduce((s, col) => s + parseVal(d[col]), 0);
      const totalCaVal = parseVal(d.total_ca);
      const ecart = totalCaVal - totalEncaisse;
      const hasData = Object.values(d).some(v => v !== '');
      const hasError = hasData && Math.abs(ecart) > 0.001;
      return { day, d, totalEncaisse, totalCaVal, ecart, hasData, hasError };
    });
  }, [days, data]);

  const totals = useMemo(() => {
    const t: Record<string, number> = { total_ca: 0, totalEncaisse: 0 };
    COLUMNS_TO_SUM.forEach(col => { t[col] = 0; });
    dayStats.forEach(({ d, totalEncaisse }) => {
      t.total_ca += parseVal(d.total_ca);
      t.totalEncaisse += totalEncaisse;
      COLUMNS_TO_SUM.forEach(col => { t[col] += parseVal(d[col]); });
    });
    t.ecart = t.total_ca - t.totalEncaisse;
    return t;
  }, [dayStats]);

  const handleNavigation = useCallback(() => {
    const hasIssue = dayStats.some(({ hasError, d }) => hasError && !(d.commentaire?.trim()));
    if (hasIssue) { setShowAlert(true); return; }
    onBack();
  }, [dayStats, onBack]);

  return (
    <div className="h-screen bg-slate-50 font-sans flex flex-col overflow-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap'); *{box-sizing:border-box} button{outline:none}`}</style>

      <header style={{
        background: NAV, height: 64, padding: '0 36px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 1px 0 rgba(255,255,255,.05)', flexShrink: 0
      }}>
        <button onClick={handleNavigation} style={{
          display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1',
          cursor: 'pointer', background: 'none', border: 'none', padding: '8px 0',
          fontSize: 14, fontWeight: 600, fontFamily: 'inherit', transition: 'color 0.2s',
          textTransform: 'uppercase', letterSpacing: '0.05em'
        }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Retour Synthèse
        </button>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Saisie du Théorique
        </div>
        <div style={{ width: 140 }} />
      </header>

      <div className="max-w-[1600px] w-full mx-auto px-6 flex flex-col flex-1 min-h-0 py-6">
        <div className="mb-6 flex flex-col items-center justify-center text-center shrink-0">
          <h1 className="text-2xl font-bold text-slate-800">
            SAISIE UNIQUEMENT <span className="text-rose-600 text-3xl">DU THEORIQUE</span>
          </h1>
          <p className="text-slate-500 font-medium mt-2 text-sm uppercase tracking-wider">
            (Prendre UNIQUEMENT LE THEORIQUE DE LA FEUILLE DE CAISSE)
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="relative flex flex-col flex-1 min-h-0">
            <div ref={mirrorScrollRef} className="overflow-x-auto shrink-0 border-b border-slate-200 bg-slate-50/80" style={{ height: 14, scrollbarWidth: "thin", scrollbarColor: "#94a3b8 #f1f5f9" }}>
              <div ref={phantomRef} style={{ height: 1 }} />
            </div>
            <div ref={tableScrollRef} className="overflow-auto flex-1">
              <table className="w-max min-w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                  <tr>
                    <th className="px-4 py-3 font-bold text-center w-24 border-r border-slate-200 bg-slate-100 sticky left-0 z-30">{monthYearLabel}</th>
                    {[
                      'TOTAL DU CA THEORIQUE', 'CB TOTAL THEORIQUE', 'AMEX + ANCV CARTE THEORIQUE',
                      'TICKETS RESTAURANTS PAPIER TOTAL THEORIQUE', 'CARTE TR (CONECS) TOTAL THEORIQUE',
                      'ANCV PAPIER THEORIQUE', 'ESPECES THEORIQUE', 'CLICK AND COLLECT (VENTE INTERNET)',
                      'UBER EAT THEORIQUE', 'DELIVEROO THEORIQUE', 'SUNDAY QR CODE + CHEQUE THEORIQUE'
                    ].map((label, i) => (
                      <th key={i} className={`px-2 py-3 font-bold text-center text-[10px] w-24 whitespace-normal border-r border-slate-200 ${i === 0 ? 'bg-amber-100 text-amber-800' : 'bg-orange-50 text-orange-800'}`}>
                        {label}
                      </th>
                    ))}
                    {['TOTAL ENCAISSE', 'ECART (SI ECART SAISIE FAUSSE)', 'COMMENTAIRE'].map((label, i) => (
                      <th key={i} className={`px-2 py-3 font-bold text-center text-[10px] whitespace-normal border-r border-slate-200 bg-blue-50 text-blue-800 ${i === 2 ? 'min-w-[200px]' : 'w-24'}`}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dayStats.map(({ day, d, totalEncaisse, ecart, hasData, hasError }) => (
                    <tr key={day} className={hasError ? 'bg-rose-50/50' : 'hover:bg-slate-50/50 transition-colors group'}>
                      <td className="px-2 py-1 border-r border-slate-100 text-center font-medium text-slate-600 bg-slate-50 sticky left-0 z-10">
                        {formatDate(day, month, year)}
                      </td>
                      <td className="px-2 py-1 border-r border-slate-100 bg-amber-50/30">
                        <CurrencyInput
                          className="w-full p-2 bg-transparent outline-none text-center text-slate-700 font-medium focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md transition-colors border border-transparent hover:border-slate-200"
                          value={d.total_ca}
                          onChange={v => handleDataChange(day, 'total_ca', v)}
                        />
                      </td>
                      {(['cb', 'amex', 'tr_papier', 'tr_carte', 'ancv', 'especes', 'click_collect', 'uber', 'deliveroo', 'sunday'] as (keyof DayData)[]).map(col => (
                        <td key={col} className="px-2 py-1 border-r border-slate-100">
                          <CurrencyInput
                            className="w-full p-2 bg-transparent outline-none text-center text-slate-700 font-medium focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md transition-colors border border-transparent hover:border-slate-200"
                            value={d[col]}
                            onChange={v => handleDataChange(day, col, v)}
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2 text-center font-bold text-slate-700 bg-slate-50/50 border-r border-slate-100">
                        {hasData ? formatCurrency(totalEncaisse) : ''}
                      </td>
                      <td className={`px-4 py-2 text-center font-bold border-r border-slate-100 ${hasError ? 'text-rose-600 bg-rose-50' : 'text-slate-700 bg-slate-50/50'}`}>
                        {hasData ? formatCurrency(ecart) : ''}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          className={`w-full p-2 bg-transparent outline-none text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md transition-colors border border-transparent hover:border-slate-200 ${hasError && !d.commentaire?.trim() ? 'ring-2 ring-rose-400 bg-white' : ''}`}
                          value={d.commentaire}
                          onChange={e => handleDataChange(day, 'commentaire', e.target.value)}
                          placeholder={hasError ? "Commentaire requis..." : ""}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-800 text-white font-bold sticky bottom-0 z-20">
                  <tr>
                    <td className="px-4 py-4 text-center border-r border-slate-700 rounded-bl-2xl sticky left-0 z-30 bg-slate-800">TOTAL</td>
                    <td className="px-4 py-4 text-center border-r border-slate-700 text-amber-200">{formatCurrency(totals.total_ca)}</td>
                    {COLUMNS_TO_SUM.map(col => (
                      <td key={col} className="px-4 py-4 text-center border-r border-slate-700">{formatCurrency(totals[col])}</td>
                    ))}
                    <td className="px-4 py-4 text-center border-r border-slate-700 text-blue-200">{formatCurrency(totals.totalEncaisse)}</td>
                    <td className="px-4 py-4 text-center border-r border-slate-700 text-rose-200">{formatCurrency(totals.ecart)}</td>
                    <td className="px-4 py-4 text-center rounded-br-2xl"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showAlert && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-rose-100">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Action impossible</h2>
            <p className="text-slate-600 mb-8">Certaines saisies comportent des écarts. Merci de les corriger ou d'ajouter un commentaire explicatif avant de quitter.</p>
            <button
              onClick={() => setShowAlert(false)}
              className="w-full bg-rose-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-sm shadow-rose-200"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
