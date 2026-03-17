import React, { useState } from 'react';
import Dashboard from './Dashboard';
import Home from './Home';
import SyntheseCA from './SyntheseCA';
import RecapAnnuel from './RecapAnnuel';
import Reporting from './Reporting';
import SaisieTheorique from './SaisieTheorique';
import CbNepting from './CbNepting';
import Especes from './Especes';
import Conecs from './Conecs';
import AncvPapiers from './AncvPapiers';
import SaisieTR from './SaisieTR';
import VisuTRPapiers from './VisuTRPapiers';
import Sunday from './Sunday';
import Uber from './Uber';
import AmexAncv from './AmexAncv';
import Deliveroo from './Deliveroo';
import ClickCollect from './ClickCollect';
import RemiseTR from './RemiseTR';
import BilanSynthese from './BilanSynthese';
import DepensesPetiteCaisse from './DepensesPetiteCaisse';
import EdgMensuel from './EdgMensuel';
import EdgAnnuelTabs from './EdgAnnuelTabs';
import MiseEnPaiement from './MiseEnPaiement';
import FactureDevis from './FactureDevis';
import ConfigSalaires from './ConfigSalaires';
import CalculetteSalaires from './CalculetteSalaires';
import ConfigurationChiffre2025 from './ConfigurationChiffre2025';
import VisuelVacances from './VisuelVacances';
import { DataProvider, useData } from './DataContext';

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

type Page =
  | 'home' | 'dashboard' | 'synthese' | 'recap_annuel' | 'reporting'
  | 'saisie_theorique' | 'cb_nepting' | 'especes' | 'conecs' | 'ancv_papiers'
  | 'saisie_tr' | 'visu_tr_papiers' | 'sunday' | 'uber' | 'amex_ancv'
  | 'deliveroo' | 'click_collect' | 'remise_tr' | 'bilan_synthese'
  | 'depenses_petite_caisse' | 'edg_mensuel' | 'edg_annuel_tabs'
  | 'mise_en_paiement' | 'facture_devis' | 'config_salaires'
  | 'calculette_salaires' | 'visuel_vacances';

