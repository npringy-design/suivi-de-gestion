import React from 'react';
import { useData } from './DataContext';

interface RemiseTRProps {
  month: number;
  year: number;
  onBack: () => void;
}

const months = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'
];

const NAV = '#1e293b';

export default function RemiseTR({ month, year, onBack }: RemiseTRProps) {
  const { data: globalData } = useData();

  const aggregateBrandData = (brand: 'edenred' | 'pluxee' | 'bimpli' | 'up') => {
    const aggregated: Record<string, number> = {};
    
    const monthData = globalData[month]?.saisieTR || {};
    Object.values(monthData).forEach(dayData => {
      const brandRows = dayData[brand] || [];
      brandRows.forEach(row => {
        // In SaisieTR we store fields as { valeur: string, nombre: string }
        const val = parseFloat((row.valeur || '').replace(',', '.'));
        const nb = parseInt((row.nombre || '').toString(), 10);
        if (!isNaN(val) && val > 0 && !isNaN(nb) && nb > 0) {
          const key = val.toFixed(2);
          aggregated[key] = (aggregated[key] || 0) + nb;
        }
      });
    });
    
    const result = Object.entries(aggregated).map(([valStr, nombre]) => {
      const valeur = parseFloat(valStr);
      return {
        valeur,
        nombre,
        total: valeur * nombre
      };
    }).sort((a, b) => a.valeur - b.valeur);
    
    const totalNombre = result.reduce((sum, item) => sum + item.nombre, 0);
    const totalValeur = result.reduce((sum, item) => sum + item.total, 0);
    
    return { rows: result, totalNombre, totalValeur };
  };

  const edenred = aggregateBrandData('edenred');
  const pluxee = aggregateBrandData('pluxee');
  const bimpli = aggregateBrandData('bimpli');
  const up = aggregateBrandData('up');

  const grandTotalNombre = edenred.totalNombre + pluxee.totalNombre + bimpli.totalNombre + up.totalNombre;
  const grandTotalValeur = edenred.totalValeur + pluxee.totalValeur + bimpli.totalValeur + up.totalValeur;

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(num);
  };

  const formatTotalValeur = (num: number) => {
    if (num === 0) return '';
    // Total affiché comme sur Excel (souvent sans symbole € sur la ligne Total)
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
  };

  const renderBrandTable = (title: string, data: any, headerBg: string, textColor: string) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-w-[240px]">
      <div className={`${headerBg} ${textColor} px-4 py-3 font-bold text-center text-sm uppercase tracking-wide border-b border-slate-200`}>
        {title}
      </div>
      <table className="w-max min-w-full text-sm text-left whitespace-nowrap">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
          <tr>
            <th className="px-3 py-2 font-bold text-center w-20 border-r border-slate-100"></th>
            <th className="px-3 py-2 font-bold text-center w-20 border-r border-slate-100">Nombre</th>
            <th className="px-3 py-2 font-bold text-center w-24">Valeur</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <tr className="bg-rose-50/30">
            <td className="px-3 py-2 border-r border-slate-100 text-rose-600 font-bold">Total</td>
            <td className="px-3 py-2 border-r border-slate-100 text-rose-600 font-bold text-right">
              {data.totalNombre > 0 ? data.totalNombre : ''}
            </td>
            <td className="px-3 py-2 text-rose-600 font-bold text-right">
              {formatTotalValeur(data.totalValeur)}
            </td>
          </tr>
          {data.rows.map((row: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-3 py-2 border-r border-slate-100 text-right font-medium text-slate-600">{formatCurrency(row.valeur)}</td>
              <td className="px-3 py-2 border-r border-slate-100 text-right font-medium text-slate-700">{row.nombre}</td>
              <td className="px-3 py-2 text-right font-medium text-slate-700">{formatCurrency(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

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
          Remise Mensuelle Titres Restaurants
        </div>
        <div style={{ width: 140 }} /> {/* Spacer for balance */}
      </header>

      <div className="max-w-[1400px] w-full mx-auto px-6 flex flex-col flex-1 min-h-0 py-6">
        <div className="mb-8 flex flex-col items-center justify-center text-center shrink-0">
          <div className="bg-amber-100 text-amber-800 px-6 py-3 rounded-xl font-bold text-lg shadow-sm border border-amber-200 inline-block mb-2">
            {months[month]} {year}
          </div>
        </div>

        {/* Bloc tables */}
        <div className="flex flex-wrap justify-center items-start gap-8 overflow-auto pb-8">
          {renderBrandTable('EDENRED', edenred, 'bg-amber-100', 'text-amber-800')}
          {renderBrandTable('PLUXEE', pluxee, 'bg-blue-100', 'text-blue-800')}
          {renderBrandTable('BIMPLI', bimpli, 'bg-emerald-100', 'text-emerald-800')}
          {renderBrandTable('UP', up, 'bg-slate-100', 'text-slate-800')}

          {/* TOTAL MOIS */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-w-[240px]">
            <div className="bg-orange-100 text-orange-800 px-4 py-3 font-bold text-center text-sm uppercase tracking-wide border-b border-slate-200">
              TOTAL MOIS
            </div>
            <table className="w-max min-w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2 font-bold text-center w-1/2 border-r border-slate-100">Nombre</th>
                  <th className="px-3 py-2 font-bold text-center w-1/2">Valeur</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-rose-50/30">
                  <td className="px-3 py-4 border-r border-slate-100 text-rose-600 font-bold text-center text-lg">
                    {grandTotalNombre > 0 ? grandTotalNombre : '-'}
                  </td>
                  <td className="px-3 py-4 text-rose-600 font-bold text-center text-lg">
                    {grandTotalValeur > 0 ? formatTotalValeur(grandTotalValeur) : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
