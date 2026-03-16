import React, { useState } from 'react';
import { useData, DayDataSaisieTR } from './DataContext';

interface BilanSyntheseProps {
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

const NAV = '#1e293b';

const CurrencyInput = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const [isFocused, setIsFocused] = useState(false);

  let displayValue = value;
  if (!isFocused && value) {
    const num = parseFloat(value.replace(',', '.'));
    if (!isNaN(num)) {
      displayValue = new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    }
  }

  return (
    <input
      type="text"
      className={`w-full h-full p-2 bg-transparent outline-none text-center transition-colors ${isFocused ? 'bg-white ring-2 ring-inset ring-blue-400' : ''}`}
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

export default function BilanSynthese({ month, year, onBack }: BilanSyntheseProps) {

  // ── Mirror scrollbar ──────────────────────────────────────────────────────

  const { data: globalData, updateBilanSynthese } = useData();
  const daysInMonth = getDaysInMonth(month, year);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthData = globalData[month] || {};
  const theoriqueData = monthData.theorique || {};
  const neptingData = monthData.nepting || {};
  const especesData = monthData.especes || {};
  const conecsData = monthData.conecs || {};
  const ancvPapiersData = monthData.ancvPapiers || {};
  const saisieTRData = monthData.saisieTR || {};
  const sundayData = monthData.sunday || {};
  const uberData = monthData.uber || {};
  const amexAncvData = monthData.amexAncv || {};
  const deliverooData = monthData.deliveroo || {};
  const clickCollectData = monthData.clickCollect || {};
  const bilanData = monthData.bilanSynthese || {};

  const parseVal = (val: string | undefined) => {
    const parsed = parseFloat((val || '').replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatCurrency = (num: number) => {
    if (num === 0) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const getDeltaColorClass = (val: number) => {
    if (val > 0) return 'bg-emerald-500 text-white font-bold';
    if (val < 0) return 'bg-rose-500 text-white font-bold';
    return 'bg-white text-slate-400';
  };

  const getDeltaColorTotalClass = (val: number) => {
    if (val > 0) return 'bg-emerald-500 text-white font-bold';
    if (val < 0) return 'bg-rose-500 text-white font-bold';
    return 'text-slate-400';
  };

  const getSaisieTRTotal = (day: number) => {
    const dayData = saisieTRData[day];
    if (!dayData) return 0;
    let totalValeur = 0;
    const providers: (keyof DayDataSaisieTR)[] = ['edenred', 'pluxee', 'bimpli', 'up'];
    providers.forEach(provider => {
      const entries = dayData[provider] || [];
      entries.forEach(entry => {
        const v = parseVal(entry.valeur);
        const n = parseVal(entry.nombre);
        totalValeur += v * n;
      });
    });
    return totalValeur;
  };

  let sumTotalHt = 0;
  let sumTtc55 = 0;
  let sumHt55 = 0;
  let sumTtc10 = 0;
  let sumHt10 = 0;
  let sumTtc20 = 0;
  let sumHt20 = 0;
  let sumTva55 = 0;
  let sumTva10 = 0;
  let sumTva20 = 0;
  let sumTotalTtc = 0;
  let sumEcartCa = 0;

  let sumEspTheo = 0;
  let sumEspReel = 0;
  let sumEspDelta = 0;

  let sumCbTheo = 0;
  let sumCbReel = 0;
  let sumCbDelta = 0;

  let sumAmexTheo = 0;
  let sumAmexReel = 0;
  let sumAmexDelta = 0;

  let sumCbTrTheo = 0;
  let sumCbTrReel = 0;
  let sumCbTrDelta = 0;

  let sumDelivTheo = 0;
  let sumDelivReel = 0;
  let sumDelivDelta = 0;

  let sumUberTheo = 0;
  let sumUberReel = 0;
  let sumUberDelta = 0;

  let sumSundayTheo = 0;
  let sumSundayReel = 0;
  let sumSundayDelta = 0;

  let sumCeTheo = 0;
  let sumCeReel = 0;
  let sumCeDelta = 0;

  let sumCrtTheo = 0;
  let sumCrtReel = 0;
  let sumCrtDelta = 0;

  let sumAncvTheo = 0;
  let sumAncvReel = 0;
  let sumAncvDelta = 0;

  let sumBilanTheo = 0;
  let sumBilanReel = 0;
  let sumBilanEcart = 0;

  let sumPourboires = 0;

  days.forEach(day => {
    const dayBilan = bilanData[day] || { ttc_5_5: '', ttc_10: '', ttc_20: '' };
    const tTheorique = theoriqueData[day] || {};
    const tNepting = neptingData[day] || {};
    const tEspeces = especesData[day] || {};
    const tConecs = conecsData[day] || {};
    const tAncv = ancvPapiersData[day] || {};
    const tSunday = sundayData[day] || {};
    const tUber = uberData[day] || {};
    const tAmex = amexAncvData[day] || {};
    const tDeliveroo = deliverooData[day] || {};
    const tClickCollect = clickCollectData[day] || {};

    const ttc55 = parseVal(dayBilan.ttc_5_5);
    const ttc10 = parseVal(dayBilan.ttc_10);
    const ttc20 = parseVal(dayBilan.ttc_20);

    const ht55 = ttc55 / 1.055;
    const ht10 = ttc10 / 1.10;
    const ht20 = ttc20 / 1.20;
    const totalHt = ht55 + ht10 + ht20;
    const tva55 = ttc55 - ht55;
    const tva10 = ttc10 - ht10;
    const tva20 = ttc20 - ht20;
    const totalTtc = ttc55 + ttc10 + ttc20;

    const espTheo = parseVal(tTheorique.especes);
    const espReel = parseVal(tEspeces.mis_au_coffre) + parseVal(tEspeces.pieces);
    const espDelta = espReel - espTheo;

    const cbTheo = parseVal(tTheorique.cb);
    const cbReel = parseVal(tNepting.saisie_reel_nepting);
    const cbDelta = cbReel - (cbTheo + parseVal(tNepting.pourboire_sunday));

    const amexTheo = parseVal(tTheorique.amex);
    const amexReel = parseVal(tAmex.reel_nepting);
    const amexDelta = amexReel - amexTheo;

    const cbTrTheo = parseVal(tTheorique.tr_carte);
    const cbTrReel = parseVal(tConecs.conecs_reel_nepting);
    const cbTrDelta = cbTrReel - cbTrTheo;

    const delivTheo = parseVal(tTheorique.deliveroo);
    const delivReel = parseVal(tDeliveroo.reel);
    const delivDelta = delivReel - delivTheo;

    const uberTheo = parseVal(tTheorique.uber);
    const uberReel = parseVal(tUber.reel);
    const uberDelta = uberReel - uberTheo;

    const sundayTheo = parseVal(tTheorique.sunday);
    const sundayReel = parseVal(tSunday.reel);
    const sundayDelta = sundayReel - sundayTheo;

    const ceTheo = parseVal(tTheorique.click_collect);
    const ceReel = parseVal(tClickCollect.reel);
    const ceDelta = ceReel - ceTheo;

    const crtTheo = parseVal(tTheorique.tr_papier);
    const crtReel = getSaisieTRTotal(day);
    const crtDelta = crtReel - crtTheo;

    const ancvTheo = parseVal(tTheorique.ancv);
    const ancvReel = parseVal(tAncv.montant_total);
    const ancvDelta = ancvReel - ancvTheo;

    const pourboires = parseVal(tNepting.pourboire_sunday);

    const bilanTheo = espTheo + cbTheo + amexTheo + cbTrTheo + delivTheo + uberTheo + sundayTheo + ceTheo + crtTheo + ancvTheo;
    const bilanReel = espReel + cbReel + amexReel + cbTrReel + delivReel + uberReel + sundayReel + ceReel + crtReel + ancvReel;
    const bilanEcart = bilanReel - bilanTheo - pourboires;

    const ecartCa = totalTtc - bilanTheo;

    sumTotalHt += totalHt;
    sumTtc55 += ttc55;
    sumHt55 += ht55;
    sumTtc10 += ttc10;
    sumHt10 += ht10;
    sumTtc20 += ttc20;
    sumHt20 += ht20;
    sumTva55 += tva55;
    sumTva10 += tva10;
    sumTva20 += tva20;
    sumTotalTtc += totalTtc;
    sumEcartCa += ecartCa;

    sumEspTheo += espTheo;
    sumEspReel += espReel;
    sumEspDelta += espDelta;

    sumCbTheo += cbTheo;
    sumCbReel += cbReel;
    sumCbDelta += cbDelta;

    sumAmexTheo += amexTheo;
    sumAmexReel += amexReel;
    sumAmexDelta += amexDelta;

    sumCbTrTheo += cbTrTheo;
    sumCbTrReel += cbTrReel;
    sumCbTrDelta += cbTrDelta;

    sumDelivTheo += delivTheo;
    sumDelivReel += delivReel;
    sumDelivDelta += delivDelta;

    sumUberTheo += uberTheo;
    sumUberReel += uberReel;
    sumUberDelta += uberDelta;

    sumSundayTheo += sundayTheo;
    sumSundayReel += sundayReel;
    sumSundayDelta += sundayDelta;

    sumCeTheo += ceTheo;
    sumCeReel += ceReel;
    sumCeDelta += ceDelta;

    sumCrtTheo += crtTheo;
    sumCrtReel += crtReel;
    sumCrtDelta += crtDelta;

    sumAncvTheo += ancvTheo;
    sumAncvReel += ancvReel;
    sumAncvDelta += ancvDelta;

    sumBilanTheo += bilanTheo;
    sumBilanReel += bilanReel;
    sumBilanEcart += bilanEcart;

    sumPourboires += pourboires;
  });

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
          Bilan Synthèse
        </div>
        <div style={{ width: 140 }} /> {/* Spacer for balance */}
      </header>

      <div className="max-w-[98%] w-full mx-auto flex flex-col flex-1 min-h-0 py-6">
        <div className="mb-6 flex flex-col items-center justify-center text-center shrink-0">
          <div className="bg-rose-100 text-rose-800 px-6 py-3 rounded-xl font-bold text-sm shadow-sm border border-rose-200 inline-block mb-2 uppercase tracking-wide">
            Saisir uniquement les TTC par taux de TVA (5,5 / 10 / 20)
          </div>
        </div>

        {/* Table Container */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-auto flex-1">
            <table className="w-max min-w-full text-[10px] text-left border-collapse whitespace-nowrap">
              <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/50 sticky top-0 z-20">
                <tr>
                  <th className="border-b border-r border-slate-200 bg-white p-2 min-w-[80px] text-center font-bold text-slate-700 sticky left-0 z-30">
                  {new Date(year, month).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }).replace('.', '')}-{year.toString().slice(-2)}
                </th>
                <th colSpan={11} className="border-b border-r border-slate-200 bg-orange-50/50"></th>
                <th className="border-b border-r border-slate-200 bg-emerald-500"></th>
                <th colSpan={3} className="border-b border-r border-slate-200 bg-slate-100 p-2 text-center font-bold text-slate-700">Espèces</th>
                <th colSpan={3} className="border-b border-r border-slate-200 bg-amber-50 p-2 text-center font-bold text-amber-800">CB</th>
                <th colSpan={3} className="border-b border-r border-slate-200 bg-amber-50 p-2 text-center font-bold text-amber-800">AMEX</th>
                <th colSpan={3} className="border-b border-r border-slate-200 bg-orange-50 p-2 text-center font-bold text-orange-800">CB TICKET RESTO</th>
                <th colSpan={3} className="border-b border-r border-slate-200 bg-emerald-50 p-2 text-center font-bold text-emerald-800">DELIVEROO</th>
                <th colSpan={3} className="border-b border-r border-slate-200 bg-emerald-50 p-2 text-center font-bold text-emerald-800">UBER</th>
                <th colSpan={3} className="border-b border-r border-slate-200 bg-emerald-50 p-2 text-center font-bold text-emerald-800">Sunday / CHEQUES</th>
                <th colSpan={3} className="border-b border-r border-slate-200 bg-emerald-50 p-2 text-center font-bold text-emerald-800">CLICK EAT</th>
                <th colSpan={3} className="border-b border-r border-slate-200 bg-blue-50 p-2 text-center font-bold text-blue-800">CRT</th>
                <th colSpan={3} className="border-b border-r border-slate-200 bg-emerald-50 p-2 text-center font-bold text-emerald-800">ANCV</th>
                <th colSpan={2} className="border-b border-r border-slate-200 bg-fuchsia-100 p-2 text-center font-bold text-fuchsia-800">BILAN</th>
                <th className="border-b border-r border-slate-200 bg-slate-800 text-white p-2 text-center font-bold">Ecart</th>
                <th className="border-b border-slate-200 bg-slate-800 text-white p-2 text-center font-bold">POURBOIRES</th>
              </tr>
              <tr>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[60px] sticky left-0 z-30 top-[32px]">Date</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">TOTAL HT</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">TTC 5,5%</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">HT 5,5%</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">TTC 10 %</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">HT 10%</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">TTC 20 %</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">HT 20%</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">TVA 5,5%</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">TVA 10%</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">TVA 20%</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">TTC</th>
                <th className="border-b border-r border-slate-200 bg-emerald-600 text-white p-2 text-center font-bold min-w-[80px]">ECART CA</th>
                
                {/* Espèces */}
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Théo</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Reel</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Δ</th>
                {/* CB */}
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Théo</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Reel</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Δ</th>
                {/* AMEX */}
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Théo</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Reel</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Δ</th>
                {/* CB TICKET RESTO */}
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Théo</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Reel</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Δ</th>
                {/* DELIVEROO */}
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Théo</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Reel</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Δ</th>
                {/* UBER */}
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Théo</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Reel</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Δ</th>
                {/* Sunday / CHEQUES */}
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Théo</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Reel</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Δ</th>
                {/* CLEICK EAT */}
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Théo</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Reel</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Δ</th>
                {/* CRT */}
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Théo</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Reel</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Δ</th>
                {/* ANCV */}
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Théo</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Reel</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Δ</th>
                {/* BILAN */}
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Théo</th>
                <th className="border-b border-r border-slate-200 bg-white p-2 text-center font-bold min-w-[80px]">Reel</th>
                {/* Ecart & Pourboires */}
                <th className="border-b border-r border-slate-200 bg-slate-800 text-white p-2 text-center font-bold min-w-[80px]"></th>
                <th className="border-b border-slate-200 bg-slate-800 text-white p-2 text-center font-bold min-w-[80px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {days.map((day) => {
              const dayBilan = bilanData[day] || { ttc_5_5: '', ttc_10: '', ttc_20: '' };
              const tTheorique = theoriqueData[day] || {};
              const tNepting = neptingData[day] || {};
              const tEspeces = especesData[day] || {};
              const tConecs = conecsData[day] || {};
              const tAncv = ancvPapiersData[day] || {};
              const tSunday = sundayData[day] || {};
              const tUber = uberData[day] || {};
              const tAmex = amexAncvData[day] || {};
              const tDeliveroo = deliverooData[day] || {};
              const tClickCollect = clickCollectData[day] || {};

              // Input values
              const ttc55 = parseVal(dayBilan.ttc_5_5);
              const ttc10 = parseVal(dayBilan.ttc_10);
              const ttc20 = parseVal(dayBilan.ttc_20);

              // Calculated values
              const ht55 = ttc55 / 1.055;
              const ht10 = ttc10 / 1.10;
              const ht20 = ttc20 / 1.20;
              const totalHt = ht55 + ht10 + ht20;
              const tva55 = ttc55 - ht55;
              const tva10 = ttc10 - ht10;
              const tva20 = ttc20 - ht20;
              const totalTtc = ttc55 + ttc10 + ttc20;

              // Espèces
              const espTheo = parseVal(tTheorique.especes);
              const espReel = parseVal(tEspeces.mis_au_coffre) + parseVal(tEspeces.pieces);
              const espDelta = espReel - espTheo;

              // CB
              const cbTheo = parseVal(tTheorique.cb);
              const cbReel = parseVal(tNepting.saisie_reel_nepting);
              const cbDelta = cbReel - (cbTheo + parseVal(tNepting.pourboire_sunday));

              // AMEX
              const amexTheo = parseVal(tTheorique.amex);
              const amexReel = parseVal(tAmex.reel_nepting);
              const amexDelta = amexReel - amexTheo;

              // CB TICKET RESTO
              const cbTrTheo = parseVal(tTheorique.tr_carte);
              const cbTrReel = parseVal(tConecs.conecs_reel_nepting);
              const cbTrDelta = cbTrReel - cbTrTheo;

              // DELIVEROO
              const delivTheo = parseVal(tTheorique.deliveroo);
              const delivReel = parseVal(tDeliveroo.reel);
              const delivDelta = delivReel - delivTheo;

              // UBER
              const uberTheo = parseVal(tTheorique.uber);
              const uberReel = parseVal(tUber.reel);
              const uberDelta = uberReel - uberTheo;

              // Sunday / CHEQUES
              const sundayTheo = parseVal(tTheorique.sunday);
              const sundayReel = parseVal(tSunday.reel);
              const sundayDelta = sundayReel - sundayTheo;

              // CLEICK EAT
              const ceTheo = parseVal(tTheorique.click_collect);
              const ceReel = parseVal(tClickCollect.reel);
              const ceDelta = ceReel - ceTheo;

              // CRT
              const crtTheo = parseVal(tTheorique.tr_papier);
              const crtReel = getSaisieTRTotal(day);
              const crtDelta = crtReel - crtTheo;

              // ANCV
              const ancvTheo = parseVal(tTheorique.ancv);
              const ancvReel = parseVal(tAncv.montant_total);
              const ancvDelta = ancvReel - ancvTheo;

              // POURBOIRES
              const pourboires = parseVal(tNepting.pourboire_sunday);

              // BILAN
              const bilanTheo = espTheo + cbTheo + amexTheo + cbTrTheo + delivTheo + uberTheo + sundayTheo + ceTheo + crtTheo + ancvTheo;
              const bilanReel = espReel + cbReel + amexReel + cbTrReel + delivReel + uberReel + sundayReel + ceReel + crtReel + ancvReel;
              const bilanEcart = bilanReel - bilanTheo - pourboires;

              // ECART CA
              const ecartCa = totalTtc - bilanTheo;

              return (
                <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                  <td className="border-r border-slate-200 p-2 text-center font-bold text-slate-700 bg-slate-50 sticky left-0 z-10">{formatDate(day, month, year)}</td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600 font-medium">{totalHt !== 0 ? formatCurrency(totalHt) : '-'}</td>
                  <td className="border-r border-slate-200 p-0 bg-orange-50/30 min-w-[80px]">
                    <CurrencyInput value={dayBilan.ttc_5_5} onChange={(val) => updateBilanSynthese(month, day, 'ttc_5_5', val)} />
                  </td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600 font-medium">{ht55 !== 0 ? formatCurrency(ht55) : '-'}</td>
                  <td className="border-r border-slate-200 p-0 bg-orange-50/30 min-w-[80px]">
                    <CurrencyInput value={dayBilan.ttc_10} onChange={(val) => updateBilanSynthese(month, day, 'ttc_10', val)} />
                  </td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600 font-medium">{ht10 !== 0 ? formatCurrency(ht10) : '-'}</td>
                  <td className="border-r border-slate-200 p-0 bg-orange-50/30 min-w-[80px]">
                    <CurrencyInput value={dayBilan.ttc_20} onChange={(val) => updateBilanSynthese(month, day, 'ttc_20', val)} />
                  </td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600 font-medium">{ht20 !== 0 ? formatCurrency(ht20) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600 font-medium">{tva55 !== 0 ? formatCurrency(tva55) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600 font-medium">{tva10 !== 0 ? formatCurrency(tva10) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600 font-medium">{tva20 !== 0 ? formatCurrency(tva20) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center font-bold text-slate-700 bg-slate-50">{totalTtc !== 0 ? formatCurrency(totalTtc) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center bg-emerald-500 text-white font-bold">{ecartCa !== 0 ? formatCurrency(ecartCa) : '-'}</td>
                  
                  {/* Espèces */}
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{espTheo !== 0 ? formatCurrency(espTheo) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{espReel !== 0 ? formatCurrency(espReel) : '-'}</td>
                  <td className={`border-r border-slate-200 p-2 text-center ${getDeltaColorClass(espDelta)}`}>{espDelta !== 0 ? formatCurrency(espDelta) : '-'}</td>
                  {/* CB */}
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{cbTheo !== 0 ? formatCurrency(cbTheo) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{cbReel !== 0 ? formatCurrency(cbReel) : '-'}</td>
                  <td className={`border-r border-slate-200 p-2 text-center ${getDeltaColorClass(cbDelta)}`}>{cbDelta !== 0 ? formatCurrency(cbDelta) : '-'}</td>
                  {/* AMEX */}
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{amexTheo !== 0 ? formatCurrency(amexTheo) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{amexReel !== 0 ? formatCurrency(amexReel) : '-'}</td>
                  <td className={`border-r border-slate-200 p-2 text-center ${getDeltaColorClass(amexDelta)}`}>{amexDelta !== 0 ? formatCurrency(amexDelta) : '-'}</td>
                  {/* CB TICKET RESTO */}
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{cbTrTheo !== 0 ? formatCurrency(cbTrTheo) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{cbTrReel !== 0 ? formatCurrency(cbTrReel) : '-'}</td>
                  <td className={`border-r border-slate-200 p-2 text-center ${getDeltaColorClass(cbTrDelta)}`}>{cbTrDelta !== 0 ? formatCurrency(cbTrDelta) : '-'}</td>
                  {/* DELIVEROO */}
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{delivTheo !== 0 ? formatCurrency(delivTheo) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{delivReel !== 0 ? formatCurrency(delivReel) : '-'}</td>
                  <td className={`border-r border-slate-200 p-2 text-center ${getDeltaColorClass(delivDelta)}`}>{delivDelta !== 0 ? formatCurrency(delivDelta) : '-'}</td>
                  {/* UBER */}
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{uberTheo !== 0 ? formatCurrency(uberTheo) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{uberReel !== 0 ? formatCurrency(uberReel) : '-'}</td>
                  <td className={`border-r border-slate-200 p-2 text-center ${getDeltaColorClass(uberDelta)}`}>{uberDelta !== 0 ? formatCurrency(uberDelta) : '-'}</td>
                  {/* Sunday / CHEQUES */}
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{sundayTheo !== 0 ? formatCurrency(sundayTheo) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{sundayReel !== 0 ? formatCurrency(sundayReel) : '-'}</td>
                  <td className={`border-r border-slate-200 p-2 text-center ${getDeltaColorClass(sundayDelta)}`}>{sundayDelta !== 0 ? formatCurrency(sundayDelta) : '-'}</td>
                  {/* CLEICK EAT */}
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{ceTheo !== 0 ? formatCurrency(ceTheo) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{ceReel !== 0 ? formatCurrency(ceReel) : '-'}</td>
                  <td className={`border-r border-slate-200 p-2 text-center ${getDeltaColorClass(ceDelta)}`}>{ceDelta !== 0 ? formatCurrency(ceDelta) : '-'}</td>
                  {/* CRT */}
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{crtTheo !== 0 ? formatCurrency(crtTheo) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{crtReel !== 0 ? formatCurrency(crtReel) : '-'}</td>
                  <td className={`border-r border-slate-200 p-2 text-center ${getDeltaColorClass(crtDelta)}`}>{crtDelta !== 0 ? formatCurrency(crtDelta) : '-'}</td>
                  {/* ANCV */}
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{ancvTheo !== 0 ? formatCurrency(ancvTheo) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center text-slate-600">{ancvReel !== 0 ? formatCurrency(ancvReel) : '-'}</td>
                  <td className={`border-r border-slate-200 p-2 text-center ${getDeltaColorClass(ancvDelta)}`}>{ancvDelta !== 0 ? formatCurrency(ancvDelta) : '-'}</td>
                  {/* BILAN */}
                  <td className="border-r border-slate-200 p-2 text-center font-medium text-slate-700 bg-slate-50">{bilanTheo !== 0 ? formatCurrency(bilanTheo) : '-'}</td>
                  <td className="border-r border-slate-200 p-2 text-center font-medium text-slate-700 bg-slate-50">{bilanReel !== 0 ? formatCurrency(bilanReel) : '-'}</td>
                  {/* Ecart & Pourboires */}
                  <td className={`border-r border-slate-200 p-2 text-center ${getDeltaColorClass(bilanEcart)}`}>{bilanEcart !== 0 ? formatCurrency(bilanEcart) : '-'}</td>
                  <td className={`p-2 text-center ${getDeltaColorClass(pourboires)}`}>{pourboires !== 0 ? formatCurrency(pourboires) : '-'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 border-t-2 border-slate-300 sticky bottom-0 z-20">
            <tr className="font-bold text-slate-800">
              <td className="border-r border-slate-300 p-3 text-center uppercase tracking-wide sticky left-0 z-30 bg-slate-100">TOTAL</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumTotalHt !== 0 ? formatCurrency(sumTotalHt) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumTtc55 !== 0 ? formatCurrency(sumTtc55) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumHt55 !== 0 ? formatCurrency(sumHt55) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumTtc10 !== 0 ? formatCurrency(sumTtc10) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumHt10 !== 0 ? formatCurrency(sumHt10) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumTtc20 !== 0 ? formatCurrency(sumTtc20) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumHt20 !== 0 ? formatCurrency(sumHt20) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumTva55 !== 0 ? formatCurrency(sumTva55) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumTva10 !== 0 ? formatCurrency(sumTva10) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumTva20 !== 0 ? formatCurrency(sumTva20) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumTotalTtc !== 0 ? formatCurrency(sumTotalTtc) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center bg-emerald-600 text-white">{sumEcartCa !== 0 ? formatCurrency(sumEcartCa) : '-'}</td>
              
              {/* Espèces */}
              <td className="border-r border-slate-300 p-3 text-center">{sumEspTheo !== 0 ? formatCurrency(sumEspTheo) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumEspReel !== 0 ? formatCurrency(sumEspReel) : '-'}</td>
              <td className={`border-r border-slate-300 p-3 text-center ${getDeltaColorTotalClass(sumEspDelta)}`}>{sumEspDelta !== 0 ? formatCurrency(sumEspDelta) : '-'}</td>
              {/* CB */}
              <td className="border-r border-slate-300 p-3 text-center">{sumCbTheo !== 0 ? formatCurrency(sumCbTheo) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumCbReel !== 0 ? formatCurrency(sumCbReel) : '-'}</td>
              <td className={`border-r border-slate-300 p-3 text-center ${getDeltaColorTotalClass(sumCbDelta)}`}>{sumCbDelta !== 0 ? formatCurrency(sumCbDelta) : '-'}</td>
              {/* AMEX */}
              <td className="border-r border-slate-300 p-3 text-center">{sumAmexTheo !== 0 ? formatCurrency(sumAmexTheo) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumAmexReel !== 0 ? formatCurrency(sumAmexReel) : '-'}</td>
              <td className={`border-r border-slate-300 p-3 text-center ${getDeltaColorTotalClass(sumAmexDelta)}`}>{sumAmexDelta !== 0 ? formatCurrency(sumAmexDelta) : '-'}</td>
              {/* CB TICKET RESTO */}
              <td className="border-r border-slate-300 p-3 text-center">{sumCbTrTheo !== 0 ? formatCurrency(sumCbTrTheo) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumCbTrReel !== 0 ? formatCurrency(sumCbTrReel) : '-'}</td>
              <td className={`border-r border-slate-300 p-3 text-center ${getDeltaColorTotalClass(sumCbTrDelta)}`}>{sumCbTrDelta !== 0 ? formatCurrency(sumCbTrDelta) : '-'}</td>
              {/* DELIVEROO */}
              <td className="border-r border-slate-300 p-3 text-center">{sumDelivTheo !== 0 ? formatCurrency(sumDelivTheo) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumDelivReel !== 0 ? formatCurrency(sumDelivReel) : '-'}</td>
              <td className={`border-r border-slate-300 p-3 text-center ${getDeltaColorTotalClass(sumDelivDelta)}`}>{sumDelivDelta !== 0 ? formatCurrency(sumDelivDelta) : '-'}</td>
              {/* UBER */}
              <td className="border-r border-slate-300 p-3 text-center">{sumUberTheo !== 0 ? formatCurrency(sumUberTheo) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumUberReel !== 0 ? formatCurrency(sumUberReel) : '-'}</td>
              <td className={`border-r border-slate-300 p-3 text-center ${getDeltaColorTotalClass(sumUberDelta)}`}>{sumUberDelta !== 0 ? formatCurrency(sumUberDelta) : '-'}</td>
              {/* Sunday / CHEQUES */}
              <td className="border-r border-slate-300 p-3 text-center">{sumSundayTheo !== 0 ? formatCurrency(sumSundayTheo) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumSundayReel !== 0 ? formatCurrency(sumSundayReel) : '-'}</td>
              <td className={`border-r border-slate-300 p-3 text-center ${getDeltaColorTotalClass(sumSundayDelta)}`}>{sumSundayDelta !== 0 ? formatCurrency(sumSundayDelta) : '-'}</td>
              {/* CLEICK EAT */}
              <td className="border-r border-slate-300 p-3 text-center">{sumCeTheo !== 0 ? formatCurrency(sumCeTheo) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumCeReel !== 0 ? formatCurrency(sumCeReel) : '-'}</td>
              <td className={`border-r border-slate-300 p-3 text-center ${getDeltaColorTotalClass(sumCeDelta)}`}>{sumCeDelta !== 0 ? formatCurrency(sumCeDelta) : '-'}</td>
              {/* CRT */}
              <td className="border-r border-slate-300 p-3 text-center">{sumCrtTheo !== 0 ? formatCurrency(sumCrtTheo) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumCrtReel !== 0 ? formatCurrency(sumCrtReel) : '-'}</td>
              <td className={`border-r border-slate-300 p-3 text-center ${getDeltaColorTotalClass(sumCrtDelta)}`}>{sumCrtDelta !== 0 ? formatCurrency(sumCrtDelta) : '-'}</td>
              {/* ANCV */}
              <td className="border-r border-slate-300 p-3 text-center">{sumAncvTheo !== 0 ? formatCurrency(sumAncvTheo) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumAncvReel !== 0 ? formatCurrency(sumAncvReel) : '-'}</td>
              <td className={`border-r border-slate-300 p-3 text-center ${getDeltaColorTotalClass(sumAncvDelta)}`}>{sumAncvDelta !== 0 ? formatCurrency(sumAncvDelta) : '-'}</td>
              {/* BILAN */}
              <td className="border-r border-slate-300 p-3 text-center">{sumBilanTheo !== 0 ? formatCurrency(sumBilanTheo) : '-'}</td>
              <td className="border-r border-slate-300 p-3 text-center">{sumBilanReel !== 0 ? formatCurrency(sumBilanReel) : '-'}</td>
              {/* Ecart & Pourboires */}
              <td className={`border-r border-slate-300 p-3 text-center ${getDeltaColorTotalClass(sumBilanEcart)}`}>{sumBilanEcart !== 0 ? formatCurrency(sumBilanEcart) : '-'}</td>
              <td className={`p-3 text-center ${getDeltaColorTotalClass(sumPourboires)}`}>{sumPourboires !== 0 ? formatCurrency(sumPourboires) : '-'}</td>
            </tr>
          </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
