import React, { useState } from 'react';

interface SyntheseCAProps {
  onBack: () => void;
  onSaisieTheorique: (month: number) => void;
  onCbNepting: (month: number) => void;
  onEspeces: (month: number) => void;
  onConecs: (month: number) => void;
  onAncvPapiers: (month: number) => void;
  onSaisieTR: (month: number) => void;
  onVisuTRPapiers: (month: number) => void;
  onSunday: (month: number) => void;
  onUber: (month: number) => void;
  onAmexAncv: (month: number) => void;
  onDeliveroo: (month: number) => void;
  onClickCollect: (month: number) => void;
  onRemiseTR: (month: number) => void;
  onBilanSynthese: (month: number) => void;
  onDepensesPetiteCaisse: (month: number) => void;
}

const MONTHS = [
  'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'
];

const NAV = '#1e293b';

export default function SyntheseCA({ 
  onBack, onSaisieTheorique, onCbNepting, onEspeces, onConecs, 
  onAncvPapiers, onSaisieTR, onVisuTRPapiers, onSunday, onUber, 
  onAmexAncv, onDeliveroo, onClickCollect, onRemiseTR, 
  onBilanSynthese, onDepensesPetiteCaisse 
}: SyntheseCAProps) {
  const [selectedMonth, setSelectedMonth] = useState(2); // Default to MARS (index 2)

  const Btn = ({ onClick, children, colorClass }: { onClick: () => void, children: React.ReactNode, colorClass: string }) => {
    return (
      <button 
        onClick={onClick}
        className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wide transition-all duration-200 border-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${colorClass}`}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="h-screen bg-slate-50 font-sans flex flex-col overflow-y-auto" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
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
          Retour Accueil
        </button>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Synthèse CA Comptable
        </div>
        <div style={{ width: 140 }} /> {/* Spacer for balance */}
      </header>

      {/* Main Content */}
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-5 px-6 py-6">
        
        {/* Title Rows */}
        <div className="bg-slate-800 text-white rounded-xl py-4 text-center font-extrabold tracking-[0.2em] text-xl uppercase shadow-md">
          HIP THILL
        </div>
        
        <div className="bg-white border-2 border-slate-200 rounded-xl relative shadow-sm hover:border-slate-300 transition-colors">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full py-4 text-center bg-transparent appearance-none cursor-pointer outline-none font-extrabold text-lg uppercase tracking-widest text-slate-700"
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-6 flex items-center text-slate-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </div>
        </div>

        {/* Section 1 */}
        <div className="mt-4">
          <Btn 
            onClick={() => onSaisieTheorique(selectedMonth)}
            colorClass="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-300"
          >
            SAISIE DU THEORIQUE (Feuille de caisse)
          </Btn>
        </div>

        {/* Section 2 */}
        <div className="flex items-center justify-center mt-6 mb-2">
          <div className="h-px bg-slate-200 flex-1"></div>
          <div className="px-4 text-center font-bold text-slate-400 text-xs uppercase tracking-widest">
            SAISIE DU REEL (Encaissé)
          </div>
          <div className="h-px bg-slate-200 flex-1"></div>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {/* Left Column */}
          <div className="flex flex-col gap-4">
            <Btn onClick={() => onCbNepting(selectedMonth)} colorClass="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300">
              CB (NEPTING)
            </Btn>
            <Btn onClick={() => onEspeces(selectedMonth)} colorClass="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300">
              ESPECES
            </Btn>
            <Btn onClick={() => onVisuTRPapiers(selectedMonth)} colorClass="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300">
              VISU TICKETS RESTAURANTS PAPIERS
            </Btn>
            <Btn onClick={() => onSunday(selectedMonth)} colorClass="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300">
              Sunday QR CODE ET CHEQUE
            </Btn>
            <Btn onClick={() => onUber(selectedMonth)} colorClass="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300">
              UBER
            </Btn>
            <div className="mt-2">
              <Btn onClick={() => onSaisieTR(selectedMonth)} colorClass="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300">
                SAISIE DES TICKETS RESTAURANTS
              </Btn>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4">
            <Btn onClick={() => onConecs(selectedMonth)} colorClass="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300">
              CONECS (CARTE TR)
            </Btn>
            <Btn onClick={() => onAncvPapiers(selectedMonth)} colorClass="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300">
              ANCV PAPIERS
            </Btn>
            <Btn onClick={() => onAmexAncv(selectedMonth)} colorClass="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300">
              AMEX + ANCV CARTE
            </Btn>
            <Btn onClick={() => onDeliveroo(selectedMonth)} colorClass="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300">
              DELIVEROO
            </Btn>
            <Btn onClick={() => onClickCollect(selectedMonth)} colorClass="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300">
              CLIC AND COLLECT
            </Btn>
            <div className="mt-2">
              <Btn onClick={() => onRemiseTR(selectedMonth)} colorClass="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300">
                REMISE MENSUELLE TITRES RESTAURANTS
              </Btn>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="mt-8">
          <Btn 
            onClick={() => onBilanSynthese(selectedMonth)}
            colorClass="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 py-4"
          >
            BILAN SYNTHESE
          </Btn>
        </div>

        {/* Section 4 */}
        <div className="mt-2">
          <Btn 
            onClick={() => onDepensesPetiteCaisse(selectedMonth)}
            colorClass="bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:border-slate-300 py-4"
          >
            DEPENSES PETITES CAISSE
          </Btn>
        </div>

      </div>
    </div>
  );
}