function AppContent() {
  const { selectedYear: year, setSelectedYear } = useData();
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [edgAnnuelTab, setEdgAnnuelTab] = useState<'budget' | 'realise' | 'vs_budget' | 'vs_n1'>('budget');

  const goHome     = () => setCurrentPage('home');
  const goSynthese = () => setCurrentPage('synthese');

  const handleMonthSelect = (month: number) => { setSelectedMonth(month); setCurrentPage('dashboard'); };
  const handleSyntheseCA  = () => setCurrentPage('synthese');
  const handleRecapAnnuel = () => setCurrentPage('recap_annuel');
  const handleReporting   = () => setCurrentPage('reporting');

  const handleEdgMensuel  = (month: number) => { setSelectedMonth(month); setCurrentPage('edg_mensuel'); };
  const handleBudgetEdgAnnuel        = () => { setEdgAnnuelTab('budget');    setCurrentPage('edg_annuel_tabs'); };
  const handleVsBudget               = () => { setEdgAnnuelTab('vs_budget'); setCurrentPage('edg_annuel_tabs'); };
  const handleVsN1                   = () => { setEdgAnnuelTab('vs_n1');     setCurrentPage('edg_annuel_tabs'); };
  const handleRealiseEdgAnneeFiscale = () => { setEdgAnnuelTab('realise');   setCurrentPage('edg_annuel_tabs'); };
  const handleMiseEnPaiement = (month: number) => { setSelectedMonth(month); setCurrentPage('mise_en_paiement'); };

  const handleSaisieTheorique      = (m: number) => { setSelectedMonth(m); setCurrentPage('saisie_theorique'); };
  const handleCbNepting            = (m: number) => { setSelectedMonth(m); setCurrentPage('cb_nepting'); };
  const handleEspeces              = (m: number) => { setSelectedMonth(m); setCurrentPage('especes'); };
  const handleConecs               = (m: number) => { setSelectedMonth(m); setCurrentPage('conecs'); };
  const handleAncvPapiers          = (m: number) => { setSelectedMonth(m); setCurrentPage('ancv_papiers'); };
  const handleSaisieTR             = (m: number) => { setSelectedMonth(m); setCurrentPage('saisie_tr'); };
  const handleVisuTRPapiers        = (m: number) => { setSelectedMonth(m); setCurrentPage('visu_tr_papiers'); };
  const handleSunday               = (m: number) => { setSelectedMonth(m); setCurrentPage('sunday'); };
  const handleUber                 = (m: number) => { setSelectedMonth(m); setCurrentPage('uber'); };
  const handleAmexAncv             = (m: number) => { setSelectedMonth(m); setCurrentPage('amex_ancv'); };
  const handleDeliveroo            = (m: number) => { setSelectedMonth(m); setCurrentPage('deliveroo'); };
  const handleClickCollect         = (m: number) => { setSelectedMonth(m); setCurrentPage('click_collect'); };
  const handleRemiseTR             = (m: number) => { setSelectedMonth(m); setCurrentPage('remise_tr'); };
  const handleBilanSynthese        = (m: number) => { setSelectedMonth(m); setCurrentPage('bilan_synthese'); };
  const handleDepensesPetiteCaisse = (m: number) => { setSelectedMonth(m); setCurrentPage('depenses_petite_caisse'); };

  // ── Routing ──────────────────────────────────────────────────────────────────

  if (currentPage === 'dashboard')
    return <Dashboard initialMonth={selectedMonth} year={year} onBack={goHome} />;

  if (currentPage === 'synthese')
    return <SyntheseCA onBack={goHome}
      onSaisieTheorique={handleSaisieTheorique} onCbNepting={handleCbNepting}
      onEspeces={handleEspeces} onConecs={handleConecs} onAncvPapiers={handleAncvPapiers}
      onSaisieTR={handleSaisieTR} onVisuTRPapiers={handleVisuTRPapiers}
      onSunday={handleSunday} onUber={handleUber} onAmexAncv={handleAmexAncv}
      onDeliveroo={handleDeliveroo} onClickCollect={handleClickCollect}
      onRemiseTR={handleRemiseTR} onBilanSynthese={handleBilanSynthese}
      onDepensesPetiteCaisse={handleDepensesPetiteCaisse} />;

  if (currentPage === 'saisie_theorique')   return <SaisieTheorique month={selectedMonth} year={year} onBack={goSynthese} />;
  if (currentPage === 'cb_nepting')         return <CbNepting month={selectedMonth} year={year} onBack={goSynthese} />;
  if (currentPage === 'especes')            return <Especes month={selectedMonth} year={year} onBack={goSynthese} />;
  if (currentPage === 'conecs')             return <Conecs month={selectedMonth} year={year} onBack={goSynthese} />;
  if (currentPage === 'ancv_papiers')       return <AncvPapiers month={selectedMonth} year={year} onBack={goSynthese} />;
  if (currentPage === 'saisie_tr')          return <SaisieTR month={selectedMonth} year={year} onBack={goSynthese} />;
  if (currentPage === 'visu_tr_papiers')    return <VisuTRPapiers month={selectedMonth} year={year} onBack={goSynthese} />;
  if (currentPage === 'sunday')             return <Sunday month={selectedMonth} year={year} onBack={goSynthese} />;
  if (currentPage === 'uber')               return <Uber month={selectedMonth} year={year} onBack={goSynthese} />;
  if (currentPage === 'amex_ancv')          return <AmexAncv month={selectedMonth} year={year} onBack={goSynthese} />;
  if (currentPage === 'deliveroo')          return <Deliveroo month={selectedMonth} year={year} onBack={goSynthese} />;
  if (currentPage === 'click_collect')      return <ClickCollect month={selectedMonth} year={year} onBack={goSynthese} />;
  if (currentPage === 'remise_tr')          return <RemiseTR month={selectedMonth} year={year} onBack={goSynthese} />;
  if (currentPage === 'bilan_synthese')     return <BilanSynthese month={selectedMonth} year={year} onBack={goSynthese} />;
  if (currentPage === 'depenses_petite_caisse') return <DepensesPetiteCaisse month={selectedMonth} year={year} onBack={goSynthese} />;

  if (currentPage === 'recap_annuel')    return <RecapAnnuel onBack={goHome} />;
  if (currentPage === 'edg_mensuel')     return <EdgMensuel month={selectedMonth} setMonth={setSelectedMonth} onBack={goHome} />;
  if (currentPage === 'edg_annuel_tabs') return <EdgAnnuelTabs onBack={goHome} initialTab={edgAnnuelTab} />;
  if (currentPage === 'mise_en_paiement') return <MiseEnPaiement month={selectedMonth} setMonth={setSelectedMonth} onBack={goHome} />;
  if (currentPage === 'facture_devis')   return <FactureDevis onBack={goHome} />;
  if (currentPage === 'config_salaires') return <ConfigSalaires onBack={goHome} />;
  if (currentPage === 'calculette_salaires') return <CalculetteSalaires onBack={goHome} />;
  if (currentPage === 'visuel_vacances') return <VisuelVacances onBack={goHome} />;

  if (currentPage === 'reporting')
    return year === 2025
      ? <ConfigurationChiffre2025 onBack={goHome} />
      : <Reporting onBack={goHome} />;

  return (
    <Home
      year={year}
      month={selectedMonth}
      setMonth={setSelectedMonth}
      onMonthSelect={handleMonthSelect}
      onSyntheseCA={handleSyntheseCA}
      onRecapAnnuel={handleRecapAnnuel}
      onReporting={handleReporting}
      onEdgMensuel={handleEdgMensuel}
      onBudgetEdgAnnuel={handleBudgetEdgAnnuel}
      onVsBudget={handleVsBudget}
      onVsN1={handleVsN1}
      onRealiseEdgAnneeFiscale={handleRealiseEdgAnneeFiscale}
      onMiseEnPaiement={handleMiseEnPaiement}
      onFactureDevis={() => setCurrentPage('facture_devis')}
      onConfigSalaires={() => setCurrentPage('config_salaires')}
      onCalculetteSalaires={() => setCurrentPage('calculette_salaires')}
      onVisuelVacances={() => setCurrentPage('visuel_vacances')}
    />
  );
}
