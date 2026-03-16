import React, { useState } from 'react';
import { useData, DayDataVisuTRPapiers, DayDataSaisieTR } from './DataContext';

interface VisuTRPapiersProps {
  month: number;
  year: number;
  onBack: () => void;
}

const NAV = '#1e293b';
const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
const formatDate = (d: number, m: number, y: number) =>
  new Date(y, m, d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const CurrencyInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [focused, setFocused] = useState(false);
  let display = value;
  if (!focused && value) {
    const n = parseFloat(value.replace(',', '.'));
    if (!isNaN(n)) display = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
  return (
    <input type="text"
      className="w-full p-2 bg-transparent outline-none text-right text-slate-700 font-medium focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md transition-colors border border-transparent hover:border-slate-200"
      value={display}
      onChange={e => onChange(e.target.value.replace(/[^0-9.,-]/g, ''))}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
};

const NumberInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <input type="text"
    className="w-full p-2 bg-transparent outline-none text-right text-slate-700 font-medium focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md transition-colors border border-transparent hover:border-slate-200"
    value={value}
    onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
  />
);

export default function VisuTRPapiers({ month, year, onBack }: VisuTRPapiersProps) {
  const { data: globalData, updateVisuTRPapiers } = useData();
  const days = Array.from({ length: getDaysInMonth(month, year) }, (_, i) => i + 1);
  const monthData = globalData[month] || {};
  const data = monthData.visuTRPapiers || {};
  const theoriqueData = monthData.theorique || {};
  const saisieTRData = monthData.saisieTR || {};

  const parseVal = (v: string) => { const n = parseFloat((v || '').replace(',', '.')); return isNaN(n) ? 0 : n; };
  const fmt = (n: number) => n === 0 ? '0,00 €' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  const getSaisie = (day: number) => {
    const d = saisieTRData[day];
    if (!d) return { nombre: 0, valeur: 0 };
    let nb = 0, val = 0;
    (['edenred', 'pluxee', 'bimpli', 'up'] as (keyof DayDataSaisieTR)[]).forEach(p => {
      (d[p] || []).forEach((e: any) => { nb += parseVal(e.nombre); val += parseVal(e.valeur) * parseVal(e.nombre); });
    });
    return { nombre: nb, valeur: val };
  };

  const totalTheo = days.reduce((s, d) => s + parseVal(theoriqueData[d]?.tr_papier || ''), 0);
  const totalSaisie = days.reduce((s, d) => { const t = getSaisie(d); return { nombre: s.nombre + t.nombre, valeur: s.valeur + t.valeur }; }, { nombre: 0, valeur: 0 });
  const totalEnv = days.reduce((s, d) => s + parseVal(data[d]?.total_enveloppes_tr || ''), 0);

  const tableScrollRef = React.useRef<HTMLDivElement>(null);
  const mirrorScrollRef = React.useRef<HTMLDivElement>(null);
  const phantomRef = React.useRef<HTMLDivElement>(null);
  const isSyncingRef = React.useRef(false);

  React.useEffect(() => {
    const table = tableScrollRef.current, mirror = mirrorScrollRef.current, phantom = phantomRef.current;
    if (!table || !mirror || !phantom) return;
    const syncWidth = () => { phantom.style.width = table.scrollWidth + 'px'; };
    syncWidth();
    const ro = new ResizeObserver(syncWidth); ro.observe(table);
    const onTable = () => { if (isSyncingRef.current) return; isSyncingRef.current = true; mirror.scrollLeft = table.scrollLeft; isSyncingRef.current = false; };
    const onMirror = () => { if (isSyncingRef.current) return; isSyncingRef.current = true; table.scrollLeft = mirror.scrollLeft; isSyncingRef.current = false; };
    table.addEventListener('scroll', onTable); mirror.addEventListener('scroll', onMirror);
    return () => { table.removeEventListener('scroll', onTable); mirror.removeEventListener('scroll', onMirror); ro.disconnect(); };
  }, []);

  const cls = (v: number) => v < -0.001 ? 'text-rose-600 bg-rose-50/50' : v > 0.001 ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-400 bg-slate-50/50';

  return (
    <div className="h-screen bg-slate-50 font-sans flex flex-col overflow-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap'); *{box-sizing:border-box} button{outline:none}`}</style>

      <header style={{ background: NAV, height: 64, padding: '0 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 0 rgba(255,255,255,.05)', flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1', cursor: 'pointer', background: 'none', border: 'none', padding: '8px 0', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', transition: 'color 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Retour Synthèse
        </button>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tickets Restaurant Papier – Réel</div>
        <div style={{ width: 140 }} />
      </header>

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
                    <th colSpan={2} className="px-4 py-3 border-r border-slate-200 bg-white sticky left-0 z-30" />
                    <th colSpan={3} className="px-4 py-3 text-center font-bold bg-emerald-50 text-emerald-800 border-r border-slate-200">INVENTAIRE QUOTIDIEN</th>
                    <th colSpan={5} className="px-4 py-3 text-center font-bold bg-orange-50 text-orange-800 border-r border-slate-200">BORDEREAUX DE COLLECTES TR</th>
                    <th className="px-4 py-3 bg-white" />
                  </tr>
                  <tr className="sticky top-[40px] z-20">
                    <th className="px-2 py-3 font-bold text-center w-24 border-r border-slate-200 bg-slate-100 sticky left-0 z-30">Date</th>
                    <th className="px-2 py-3 font-bold text-center w-24 border-r border-slate-300 bg-blue-50 text-blue-800">TR Théo.</th>
                    <th className="px-2 py-3 font-bold text-center w-16 border-r border-slate-200 bg-emerald-50/60 text-emerald-700">Nb TR</th>
                    <th className="px-2 py-3 font-bold text-center w-24 border-r border-slate-200 bg-emerald-50/60 text-emerald-700">Montant TR</th>
                    <th className="px-2 py-3 font-bold text-center w-24 border-r border-slate-300 bg-slate-100 text-slate-600">Écart Inv.</th>
                    <th className="px-2 py-3 font-bold text-center w-24 border-r border-slate-200 bg-orange-50/60 text-orange-700">N° Bord.</th>
                    <th className="px-2 py-3 font-bold text-center w-20 border-r border-slate-200 bg-orange-50/60 text-orange-700">Nb TR Env.</th>
                    <th className="px-2 py-3 font-bold text-center w-24 border-r border-slate-200 bg-orange-50/60 text-orange-700">Total Env. TR</th>
                    <th className="px-2 py-3 font-bold text-center w-24 border-r border-slate-200 bg-slate-100 text-slate-600 whitespace-normal leading-tight">Écart Env.</th>
                    <th className="px-2 py-3 font-bold text-center w-24 border-r border-slate-200 bg-slate-100 text-slate-600 whitespace-normal leading-tight">Contrôle</th>
                    <th className="px-2 py-3 font-bold text-center min-w-[140px] bg-white text-slate-700">Commentaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {days.map(day => {
                    const dd = data[day] || { n_bordereaux: '', nbre_tr_enveloppes: '', total_enveloppes_tr: '', commentaire: '' };
                    const theoVal = parseVal(theoriqueData[day]?.tr_papier || '');
                    const saisie = getSaisie(day);
                    const ecartInv = saisie.valeur - theoVal;
                    const totalEnvDay = parseVal(dd.total_enveloppes_tr);
                    const ecartEnv = totalEnvDay - saisie.valeur;
                    const controle = totalEnvDay - theoVal;
                    return (
                      <tr key={day} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-2 py-2 text-center text-xs font-medium text-slate-600 bg-slate-50 sticky left-0 z-10 border-r border-slate-200">{formatDate(day, month, year)}</td>
                        <td className="px-4 py-2 text-right font-bold text-blue-700 bg-blue-50/40 border-r border-slate-300">{theoVal > 0 ? fmt(theoVal) : '-'}</td>
                        <td className="px-4 py-2 text-center text-slate-600 bg-emerald-50/20 border-r border-slate-200">{saisie.nombre > 0 ? saisie.nombre : '-'}</td>
                        <td className="px-4 py-2 text-right text-slate-600 bg-emerald-50/20 border-r border-slate-200">{saisie.valeur > 0 ? fmt(saisie.valeur) : '-'}</td>
                        <td className={`px-4 py-2 text-right font-bold border-r border-slate-300 ${cls(ecartInv)}`}>{ecartInv === 0 ? '-' : fmt(ecartInv)}</td>
                        <td className="px-1 py-1 border-r border-slate-200 bg-orange-50/20">
                          <input type="text" className="w-full p-2 bg-transparent outline-none text-center text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md border border-transparent hover:border-slate-200" value={dd.n_bordereaux} onChange={e => updateVisuTRPapiers(month, day, 'n_bordereaux', e.target.value)} />
                        </td>
                        <td className="px-1 py-1 border-r border-slate-200 bg-orange-50/20">
                          <NumberInput value={dd.nbre_tr_enveloppes} onChange={v => updateVisuTRPapiers(month, day, 'nbre_tr_enveloppes', v)} />
                        </td>
                        <td className="px-1 py-1 border-r border-slate-200 bg-orange-50/20">
                          <CurrencyInput value={dd.total_enveloppes_tr} onChange={v => updateVisuTRPapiers(month, day, 'total_enveloppes_tr', v)} />
                        </td>
                        <td className={`px-4 py-2 text-right font-bold border-r border-slate-200 ${cls(ecartEnv)}`}>{fmt(ecartEnv)}</td>
                        <td className={`px-4 py-2 text-right font-bold border-r border-slate-200 ${cls(controle)}`}>{fmt(controle)}</td>
                        <td className="px-1 py-1">
                          <input type="text" className="w-full p-2 bg-transparent outline-none text-slate-600 focus:bg-white focus:ring-2 focus:ring-blue-400 rounded-md border border-transparent hover:border-slate-200" value={dd.commentaire} onChange={e => updateVisuTRPapiers(month, day, 'commentaire', e.target.value)} placeholder="Ajouter une note..." />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-800 text-white font-bold sticky bottom-0 z-20">
                  <tr>
                    <td className="px-4 py-4 text-center border-r border-slate-700 rounded-bl-2xl sticky left-0 z-30 bg-slate-800">TOTAL</td>
                    <td className="px-4 py-4 text-right text-blue-200 border-r border-slate-700">{fmt(totalTheo)}</td>
                    <td className="px-4 py-4 text-center border-r border-slate-700">{totalSaisie.nombre > 0 ? totalSaisie.nombre : '-'}</td>
                    <td className="px-4 py-4 text-right border-r border-slate-700">{fmt(totalSaisie.valeur)}</td>
                    <td className={`px-4 py-4 text-right border-r border-slate-700 ${totalSaisie.valeur - totalTheo < -0.001 ? 'text-rose-300' : totalSaisie.valeur - totalTheo > 0.001 ? 'text-emerald-300' : 'text-slate-400'}`}>{totalSaisie.valeur - totalTheo === 0 ? '-' : fmt(totalSaisie.valeur - totalTheo)}</td>
                    <td className="px-4 py-4 border-r border-slate-700" /><td className="px-4 py-4 border-r border-slate-700" />
                    <td className="px-4 py-4 text-right border-r border-slate-700">{fmt(totalEnv)}</td>
                    <td className={`px-4 py-4 text-right border-r border-slate-700 ${totalEnv - totalSaisie.valeur < -0.001 ? 'text-rose-300' : totalEnv - totalSaisie.valeur > 0.001 ? 'text-emerald-300' : 'text-slate-400'}`}>{totalEnv - totalSaisie.valeur === 0 ? '-' : fmt(totalEnv - totalSaisie.valeur)}</td>
                    <td className={`px-4 py-4 text-right border-r border-slate-700 ${totalEnv - totalTheo < -0.001 ? 'text-rose-300' : totalEnv - totalTheo > 0.001 ? 'text-emerald-300' : 'text-slate-400'}`}>{totalEnv - totalTheo === 0 ? '-' : fmt(totalEnv - totalTheo)}</td>
                    <td className="px-4 py-4 rounded-br-2xl" />
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
