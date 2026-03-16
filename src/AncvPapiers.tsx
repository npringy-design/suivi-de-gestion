import React, { useState } from 'react';
import { useData, DayDataAncvPapiers } from './DataContext';

interface AncvPapiersProps {
  month: number;
  year: number;
  onBack: () => void;
}

const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const formatDate = (day: number, month: number, year: number) => {
  const date = new Date(year, month, day);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const CurrencyInput = ({ value, onChange, className = "" }: { value: string, onChange: (val: string) => void, className?: string }) => {
  const [isFocused, setIsFocused] = useState(false);

  let displayValue = value;
  if (!isFocused && value) {
    const num = parseFloat(value.replace(',', '.'));
    if (!isNaN(num)) {
      displayValue = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(num);
    }
  }

  return (
    <input
      type="text"
      className={`w-full h-full p-2 bg-transparent outline-none text-center transition-colors focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md ${className}`}
      value={displayValue}
      onChange={(e) => {
        const val = e.target.value.replace(/[^0-9.,-]/g, '');
        onChange(val);
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
  );
};

const NumberInput = ({ value, onChange, className = "" }: { value: string, onChange: (val: string) => void, className?: string }) => {
  return (
    <input
      type="text"
      className={`w-full h-full p-2 bg-transparent outline-none text-center transition-colors focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md ${className}`}
      value={value}
      onChange={(e) => {
        const val = e.target.value.replace(/[^0-9-]/g, '');
        onChange(val);
      }}
    />
  );
};

const NAV = '#1e293b';

export default function AncvPapiers({ month, year, onBack }: AncvPapiersProps) {

  // ── Mirror scrollbar ──────────────────────────────────────────────────────
  const tableScrollRef = React.useRef<HTMLDivElement>(null);
  const mirrorScrollRef = React.useRef<HTMLDivElement>(null);
  const phantomRef = React.useRef<HTMLDivElement>(null);
  const isSyncingRef = React.useRef(false);

  React.useEffect(() => {
    const table = tableScrollRef.current;
    const mirror = mirrorScrollRef.current;
    const phantom = phantomRef.current;
    if (!table || !mirror || !phantom) return;
    const syncWidth = () => { phantom.style.width = table.scrollWidth + 'px'; };
    syncWidth();
    const ro = new ResizeObserver(syncWidth);
    ro.observe(table);
    const onTable = () => { if (isSyncingRef.current) return; isSyncingRef.current = true; mirror.scrollLeft = table.scrollLeft; isSyncingRef.current = false; };
    const onMirror = () => { if (isSyncingRef.current) return; isSyncingRef.current = true; table.scrollLeft = mirror.scrollLeft; isSyncingRef.current = false; };
    table.addEventListener('scroll', onTable);
    mirror.addEventListener('scroll', onMirror);
    return () => { table.removeEventListener('scroll', onTable); mirror.removeEventListener('scroll', onMirror); ro.disconnect(); };
  }, []);
  const { data: globalData, updateAncvPapiers } = useData();
  const daysInMonth = getDaysInMonth(month, year);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const theoriqueData = globalData[month]?.theorique || {};
  const data = globalData[month]?.ancvPapiers || {};

  const handleDataChange = (day: number, field: keyof DayDataAncvPapiers, value: string) => {
    updateAncvPapiers(month, day, field, value);
  };

  const formatCurrency = (num: number) => {
    if (num === 0) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(num);
  };

  const getVal = (day: number, field: keyof DayDataAncvPapiers) => {
    const val = parseFloat((data[day]?.[field] || '').replace(',', '.'));
    return isNaN(val) ? 0 : val;
  };

  const getTheoriqueVal = (day: number, field: 'ancv') => {
    const val = parseFloat((theoriqueData[day]?.[field] || '').replace(',', '.'));
    return isNaN(val) ? 0 : val;
  };

  const getColTotal = (field: keyof DayDataAncvPapiers) => {
    return days.reduce((sum, day) => sum + getVal(day, field), 0);
  };

  const getTheoriqueColTotal = (field: 'ancv') => {
    return days.reduce((sum, day) => sum + getTheoriqueVal(day, field), 0);
  };

  const sumAncvTheorique = getTheoriqueColTotal('ancv');
  const sumNombreAncv = getColTotal('nombre_ancv');
  const sumMontantTotal = getColTotal('montant_total');
  
  const sumEcart = sumAncvTheorique - sumMontantTotal;
  
  const sumNbreAncvEnveloppes = getColTotal('nbre_ancv_enveloppes');
  const sumTotalEnveloppesAncv = getColTotal('total_enveloppes_ancv');

  let cumulativeControl = 0;

  return (
    <div className="h-screen bg-slate-50 font-sans flex flex-col overflow-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap'); *{box-sizing:border-box} button{outline:none}`}</style>

      {/* Header */}
      <header style={{
        background: NAV, height: 64, padding: '0 36px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 1px 0 rgba(255,255,255,.05)',
        flexShrink: 0
      }}>
        <button 
          onClick={onBack} 
          style={{ 
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
          ANCV Papier Réel
        </div>
        <div style={{ width: 140 }} /> {/* Spacer for balance */}
      </header>

      {/* Table Container */}
      <div className="w-full px-6 flex flex-col flex-1 min-h-0 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="relative flex flex-col flex-1 min-h-0">
            <div ref={mirrorScrollRef} className="overflow-x-auto shrink-0 border-b border-slate-200 bg-slate-50/80" style={{ height: 14, scrollbarWidth: "thin", scrollbarColor: "#94a3b8 #f1f5f9" }}>
              <div ref={phantomRef} style={{ height: 1 }} />
            </div>
            <div ref={tableScrollRef} className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                <tr>
                  <th colSpan={2} className="px-4 py-2 border-r border-slate-200"></th>
                  <th colSpan={3} className="px-4 py-2 text-center font-bold bg-emerald-50/50 border-r border-slate-200 text-emerald-700">
                    Inventaire Quotidien
                  </th>
                  <th colSpan={4} className="px-4 py-2 text-center font-bold bg-orange-50/50 border-r border-slate-200 text-orange-700">
                    Bordereaux de Collectes ANCV
                  </th>
                  <th className="px-4 py-2"></th>
                </tr>
                <tr className="border-t border-slate-200">
                  <th className="px-2 py-3 font-bold text-center w-16 sticky left-0 z-30 bg-slate-100 border-r border-slate-200">Date</th>
                  <th className="px-2 py-3 font-bold text-center w-28 bg-blue-50/50 border-r border-slate-200">ANCV Théorique</th>
                  <th className="px-2 py-3 font-bold text-center w-20">Nombre ANCV</th>
                  <th className="px-2 py-3 font-bold text-center w-28">Montant Total</th>
                  <th className="px-2 py-3 font-bold text-center w-28 border-r border-slate-200">Écart ANCV - ANCV Réel</th>
                  <th className="px-2 py-3 font-bold text-center w-28">N° bordereaux</th>
                  <th className="px-2 py-3 font-bold text-center w-20">Nbre ANCV env.</th>
                  <th className="px-2 py-3 font-bold text-center w-28">Total env. ANCV</th>
                  <th className="px-2 py-3 font-bold text-center w-28 border-r border-slate-200">Contrôle (remise à 0)</th>
                  <th className="px-2 py-3 font-bold min-w-[140px]">Commentaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {days.map((day) => {
                  const dayData = data[day] || { 
                    nombre_ancv: '', montant_total: '', n_bordereaux: '', 
                    nbre_ancv_enveloppes: '', total_enveloppes_ancv: '', commentaire: '' 
                  };
                  
                  const ancvTheorique = getTheoriqueVal(day, 'ancv');
                  const montantTotal = getVal(day, 'montant_total');
                  const totalEnveloppes = getVal(day, 'total_enveloppes_ancv');
                  
                  const ecart = ancvTheorique - montantTotal;
                  
                  const ecartColor = ecart < -0.001 ? 'text-rose-600 bg-rose-50/50' : ecart > 0.001 ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-400';

                  cumulativeControl = cumulativeControl + montantTotal - totalEnveloppes;
                  const controlColor = Math.abs(cumulativeControl) > 0.001 ? 'text-rose-600 bg-rose-50/50' : 'text-slate-400';

                  return (
                    <tr key={day} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-2 py-2 text-xs text-center font-medium text-slate-600 sticky left-0 z-10 bg-white border-r border-slate-100">
                        {formatDate(day, month, year)}
                      </td>
                      <td className="px-4 py-2 text-center font-semibold text-slate-700 bg-blue-50/30 border-r border-slate-100">
                        {ancvTheorique !== 0 ? formatCurrency(ancvTheorique) : '-'}
                      </td>
                      <td className="px-2 py-2">
                        <div className="bg-amber-50/50 rounded-lg border border-amber-100/50 group-hover:border-amber-200 transition-colors">
                          <NumberInput 
                            value={dayData.nombre_ancv} 
                            onChange={(val) => handleDataChange(day, 'nombre_ancv', val)} 
                            className="text-slate-700 font-medium"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="bg-amber-50/50 rounded-lg border border-amber-100/50 group-hover:border-amber-200 transition-colors">
                          <CurrencyInput 
                            value={dayData.montant_total} 
                            onChange={(val) => handleDataChange(day, 'montant_total', val)} 
                            className="text-slate-700 font-medium"
                          />
                        </div>
                      </td>
                      <td className={`px-4 py-2 text-center font-bold border-r border-slate-100 ${ecartColor}`}>
                        {(ancvTheorique !== 0 || montantTotal !== 0) ? formatCurrency(ecart) : '-'}
                      </td>
                      <td className="px-2 py-2">
                        <div className="bg-amber-50/50 rounded-lg border border-amber-100/50 group-hover:border-amber-200 transition-colors">
                          <input 
                            type="text" 
                            className="w-full h-full p-2 bg-transparent outline-none text-center text-slate-700 font-medium focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md transition-colors" 
                            value={dayData.n_bordereaux}
                            onChange={(e) => handleDataChange(day, 'n_bordereaux', e.target.value)}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="bg-amber-50/50 rounded-lg border border-amber-100/50 group-hover:border-amber-200 transition-colors">
                          <NumberInput 
                            value={dayData.nbre_ancv_enveloppes} 
                            onChange={(val) => handleDataChange(day, 'nbre_ancv_enveloppes', val)} 
                            className="text-slate-700 font-medium"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="bg-white rounded-lg border border-slate-200 group-hover:border-slate-300 transition-colors">
                          <CurrencyInput 
                            value={dayData.total_enveloppes_ancv} 
                            onChange={(val) => handleDataChange(day, 'total_enveloppes_ancv', val)} 
                            className="text-slate-700 font-medium"
                          />
                        </div>
                      </td>
                      <td className={`px-4 py-2 text-center font-bold border-r border-slate-100 ${controlColor}`}>
                        {formatCurrency(cumulativeControl)}
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          type="text" 
                          className="w-full p-2 bg-transparent outline-none text-slate-600 focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md transition-colors border border-transparent hover:border-slate-200" 
                          value={dayData.commentaire}
                          onChange={(e) => handleDataChange(day, 'commentaire', e.target.value)}
                          placeholder="Ajouter une note..."
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-800 text-white font-bold sticky bottom-0 z-20">
                <tr>
                  <td className="px-4 py-4 text-center rounded-bl-2xl sticky left-0 z-30 bg-slate-800 border-r border-slate-700">TOTAL</td>
                  <td className="px-4 py-4 text-center text-blue-200 border-r border-slate-700">{formatCurrency(sumAncvTheorique)}</td>
                  <td className="px-4 py-4 text-center">{sumNombreAncv !== 0 ? sumNombreAncv : '-'}</td>
                  <td className="px-4 py-4 text-center">{formatCurrency(sumMontantTotal)}</td>
                  <td className={`px-4 py-4 text-center border-r border-slate-700 ${sumEcart < -0.001 ? 'text-rose-400' : sumEcart > 0.001 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {formatCurrency(sumEcart)}
                  </td>
                  <td className="px-4 py-4 text-center"></td>
                  <td className="px-4 py-4 text-center">{sumNbreAncvEnveloppes !== 0 ? sumNbreAncvEnveloppes : '-'}</td>
                  <td className="px-4 py-4 text-center">{formatCurrency(sumTotalEnveloppesAncv)}</td>
                  <td className="px-4 py-4 text-center border-r border-slate-700">{formatCurrency(cumulativeControl)}</td>
                  <td className="px-4 py-4 rounded-br-2xl"></td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
