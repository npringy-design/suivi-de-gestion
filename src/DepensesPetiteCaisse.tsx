import React, { useState } from 'react';
import { useData } from './DataContext';

const CurrencyInput = ({ value, onChange, className }: { value: string, onChange: (val: string) => void, className?: string }) => {
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
      className={className || "w-full p-2 bg-transparent outline-none text-center transition-colors focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md"}
      value={displayValue}
      onChange={(e) => { const val = e.target.value.replace(/[^0-9.,-]/g, ''); onChange(val); }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
  );
};

const DateInput = ({ value, onChange, className, year }: { value: string, onChange: (val: string) => void, className?: string, year: number }) => {
  const handleBlur = () => {
    if (!value) return;
    const parts = value.split('/');
    if (parts.length === 2) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      if (!isNaN(day) && !isNaN(month) && month >= 1 && month <= 12) {
        const date = new Date(year, month - 1, day);
        const formatted = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        onChange(formatted);
      }
    }
  };
  return (
    <input
      type="text"
      className={className || "w-full p-2 bg-transparent outline-none text-center transition-colors focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={handleBlur}
    />
  );
};

type DepensesPetiteCaisseProps = { month: number; year: number; onBack: () => void; };
const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const NAV = '#1e293b';

export default function DepensesPetiteCaisse({ month, year, onBack }: DepensesPetiteCaisseProps) {
  const { data, updateDepensesPetiteCaisse } = useData();
  const monthData = data[month]?.depensesPetiteCaisse || {
    solde_debut_mois: '',
    achats: Array(30).fill({ date: '', fournisseur: '', description: '', ht: '', tva: '' }),
    alimentations: Array(5).fill({ date: '', montant: '' }),
    comptabilisation: { c606310: '', c606300: '', c606400: '', c626100: '', c627100: '', c44566: '', c758: '' },
    comptage: { p100: '', p50: '', p20: '', p10: '', p5: '', p2: '', p1: '', p050: '', p020: '', p010: '', p005: '', p002: '', p001: '' }
  };

  const parseVal = (val: string | undefined) => { const p = parseFloat((val || '').replace(',', '.')); return isNaN(p) ? 0 : p; };
  const fmt = (num: number) => num === 0 ? '-   €' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);

  const handleAchatChange = (i: number, f: string, v: string) => updateDepensesPetiteCaisse(month, `achats[${i}].${f}`, v);
  const handleAlimChange = (i: number, f: string, v: string) => updateDepensesPetiteCaisse(month, `alimentations[${i}].${f}`, v);
  const handleComptaChange = (f: string, v: string) => updateDepensesPetiteCaisse(month, `comptabilisation.${f}`, v);
  const handleComptageChange = (f: string, v: string) => updateDepensesPetiteCaisse(month, `comptage.${f}`, v);

  const calculateSoldeDebut = (m: number): number => {
    let solde = parseVal(data[0]?.depensesPetiteCaisse?.solde_debut_mois);
    for (let i = 0; i < m; i++) {
      const mData = data[i]?.depensesPetiteCaisse;
      if (!mData) continue;
      let tTtc = 0; mData.achats.forEach((a: any) => tTtc += parseVal(a.ht) + parseVal(a.tva));
      let tAlim = 0; mData.alimentations.forEach((a: any) => tAlim += parseVal(a.montant));
      let sReel = 0;
      const cv = { p100:100,p50:50,p20:20,p10:10,p5:5,p2:2,p1:1,p050:0.5,p020:0.2,p010:0.1,p005:0.05,p002:0.02,p001:0.01 };
      Object.entries(cv).forEach(([k,v]) => { sReel += parseVal(mData.comptage[k as keyof typeof mData.comptage]) * v; });
      if (sReel > 0) solde = sReel; else solde = solde + tAlim - tTtc;
    }
    return solde;
  };

  let totalHt = 0, totalTva = 0, totalTtc = 0;
  monthData.achats.forEach((a: any) => { const ht=parseVal(a.ht),tva=parseVal(a.tva); totalHt+=ht; totalTva+=tva; totalTtc+=ht+tva; });
  let totalAlimentation = 0;
  monthData.alimentations.forEach((a: any) => { totalAlimentation += parseVal(a.montant); });
  const soldeDebut = month === 0 ? parseVal(monthData.solde_debut_mois) : calculateSoldeDebut(month);
  const soldeTheo = soldeDebut + totalAlimentation - totalTtc;
  const coinValues = { p100:100,p50:50,p20:20,p10:10,p5:5,p2:2,p1:1,p050:0.5,p020:0.2,p010:0.1,p005:0.05,p002:0.02,p001:0.01 };
  let soldeReel = 0;
  Object.entries(coinValues).forEach(([key,value]) => { soldeReel += parseVal(monthData.comptage[key as keyof typeof monthData.comptage]) * value; });
  const ecart = soldeReel - soldeTheo;

  return (
    <div className="h-screen bg-slate-50 font-sans flex flex-col overflow-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap'); *{box-sizing:border-box} button{outline:none}`}</style>

      <header style={{ background: NAV, height: 64, padding: '0 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 0 rgba(255,255,255,.05)', flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1', cursor: 'pointer', background: 'none', border: 'none', padding: '8px 0', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', transition: 'color 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Retour Synthèse
        </button>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Dépenses Petite Caisse</div>
        <div style={{ width: 140 }} />
      </header>

      {/* Body scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] w-full mx-auto px-6 py-6 flex gap-6 items-start">

          {/* ── COLONNE GAUCHE ── */}
          <div className="flex-1 min-w-0">

            {/* Titre + solde début */}
            <div className="bg-white rounded-t-2xl border border-slate-200 border-b-0 px-4 py-3 flex items-center gap-4">
              <div className="bg-amber-100 text-amber-800 px-5 py-2 rounded-xl font-bold text-base border border-amber-200 whitespace-nowrap">
                {MONTHS[month]} {year}
              </div>
              <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 font-bold text-slate-600 text-sm border-r border-slate-200 whitespace-nowrap">
                  SOLDE CAISSE DEBUT MOIS :
                </div>
                <div className={`w-36 ${month === 0 ? 'bg-orange-50' : 'bg-slate-50'}`}>
                  {month === 0 ? (
                    <input type="text" className="w-full h-full px-3 py-2 bg-transparent text-right font-bold text-slate-800 outline-none focus:bg-white transition-colors text-sm"
                      value={monthData.solde_debut_mois} onChange={(e) => updateDepensesPetiteCaisse(month, 'solde_debut_mois', e.target.value)} />
                  ) : (
                    <div className="w-full h-full px-3 py-2 text-right font-bold text-slate-800 text-sm">{fmt(soldeDebut)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Tableau achats */}
            <div className="bg-white border border-slate-200 border-b-0">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 font-bold text-center w-24 border-r border-slate-200">Date</th>
                    <th className="px-3 py-2.5 font-bold text-center w-44 border-r border-slate-200">Fournisseur</th>
                    <th className="px-3 py-2.5 font-bold text-center border-r border-slate-200">Description achat</th>
                    <th className="px-3 py-2.5 font-bold text-center w-28 border-r border-slate-200">HT</th>
                    <th className="px-3 py-2.5 font-bold text-center w-28 border-r border-slate-200">TVA</th>
                    <th className="px-3 py-2.5 font-bold text-center w-28">TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthData.achats.map((achat: any, i: number) => {
                    const ht = parseVal(achat.ht), tva = parseVal(achat.tva), ttc = ht + tva;
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-1 py-0.5 border-r border-slate-100">
                          <div className="bg-orange-50/50 rounded border border-orange-100/50 group-hover:border-orange-200 transition-colors">
                            <DateInput year={year} className="w-full px-2 py-1.5 bg-transparent outline-none text-center text-slate-700 font-medium text-xs" value={achat.date} onChange={(v) => handleAchatChange(i,'date',v)} />
                          </div>
                        </td>
                        <td className="px-1 py-0.5 border-r border-slate-100">
                          <input type="text" className="w-full px-2 py-1.5 bg-transparent outline-none text-slate-700 uppercase text-xs focus:bg-white focus:ring-1 focus:ring-blue-400 rounded border border-transparent hover:border-slate-200" value={achat.fournisseur} onChange={(e) => handleAchatChange(i,'fournisseur',e.target.value.toUpperCase())} />
                        </td>
                        <td className="px-1 py-0.5 border-r border-slate-100">
                          <input type="text" className="w-full px-2 py-1.5 bg-transparent outline-none text-slate-700 uppercase text-xs focus:bg-white focus:ring-1 focus:ring-blue-400 rounded border border-transparent hover:border-slate-200" value={achat.description} onChange={(e) => handleAchatChange(i,'description',e.target.value.toUpperCase())} />
                        </td>
                        <td className="px-1 py-0.5 border-r border-slate-100">
                          <CurrencyInput className="w-full px-2 py-1.5 bg-transparent outline-none text-right text-slate-700 font-medium text-xs focus:bg-white focus:ring-1 focus:ring-blue-400 rounded border border-transparent hover:border-slate-200" value={achat.ht} onChange={(v) => handleAchatChange(i,'ht',v)} />
                        </td>
                        <td className="px-1 py-0.5 border-r border-slate-100">
                          <CurrencyInput className="w-full px-2 py-1.5 bg-transparent outline-none text-right text-slate-700 font-medium text-xs focus:bg-white focus:ring-1 focus:ring-blue-400 rounded border border-transparent hover:border-slate-200" value={achat.tva} onChange={(v) => handleAchatChange(i,'tva',v)} />
                        </td>
                        <td className="px-3 py-1.5 text-right font-bold text-slate-700 bg-slate-50/50 text-xs">{ttc !== 0 ? fmt(ttc) : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-800 text-white font-bold">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-center border-r border-slate-700 text-sm">TOTAL</td>
                    <td className="px-3 py-3 text-right border-r border-slate-700 text-sm">{totalHt !== 0 ? fmt(totalHt) : '-'}</td>
                    <td className="px-3 py-3 text-right border-r border-slate-700 text-sm">{totalTva !== 0 ? fmt(totalTva) : '-'}</td>
                    <td className="px-3 py-3 text-right text-sm">{totalTtc !== 0 ? fmt(totalTtc) : '-'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Résumé collé sous le tableau */}
            <div className="bg-white rounded-b-2xl border border-slate-200">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">Solde caisse fin de mois théo</span>
                <span className="text-sm font-bold text-slate-800">{soldeTheo !== 0 ? fmt(soldeTheo) : '-'}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3 bg-blue-50 border-b border-blue-100">
                <span className="text-sm font-bold text-blue-800 uppercase tracking-wide">Solde caisse réel</span>
                <span className="text-base font-extrabold text-blue-900">{soldeReel !== 0 ? fmt(soldeReel) : '-   €'}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Écart</span>
                <span className={`text-base font-extrabold ${ecart > 0 ? 'text-emerald-600' : ecart < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {ecart !== 0 ? fmt(ecart) : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* ── COLONNE DROITE ── */}
          <div className="w-80 flex flex-col gap-4 flex-shrink-0">

            {/* Alimentation caisse bureau */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-700 text-xs uppercase tracking-wide">
                Alimentation caisse bureau
              </div>
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2 font-bold text-center w-1/2 border-r border-slate-100">Date</th>
                    <th className="px-3 py-2 font-bold text-center w-1/2">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthData.alimentations.map((alim: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-1 py-0.5 border-r border-slate-100">
                        <div className="bg-orange-50/50 rounded border border-orange-100/50 group-hover:border-orange-200 transition-colors">
                          <DateInput year={year} className="w-full px-2 py-1.5 bg-transparent outline-none text-center text-slate-700 font-medium text-xs" value={alim.date} onChange={(v) => handleAlimChange(i,'date',v)} />
                        </div>
                      </td>
                      <td className="px-1 py-0.5">
                        <CurrencyInput className="w-full px-2 py-1.5 bg-transparent outline-none text-right text-slate-700 font-medium text-xs focus:bg-white focus:ring-1 focus:ring-blue-400 rounded border border-transparent hover:border-slate-200" value={alim.montant} onChange={(v) => handleAlimChange(i,'montant',v)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-800 text-white font-bold">
                  <tr>
                    <td className="px-3 py-2.5 text-center border-r border-slate-700 text-xs">Total</td>
                    <td className="px-3 py-2.5 text-right text-blue-200 text-xs">{totalAlimentation !== 0 ? fmt(totalAlimentation) : '0,00 €'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pour comptabilisation */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-700 text-xs uppercase tracking-wide">
                Pour comptabilisation
              </div>
              <div className="flex flex-col">
                {[
                  { code: '606310', key: 'c606310', bg: 'bg-slate-100 text-slate-700' },
                  { code: '606300', key: 'c606300', bg: 'bg-emerald-100 text-emerald-800' },
                  { code: '606400', key: 'c606400', bg: 'bg-blue-100 text-blue-800' },
                  { code: '626100', key: 'c626100', bg: 'bg-orange-100 text-orange-800' },
                  { code: '627100', key: 'c627100', bg: 'bg-amber-100 text-amber-800' },
                  { code: '44566',  key: 'c44566',  bg: 'bg-white text-slate-700' },
                  { code: '758',    key: 'c758',    bg: 'bg-white text-slate-700' },
                ].map((item) => (
                  <div key={item.key} className="flex border-b border-slate-100 last:border-b-0">
                    <div className={`w-1/2 px-3 py-2 text-center font-bold border-r border-slate-100 text-xs ${item.bg}`}>{item.code}</div>
                    <div className="w-1/2 p-1 bg-orange-50/30">
                      <input type="text" className="w-full h-full px-2 py-1.5 bg-transparent outline-none text-right text-slate-700 font-medium text-xs focus:bg-white focus:ring-1 focus:ring-blue-400 rounded"
                        value={monthData.comptabilisation[item.key as keyof typeof monthData.comptabilisation]}
                        onChange={(e) => handleComptaChange(item.key, e.target.value)} placeholder="-" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comptage Pièces/billets */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-700 text-xs uppercase tracking-wide">
                Comptage Pièces/billets
              </div>
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2 font-bold text-right border-r border-slate-100 w-1/3">Valeur</th>
                    <th className="px-3 py-2 font-bold text-center border-r border-slate-100 w-1/3">Nombre</th>
                    <th className="px-3 py-2 font-bold text-right w-1/3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { label: '100,00 €', key: 'p100', val: 100 },
                    { label: '50,00 €',  key: 'p50',  val: 50 },
                    { label: '20,00 €',  key: 'p20',  val: 20 },
                    { label: '10,00 €',  key: 'p10',  val: 10 },
                    { label: '5,00 €',   key: 'p5',   val: 5 },
                    { label: '2,00 €',   key: 'p2',   val: 2 },
                    { label: '1,00 €',   key: 'p1',   val: 1 },
                    { label: '0,50 €',   key: 'p050', val: 0.5 },
                    { label: '0,20 €',   key: 'p020', val: 0.2 },
                    { label: '0,10 €',   key: 'p010', val: 0.1 },
                    { label: '0,05 €',   key: 'p005', val: 0.05 },
                    { label: '0,02 €',   key: 'p002', val: 0.02 },
                    { label: '0,01 €',   key: 'p001', val: 0.01 },
                  ].map((item) => {
                    const count = parseVal(monthData.comptage[item.key as keyof typeof monthData.comptage]);
                    const total = count * item.val;
                    return (
                      <tr key={item.key} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-3 py-1 text-right font-medium text-slate-600 border-r border-slate-100">{item.label}</td>
                        <td className="px-1 py-0.5 border-r border-slate-100">
                          <div className="bg-orange-50/50 rounded border border-orange-100/50 group-hover:border-orange-200 transition-colors">
                            <input type="text" className="w-full px-2 py-1 bg-transparent outline-none text-center text-slate-700 font-medium focus:bg-white focus:ring-1 focus:ring-blue-400 rounded"
                              value={monthData.comptage[item.key as keyof typeof monthData.comptage]}
                              onChange={(e) => handleComptageChange(item.key, e.target.value)} />
                          </div>
                        </td>
                        <td className="px-3 py-1 text-right font-semibold text-slate-700">{total !== 0 ? fmt(total) : '-   €'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-800 text-white font-bold">
                  <tr>
                    <td colSpan={2} className="px-3 py-2.5 text-center border-r border-slate-700">TOTAL</td>
                    <td className="px-3 py-2.5 text-right text-blue-200">{soldeReel !== 0 ? fmt(soldeReel) : '-   €'}</td>
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
