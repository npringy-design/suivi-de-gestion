import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Download, FileText, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { loadAccountingMappings } from '@/accountingConfig';
import { useData, type DayDataSaisieTR, type MonthData } from '@/contexts/DataContext';
import { buildDailyEntries, checkBalance, type AccountingEntry, type BalanceCheck, type DayTotals } from '@/utils/buildDailyEntries';

type ExportComptableProps = { onBack: () => void };
type DailyBlock = { date: string; entries: AccountingEntry[]; balance: BalanceCheck; totals: DayTotals };

const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const years = [2024, 2025, 2026];

const parseVal = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  return parseFloat(String(value || '').replace(',', '.').replace(/[^0-9,.-]/g, '')) || 0;
};

const formatDate = (day: number, month: number, year: number) => new Date(year, month, day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatMoney = (value: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const formatCsvMoney = (value: number | null) => value === null ? '' : formatMoney(value).replace(/\s/g, '');

const getSaisieTRTotal = (dayData?: DayDataSaisieTR) => {
  if (!dayData) return 0;
  const providers: Array<keyof DayDataSaisieTR> = ['edenred', 'pluxee', 'bimpli', 'up'];
  return providers.reduce((sum, provider) => sum + (dayData[provider] || []).reduce((lineSum, entry) => lineSum + parseVal(entry.valeur) * parseVal(entry.nombre), 0), 0);
};

const computeDayTotals = (day: number, monthData: MonthData): DayTotals => {
  const bilan = monthData.bilanSynthese?.[day] || { ttc_5_5: '', ttc_10: '', ttc_20: '' };
  const theorique = monthData.theorique?.[day] || {};
  const nepting = monthData.nepting?.[day] || {};
  const especes = monthData.especes?.[day] || {};
  const conecs = monthData.conecs?.[day] || {};
  const ancv = monthData.ancvPapiers?.[day] || {};
  const sunday = monthData.sunday?.[day] || {};
  const uber = monthData.uber?.[day] || {};
  const amex = monthData.amexAncv?.[day] || {};
  const deliveroo = monthData.deliveroo?.[day] || {};
  const clickCollect = monthData.clickCollect?.[day] || {};

  const ttc55 = parseVal(bilan.ttc_5_5);
  const ttc10 = parseVal(bilan.ttc_10);
  const ttc20 = parseVal(bilan.ttc_20);
  const ht55 = ttc55 / 1.055;
  const ht10 = ttc10 / 1.10;
  const ht20 = ttc20 / 1.20;
  const tva55 = ttc55 - ht55;
  const tva10 = ttc10 - ht10;
  const tva20 = ttc20 - ht20;
  const totalTtc = ttc55 + ttc10 + ttc20;

  const espReel = parseVal(especes.mis_au_coffre) + parseVal(especes.pieces);
  const cbReel = parseVal(nepting.saisie_reel_nepting);
  const amexReel = parseVal(amex.reel_nepting);
  const crtReel = getSaisieTRTotal(monthData.saisieTR?.[day]);
  const cbTrReel = parseVal(conecs.conecs_reel_nepting);
  const ancvReel = parseVal(ancv.montant_total);
  const delivReel = parseVal(deliveroo.reel);
  const uberReel = parseVal(uber.reel);
  const sundayReel = parseVal(sunday.reel);
  const ceReel = parseVal(clickCollect.reel);
  const pourboires = parseVal(nepting.pourboire_sunday);

  const bilanTheo = parseVal(theorique.especes) + parseVal(theorique.cb) + parseVal(theorique.amex) + parseVal(theorique.tr_carte) + parseVal(theorique.deliveroo) + parseVal(theorique.uber) + parseVal(theorique.sunday) + parseVal(theorique.click_collect) + parseVal(theorique.tr_papier) + parseVal(theorique.ancv);
  const bilanReel = espReel + cbReel + amexReel + cbTrReel + delivReel + uberReel + sundayReel + ceReel + crtReel + ancvReel;
  const bilanEcart = bilanReel - bilanTheo - pourboires;

  return { ht55, ht10, ht20, tva55, tva10, tva20, totalTtc, espReel, cbReel, amexReel, crtReel, cbTrReel, ancvReel, delivReel, uberReel, sundayReel, ceReel, pourboires, bilanEcart, ecartNegatif: bilanEcart < 0 ? Math.abs(bilanEcart) : 0, ecartPositif: bilanEcart > 0 ? bilanEcart : 0, fondCaisse: 0, especesRemise: 0 };
};

const hasUsefulTotals = (totals: DayTotals) => Object.entries(totals).some(([key, value]) => key !== 'fondCaisse' && key !== 'especesRemise' && Math.abs(value) > 0.004);

export default function ExportComptable({ onBack }: ExportComptableProps) {
  const { allData, selectedYear, selectedMonth, setSelectedMonth, setSelectedYear } = useData();
  const navigate = useNavigate();
  const [month, setMonth] = useState(selectedMonth);
  const [year, setYear] = useState(selectedYear);
  const [blocks, setBlocks] = useState<DailyBlock[]>([]);
  const [generated, setGenerated] = useState(false);

  const flatEntries = useMemo(() => blocks.flatMap(block => block.entries), [blocks]);
  const monthData = allData[year]?.[month];
  const hasFondCaisseWarning = blocks.some(block => Math.abs(block.totals.fondCaisse) < 0.005);

  const generate = () => {
    const source = allData[year]?.[month];
    if (!source) {
      setBlocks([]);
      setGenerated(true);
      return;
    }
    const mappings = loadAccountingMappings();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const nextBlocks: DailyBlock[] = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      const totals = computeDayTotals(day, source);
      if (!hasUsefulTotals(totals)) continue;
      const date = formatDate(day, month, year);
      const entries = buildDailyEntries(date, totals, mappings, month + 1, year);
      nextBlocks.push({ date, entries, balance: checkBalance(entries), totals });
    }
    setBlocks(nextBlocks);
    setGenerated(true);
  };

  const downloadCsv = () => {
    const header = 'Date;Journal;Compte;Libellé;Débit;Crédit';
    const lines = flatEntries.map(entry => [entry.date, entry.journal, entry.account, entry.label, formatCsvMoney(entry.debit), formatCsvMoney(entry.credit)].map(value => `"${String(value).replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob([`\uFEFF${[header, ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ecritures_CA_${year}_${String(month + 1).padStart(2, '0')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/40 to-amber-50/40 p-4 text-slate-900 sm:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#07111f] via-[#0a2430] to-[#073d43] p-5 text-white shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <button type="button" onClick={onBack} className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-50 ring-1 ring-white/15 transition hover:bg-white/20" aria-label="Retour accueil"><ArrowLeft className="h-5 w-5" /></button>
              <div><div className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/70">Brouillon comptable</div><h1 className="mt-1 text-3xl font-black tracking-tight text-amber-50">Écritures comptables</h1><p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-cyan-50/78">Génération de contrôle à partir de la synthèse caisse et du paramétrage comptable. Ce n’est pas encore un export officiel.</p></div>
            </div>
            <button type="button" onClick={() => navigate('/parametrage-comptable')} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-cyan-50 ring-1 ring-white/15 transition hover:bg-white/20"><Settings className="h-4 w-4" /> Modifier les comptes</button>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-3">
              <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Mois<select value={month} onChange={event => { const value = parseInt(event.target.value, 10); setMonth(value); setSelectedMonth(value); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-100">{months.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label>
              <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Année<select value={year} onChange={event => { const value = parseInt(event.target.value, 10); setYear(value); setSelectedYear(value); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-100">{years.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={generate} className="inline-flex items-center gap-2 rounded-xl bg-cyan-800 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-cyan-700"><FileText className="h-4 w-4" /> Générer les écritures</button>
              {generated && flatEntries.length > 0 && <button type="button" onClick={downloadCsv} className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 shadow-sm transition hover:bg-amber-200"><Download className="h-4 w-4" /> Télécharger CSV</button>}
            </div>
          </div>
          {hasFondCaisseWarning && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950"><AlertTriangle className="mr-2 inline h-4 w-4 text-amber-700" />Le compte 580000 et la contrepartie 531100 sont à 0 dans ce brouillon. Il faut confirmer la règle exacte avec le comptable avant usage officiel.</div>}
          {!monthData && <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">Aucune donnée trouvée pour ce mois.</div>}
        </section>

        {generated && blocks.length === 0 && <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-sm">Aucune écriture générée pour cette période.</div>}

        {blocks.length > 0 && <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="max-h-[70vh] overflow-auto"><table className="min-w-full border-separate border-spacing-0 text-sm"><thead><tr><th className="sticky top-0 bg-slate-50 px-3 py-3 text-left text-xs font-black uppercase text-slate-500">Date</th><th className="sticky top-0 bg-slate-50 px-3 py-3 text-left text-xs font-black uppercase text-slate-500">Journal</th><th className="sticky top-0 bg-slate-50 px-3 py-3 text-left text-xs font-black uppercase text-slate-500">Compte</th><th className="sticky top-0 bg-slate-50 px-3 py-3 text-left text-xs font-black uppercase text-slate-500">Libellé</th><th className="sticky top-0 bg-slate-50 px-3 py-3 text-right text-xs font-black uppercase text-cyan-700">Débit</th><th className="sticky top-0 bg-slate-50 px-3 py-3 text-right text-xs font-black uppercase text-amber-700">Crédit</th></tr></thead><tbody>{blocks.map(block => (<><tr key={`${block.date}-title`} className="bg-slate-50"><td colSpan={6} className="border-t border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{block.date}</td></tr>{block.entries.map((entry, index) => <tr key={`${block.date}-${entry.account}-${index}`} className="hover:bg-cyan-50/30"><td className="border-t border-slate-100 px-3 py-2 font-semibold text-slate-700">{entry.date}</td><td className="border-t border-slate-100 px-3 py-2 font-bold text-slate-700">{entry.journal}</td><td className={`border-t border-slate-100 px-3 py-2 font-black ${entry.debit !== null ? 'text-cyan-800' : 'text-amber-700'}`}>{entry.account}</td><td className="border-t border-slate-100 px-3 py-2 font-semibold text-slate-700">{entry.label}</td><td className="border-t border-slate-100 px-3 py-2 text-right font-black text-cyan-800">{entry.debit === null ? '' : formatMoney(entry.debit)}</td><td className="border-t border-slate-100 px-3 py-2 text-right font-black text-amber-700">{entry.credit === null ? '' : formatMoney(entry.credit)}</td></tr>)}<tr key={`${block.date}-balance`} className={block.balance.isBalanced ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}><td colSpan={6} className="border-t border-slate-200 px-3 py-3 text-sm font-black">CONTRÔLE {block.date} — Total débit : {formatMoney(block.balance.totalDebit)} € | Total crédit : {formatMoney(block.balance.totalCredit)} € | Écart : {formatMoney(block.balance.ecart)} € | {block.balance.isBalanced ? 'Équilibré' : 'À vérifier'}</td></tr></>))}</tbody></table></div></section>}
      </div>
    </div>
  );
}
