import React, { useState } from 'react';
import { useData, DayDataSaisieTR, TrEntry } from './DataContext';

interface SaisieTRProps {
  month: number;
  year: number;
  onBack: () => void;
}

const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const formatDate = (day: number, month: number, year: number) => {
  const date = new Date(year, month, day);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const CurrencyInput = ({ value, onChange, className = "" }: { value: string, onChange: (val: string) => void, className?: string }) => {
  const [isFocused, setIsFocused] = useState(false);

  let displayValue = value;
  if (!isFocused && value) {
    const num = parseFloat(value.replace(',', '.'));
    if (!isNaN(num)) {
      displayValue = new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' €';
    }
  }

  return (
    <input
      type="text"
      className={`w-full h-full p-2 bg-transparent outline-none text-right transition-colors focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md ${className}`}
      value={displayValue}
      onChange={(e) => {
        const val = e.target.value.replace(/[^0-9.,]/g, '');
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
        const val = e.target.value.replace(/[^0-9]/g, '');
        onChange(val);
      }}
    />
  );
};

const NAV = '#1e293b';

export default function SaisieTR({ month, year, onBack }: SaisieTRProps) {

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
  const { data: globalData, updateSaisieTR } = useData();
  const daysInMonth = getDaysInMonth(month, year);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  const [dayFilter, setDayFilter] = useState<number | 'all'>(new Date().getDate());

  const data = globalData[month]?.saisieTR || {};

  const handleDataChange = (day: number, provider: keyof DayDataSaisieTR, index: number, field: keyof TrEntry, value: string) => {
    updateSaisieTR(month, day, provider, index, field, value);
  };

  const formatCurrency = (num: number) => {
    if (num === 0) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' €';
  };

  const parseVal = (val: string) => {
    const parsed = parseFloat((val || '').replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  const providers: (keyof DayDataSaisieTR)[] = ['edenred', 'pluxee', 'bimpli', 'up'];

  const getDayTotal = (day: number) => {
    const dayData = data[day];
    if (!dayData) return { nombre: 0, valeur: 0 };

    let totalNombre = 0;
    let totalValeur = 0;

    providers.forEach(provider => {
      const entries = dayData[provider] || [];
      entries.forEach(entry => {
        const v = parseVal(entry.valeur);
        const n = parseVal(entry.nombre);
        totalNombre += n;
        totalValeur += v * n;
      });
    });

    return { nombre: totalNombre, valeur: totalValeur };
  };

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
          Saisie des TR
        </div>
        <div style={{ width: 140 }} /> {/* Spacer for balance */}
      </header>

      {/* Table Container */}
      <div className="max-w-[1600px] w-full mx-auto px-6 flex flex-col flex-1 min-h-0 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="relative flex flex-col flex-1 min-h-0">
            <div ref={mirrorScrollRef} className="overflow-x-auto shrink-0 border-b border-slate-200 bg-slate-50/80" style={{ height: 14, scrollbarWidth: "thin", scrollbarColor: "#94a3b8 #f1f5f9" }}>
              <div ref={phantomRef} style={{ height: 1 }} />
            </div>
            <div ref={tableScrollRef} className="overflow-auto flex-1">
            <table className="w-max min-w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                <tr>
                  <th className="px-2 py-2 w-28 border-r border-slate-200 bg-white sticky left-0 z-30">
                    <select 
                      className="w-full bg-transparent outline-none cursor-pointer font-bold text-slate-700 hover:text-blue-600 transition-colors"
                      value={dayFilter}
                      onChange={(e) => setDayFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    >
                      <option value="all">TOUS</option>
                      {days.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </th>
                  <th colSpan={3} className="px-4 py-3 text-center font-bold bg-amber-50/50 border-r border-slate-200 text-amber-700">EDENRED</th>
                  <th colSpan={3} className="px-4 py-3 text-center font-bold bg-blue-50/50 border-r border-slate-200 text-blue-700">PLUXEE</th>
                  <th colSpan={3} className="px-4 py-3 text-center font-bold bg-emerald-50/50 border-r border-slate-200 text-emerald-700">BIMPLI</th>
                  <th colSpan={3} className="px-4 py-3 text-center font-bold bg-slate-100/50 border-r border-slate-200 text-slate-700">UP</th>
                  <th colSpan={2} className="px-4 py-3 text-center font-bold bg-orange-50/50 text-orange-700">TOTAL</th>
                </tr>
                <tr className="border-t border-slate-200 sticky top-[42px] z-20 bg-slate-50">
                  <th className="px-2 py-2 w-28 border-r border-slate-200 sticky left-0 z-30 bg-slate-50"></th>
                  
                  <th className="px-2 py-2 text-center font-bold bg-amber-50/30 w-16">VALEURS</th>
                  <th className="px-2 py-2 text-center font-bold bg-amber-50/30 w-16">NOMBRE</th>
                  <th className="px-2 py-2 text-center font-bold bg-amber-50/30 w-20 border-r border-slate-200">TOTAL</th>
                  
                  <th className="px-2 py-2 text-center font-bold bg-blue-50/30 w-16">VALEURS</th>
                  <th className="px-2 py-2 text-center font-bold bg-blue-50/30 w-16">NOMBRE</th>
                  <th className="px-2 py-2 text-center font-bold bg-blue-50/30 w-20 border-r border-slate-200">TOTAL</th>
                  
                  <th className="px-2 py-2 text-center font-bold bg-emerald-50/30 w-16">VALEURS</th>
                  <th className="px-2 py-2 text-center font-bold bg-emerald-50/30 w-16">NOMBRE</th>
                  <th className="px-2 py-2 text-center font-bold bg-emerald-50/30 w-20 border-r border-slate-200">TOTAL</th>
                  
                  <th className="px-2 py-2 text-center font-bold bg-slate-50/50 w-16">VALEURS</th>
                  <th className="px-2 py-2 text-center font-bold bg-slate-50/50 w-16">NOMBRE</th>
                  <th className="px-2 py-2 text-center font-bold bg-slate-50/50 w-20 border-r border-slate-200">TOTAL</th>
                  
                  <th className="px-4 py-2 text-center font-bold bg-orange-50/30 w-20">NOMBRE</th>
                  <th className="px-4 py-2 text-center font-bold bg-orange-50/30 w-24">VALEUR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {days.filter(day => dayFilter === 'all' || day === dayFilter).map((day) => {
                  const dayData = data[day] || {
                    edenred: Array(8).fill({ valeur: '', nombre: '' }),
                    pluxee: Array(8).fill({ valeur: '', nombre: '' }),
                    bimpli: Array(8).fill({ valeur: '', nombre: '' }),
                    up: Array(8).fill({ valeur: '', nombre: '' })
                  };
                  
                  const dayTotal = getDayTotal(day);

                  return (
                    <React.Fragment key={day}>
                      {Array.from({ length: 8 }).map((_, rowIndex) => (
                        <tr key={`${day}-${rowIndex}`} className="hover:bg-slate-50/50 transition-colors group">
                          {rowIndex === 0 && (
                            <td rowSpan={8} className="px-2 py-2 w-28 text-center text-xs font-bold text-slate-700 bg-white align-middle border-r border-slate-200 border-b border-slate-200 sticky left-0 z-10">
                              {formatDate(day, month, year)}
                            </td>
                          )}
                          
                          {/* EDENRED */}
                          <td className={`px-2 py-1 bg-amber-50/10 ${rowIndex === 7 ? 'border-b border-slate-200' : ''}`}>
                            <div className="bg-white rounded-lg border border-slate-200 group-hover:border-slate-300 transition-colors">
                              <CurrencyInput 
                                value={dayData.edenred[rowIndex]?.valeur || ''} 
                                onChange={(val) => handleDataChange(day, 'edenred', rowIndex, 'valeur', val)} 
                                className="text-slate-700 font-medium"
                              />
                            </div>
                          </td>
                          <td className={`px-2 py-1 bg-amber-50/10 ${rowIndex === 7 ? 'border-b border-slate-200' : ''}`}>
                            <div className="bg-white rounded-lg border border-slate-200 group-hover:border-slate-300 transition-colors">
                              <NumberInput 
                                value={dayData.edenred[rowIndex]?.nombre || ''} 
                                onChange={(val) => handleDataChange(day, 'edenred', rowIndex, 'nombre', val)} 
                                className="text-slate-700 font-medium"
                              />
                            </div>
                          </td>
                          <td className={`px-4 py-2 text-right font-medium text-slate-600 bg-amber-50/10 border-r border-slate-200 ${rowIndex === 7 ? 'border-b border-slate-200' : ''}`}>
                            {formatCurrency(parseVal(dayData.edenred[rowIndex]?.valeur) * parseVal(dayData.edenred[rowIndex]?.nombre))}
                          </td>

                          {/* PLUXEE */}
                          <td className={`px-2 py-1 bg-blue-50/10 ${rowIndex === 7 ? 'border-b border-slate-200' : ''}`}>
                            <div className="bg-white rounded-lg border border-slate-200 group-hover:border-slate-300 transition-colors">
                              <CurrencyInput 
                                value={dayData.pluxee[rowIndex]?.valeur || ''} 
                                onChange={(val) => handleDataChange(day, 'pluxee', rowIndex, 'valeur', val)} 
                                className="text-slate-700 font-medium"
                              />
                            </div>
                          </td>
                          <td className={`px-2 py-1 bg-blue-50/10 ${rowIndex === 7 ? 'border-b border-slate-200' : ''}`}>
                            <div className="bg-white rounded-lg border border-slate-200 group-hover:border-slate-300 transition-colors">
                              <NumberInput 
                                value={dayData.pluxee[rowIndex]?.nombre || ''} 
                                onChange={(val) => handleDataChange(day, 'pluxee', rowIndex, 'nombre', val)} 
                                className="text-slate-700 font-medium"
                              />
                            </div>
                          </td>
                          <td className={`px-4 py-2 text-right font-medium text-slate-600 bg-blue-50/10 border-r border-slate-200 ${rowIndex === 7 ? 'border-b border-slate-200' : ''}`}>
                            {formatCurrency(parseVal(dayData.pluxee[rowIndex]?.valeur) * parseVal(dayData.pluxee[rowIndex]?.nombre))}
                          </td>

                          {/* BIMPLI */}
                          <td className={`px-2 py-1 bg-emerald-50/10 ${rowIndex === 7 ? 'border-b border-slate-200' : ''}`}>
                            <div className="bg-white rounded-lg border border-slate-200 group-hover:border-slate-300 transition-colors">
                              <CurrencyInput 
                                value={dayData.bimpli[rowIndex]?.valeur || ''} 
                                onChange={(val) => handleDataChange(day, 'bimpli', rowIndex, 'valeur', val)} 
                                className="text-slate-700 font-medium"
                              />
                            </div>
                          </td>
                          <td className={`px-2 py-1 bg-emerald-50/10 ${rowIndex === 7 ? 'border-b border-slate-200' : ''}`}>
                            <div className="bg-white rounded-lg border border-slate-200 group-hover:border-slate-300 transition-colors">
                              <NumberInput 
                                value={dayData.bimpli[rowIndex]?.nombre || ''} 
                                onChange={(val) => handleDataChange(day, 'bimpli', rowIndex, 'nombre', val)} 
                                className="text-slate-700 font-medium"
                              />
                            </div>
                          </td>
                          <td className={`px-4 py-2 text-right font-medium text-slate-600 bg-emerald-50/10 border-r border-slate-200 ${rowIndex === 7 ? 'border-b border-slate-200' : ''}`}>
                            {formatCurrency(parseVal(dayData.bimpli[rowIndex]?.valeur) * parseVal(dayData.bimpli[rowIndex]?.nombre))}
                          </td>

                          {/* UP */}
                          <td className={`px-2 py-1 bg-slate-50/30 ${rowIndex === 7 ? 'border-b border-slate-200' : ''}`}>
                            <div className="bg-white rounded-lg border border-slate-200 group-hover:border-slate-300 transition-colors">
                              <CurrencyInput 
                                value={dayData.up[rowIndex]?.valeur || ''} 
                                onChange={(val) => handleDataChange(day, 'up', rowIndex, 'valeur', val)} 
                                className="text-slate-700 font-medium"
                              />
                            </div>
                          </td>
                          <td className={`px-2 py-1 bg-slate-50/30 ${rowIndex === 7 ? 'border-b border-slate-200' : ''}`}>
                            <div className="bg-white rounded-lg border border-slate-200 group-hover:border-slate-300 transition-colors">
                              <NumberInput 
                                value={dayData.up[rowIndex]?.nombre || ''} 
                                onChange={(val) => handleDataChange(day, 'up', rowIndex, 'nombre', val)} 
                                className="text-slate-700 font-medium"
                              />
                            </div>
                          </td>
                          <td className={`px-4 py-2 text-right font-medium text-slate-600 bg-slate-50/30 border-r border-slate-200 ${rowIndex === 7 ? 'border-b border-slate-200' : ''}`}>
                            {formatCurrency(parseVal(dayData.up[rowIndex]?.valeur) * parseVal(dayData.up[rowIndex]?.nombre))}
                          </td>

                          {/* TOTAL */}
                          {rowIndex === 0 && (
                            <>
                              <td rowSpan={8} className="px-4 py-4 text-center font-bold text-orange-700 bg-orange-50/30 text-lg align-middle border-r border-slate-200 border-b border-slate-200">
                                {dayTotal.nombre}
                              </td>
                              <td rowSpan={8} className="px-4 py-4 text-center font-bold text-orange-700 bg-orange-50/30 text-lg align-middle border-b border-slate-200">
                                {formatCurrency(dayTotal.valeur)}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
