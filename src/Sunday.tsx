import React, { useState } from 'react';
import { useData, DayDataSunday } from './DataContext';

interface SundayProps {
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
      className={`w-full h-full p-2 bg-transparent outline-none text-right transition-colors focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md ${className}`}
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

const NAV = '#1e293b';

export default function Sunday({ month, year, onBack }: SundayProps) {
  const { data: globalData, updateSunday } = useData();
  const daysInMonth = getDaysInMonth(month, year);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const theoriqueData = globalData[month]?.theorique || {};
  const data = globalData[month]?.sunday || {};

  const handleDataChange = (day: number, field: keyof DayDataSunday, value: string) => {
    updateSunday(month, day, field, value);
  };

  const formatCurrency = (num: number) => {
    if (num === 0) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(num);
  };

  const getVal = (day: number, field: keyof DayDataSunday) => {
    const val = parseFloat((data[day]?.[field] || '').replace(',', '.'));
    return isNaN(val) ? 0 : val;
  };

  const getTheoriqueVal = (day: number, field: 'sunday') => {
    const val = parseFloat((theoriqueData[day]?.[field] || '').replace(',', '.'));
    return isNaN(val) ? 0 : val;
  };

  const getColTotal = (field: keyof DayDataSunday) => {
    return days.reduce((sum, day) => sum + getVal(day, field), 0);
  };

  const getTheoriqueColTotal = (field: 'sunday') => {
    return days.reduce((sum, day) => sum + getTheoriqueVal(day, field), 0);
  };

  const sumSundayTheorique = getTheoriqueColTotal('sunday');
  const sumReel = getColTotal('reel');
  const sumEcartTTC = sumReel - sumSundayTheorique;

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
          Sunday QR Code + Chèque
        </div>
        <div style={{ width: 140 }} /> {/* Spacer for balance */}
      </header>

      {/* Table Container */}
      <div className="w-full px-6 flex flex-col flex-1 min-h-0 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                <tr>
                  <th className="px-6 py-4 font-bold text-center w-32 border-r border-slate-200 sticky left-0 z-30 bg-slate-100">Date</th>
                  <th className="px-6 py-4 font-bold text-center w-48 bg-blue-50/50 border-r border-slate-200 text-blue-700">Sunday Théorique</th>
                  <th className="px-6 py-4 font-bold text-center w-48 bg-amber-50/50 border-r border-slate-200 text-amber-700">Réel</th>
                  <th className="px-6 py-4 font-bold text-center w-48 border-r border-slate-200">Écart TTC</th>
                  <th className="px-6 py-4 font-bold min-w-[300px]">Commentaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {days.map((day) => {
                  const dayData = data[day] || { reel: '', commentaire: '' };
                  
                  const sundayTheorique = getTheoriqueVal(day, 'sunday');
                  const reel = getVal(day, 'reel');
                  
                  const ecart = reel - sundayTheorique;
                  const ecartColor = ecart < -0.001 ? 'text-rose-600 bg-rose-50/50' : ecart > 0.001 ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-400';

                  return (
                    <tr key={day} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-3 text-center font-medium text-slate-600 sticky left-0 z-10 bg-white border-r border-slate-100">
                        {formatDate(day, month, year)}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-slate-700 bg-blue-50/30 border-r border-slate-100">
                        {sundayTheorique !== 0 ? formatCurrency(sundayTheorique) : '-'}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-100">
                        <div className="bg-amber-50/50 rounded-lg border border-amber-100/50 group-hover:border-amber-200 transition-colors">
                          <CurrencyInput 
                            value={dayData.reel} 
                            onChange={(val) => handleDataChange(day, 'reel', val)} 
                            className="text-slate-700 font-medium"
                          />
                        </div>
                      </td>
                      <td className={`px-6 py-3 text-right font-bold border-r border-slate-100 ${ecartColor}`}>
                        {(sundayTheorique !== 0 || reel !== 0) ? formatCurrency(ecart) : '-'}
                      </td>
                      <td className="px-3 py-2">
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
                  <td className="px-6 py-4 text-center rounded-bl-2xl border-r border-slate-700 sticky left-0 z-30 bg-slate-800">TOTAL</td>
                  <td className="px-6 py-4 text-right text-blue-200 border-r border-slate-700">{formatCurrency(sumSundayTheorique)}</td>
                  <td className="px-6 py-4 text-right text-amber-200 border-r border-slate-700">{formatCurrency(sumReel)}</td>
                  <td className={`px-6 py-4 text-right border-r border-slate-700 ${sumEcartTTC < -0.001 ? 'text-rose-400' : sumEcartTTC > 0.001 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {formatCurrency(sumEcartTTC)}
                  </td>
                  <td className="px-6 py-4 rounded-br-2xl"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
