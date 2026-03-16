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
import BudgetEdgAnnuel from './BudgetEdgAnnuel';
import VsBudget from './VsBudget';
import VsN1 from './VsN1';
import RealiseEdgAnneeFiscale from './RealiseEdgAnneeFiscale';
import MiseEnPaiement from './MiseEnPaiement';
import FactureDevis from './FactureDevis';
import ConfigSalaires from './ConfigSalaires';
import CalculetteSalaires from './CalculetteSalaires';
import ConfigurationChiffre2025 from './ConfigurationChiffre2025';
import VisuelVacances from './VisuelVacances';
import EdgAnnuelTabs from './EdgAnnuelTabs';
import { DataProvider, useData } from './DataContext';

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

function AppContent() {
  const { selectedYear: year, setSelectedYear } = useData();
  const [currentPage, setCurrentPage] = useState<'home' | 'dashboard' | 'synthese' | 'recap_annuel' | 'reporting' | 'saisie_theorique' | 'cb_nepting' | 'especes' | 'conecs' | 'ancv_papiers' | 'saisie_tr' | 'visu_tr_papiers' | 'sunday' | 'uber' | 'amex_ancv' | 'deliveroo' | 'click_collect' | 'remise_tr' | 'bilan_synthese' | 'depenses_petite_caisse' | 'edg_mensuel' | 'budget_edg_annuel' | 'vs_budget' | 'vs_n1' | 'realise_edg_annee_fiscale' | 'mise_en_paiement' | 'facture_devis' | 'config_salaires' | 'calculette_salaires' | 'visuel_vacances' | 'edg_annuel_tabs'>('home');
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = Janvier, 11 = Décembre
  const [edgAnnuelTab, setEdgAnnuelTab] = useState<'budget' | 'realise' | 'vs_budget' | 'vs_n1'>('budget');

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('dashboard');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
  };

  const handleSyntheseCA = () => {
    setCurrentPage('synthese');
  };

  const handleRecapAnnuel = () => {
    setCurrentPage('recap_annuel');
  };

  const handleReporting = () => {
    setCurrentPage('reporting');
  };

  const handleEdgMensuel = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('edg_mensuel');
  };

  const handleBudgetEdgAnnuel = () => {
    setEdgAnnuelTab('budget');
    setCurrentPage('edg_annuel_tabs');
  };

  const handleVsBudget = () => {
    setEdgAnnuelTab('vs_budget');
    setCurrentPage('edg_annuel_tabs');
  };

  const handleVsN1 = () => {
    setEdgAnnuelTab('vs_n1');
    setCurrentPage('edg_annuel_tabs');
  };

  const handleRealiseEdgAnneeFiscale = () => {
    setEdgAnnuelTab('realise');
    setCurrentPage('edg_annuel_tabs');
  };

  const handleMiseEnPaiement = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('mise_en_paiement');
  };

  const handleFactureDevis = () => {
    setCurrentPage('facture_devis');
  };

  const handleConfigSalaires = () => {
    setCurrentPage('config_salaires');
  };

  const handleCalculetteSalaires = () => {
    setCurrentPage('calculette_salaires');
  };

  const handleVisuelVacances = () => {
    setCurrentPage('visuel_vacances');
  };

  const handleSaisieTheorique = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('saisie_theorique');
  };

  const handleCbNepting = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('cb_nepting');
  };

  const handleEspeces = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('especes');
  };

  const handleConecs = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('conecs');
  };

  const handleAncvPapiers = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('ancv_papiers');
  };

  const handleSaisieTR = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('saisie_tr');
  };

  const handleVisuTRPapiers = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('visu_tr_papiers');
  };

  const handleSunday = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('sunday');
  };

  const handleUber = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('uber');
  };

  const handleAmexAncv = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('amex_ancv');
  };

  const handleDeliveroo = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('deliveroo');
  };

  const handleClickCollect = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('click_collect');
  };

  const handleRemiseTR = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('remise_tr');
  };

  const handleBilanSynthese = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('bilan_synthese');
  };

  const handleDepensesPetiteCaisse = (month: number) => {
    setSelectedMonth(month);
    setCurrentPage('depenses_petite_caisse');
  };

  if (currentPage === 'dashboard') {
    return <Dashboard initialMonth={selectedMonth} year={year} onBack={handleBackToHome} />;
  }

  if (currentPage === 'synthese') {
    return <SyntheseCA onBack={handleBackToHome} onSaisieTheorique={handleSaisieTheorique} onCbNepting={handleCbNepting} onEspeces={handleEspeces} onConecs={handleConecs} onAncvPapiers={handleAncvPapiers} onSaisieTR={handleSaisieTR} onVisuTRPapiers={handleVisuTRPapiers} onSunday={handleSunday} onUber={handleUber} onAmexAncv={handleAmexAncv} onDeliveroo={handleDeliveroo} onClickCollect={handleClickCollect} onRemiseTR={handleRemiseTR} onBilanSynthese={handleBilanSynthese} onDepensesPetiteCaisse={handleDepensesPetiteCaisse} />;
  }

  if (currentPage === 'saisie_theorique') {
    return <SaisieTheorique month={selectedMonth} year={year} onBack={() => setCurrentPage('synthese')} />;
  }

  if (currentPage === 'cb_nepting') {
    return <CbNepting month={selectedMonth} year={year} onBack={() => setCurrentPage('synthese')} />;
  }

  if (currentPage === 'especes') {
    return <Especes month={selectedMonth} year={year} onBack={() => setCurrentPage('synthese')} />;
  }

  if (currentPage === 'conecs') {
    return <Conecs month={selectedMonth} year={year} onBack={() => setCurrentPage('synthese')} />;
  }

  if (currentPage === 'ancv_papiers') {
    return <AncvPapiers month={selectedMonth} year={year} onBack={() => setCurrentPage('synthese')} />;
  }

  if (currentPage === 'saisie_tr') {
    return <SaisieTR month={selectedMonth} year={year} onBack={() => setCurrentPage('synthese')} />;
  }

  if (currentPage === 'visu_tr_papiers') {
    return <VisuTRPapiers month={selectedMonth} year={year} onBack={() => setCurrentPage('synthese')} />;
  }

  if (currentPage === 'sunday') {
    return <Sunday month={selectedMonth} year={year} onBack={() => setCurrentPage('synthese')} />;
  }

  if (currentPage === 'uber') {
    return <Uber month={selectedMonth} year={year} onBack={() => setCurrentPage('synthese')} />;
  }

  if (currentPage === 'amex_ancv') {
    return <AmexAncv month={selectedMonth} year={year} onBack={() => setCurrentPage('synthese')} />;
  }

  if (currentPage === 'deliveroo') {
    return <Deliveroo month={selectedMonth} year={year} onBack={() => setCurrentPage('synthese')} />;
  }

  if (currentPage === 'click_collect') {
    return <ClickCollect month={selectedMonth} year={year} onBack={() => setCurrentPage('synthese')} />;
  }

  if (currentPage === 'remise_tr') {
    return <RemiseTR month={selectedMonth} year={year} onBack={() => setCurrentPage('synthese')} />;
  }

  if (currentPage === 'bilan_synthese') {
    return <BilanSynthese month={selectedMonth} year={year} onBack={() => setCurrentPage('synthese')} />;
  }

  if (currentPage === 'depenses_petite_caisse') {
    return <DepensesPetiteCaisse month={selectedMonth} year={year} onBack={() => setCurrentPage('synthese')} />;
  }

  if (currentPage === 'recap_annuel') {
    return <RecapAnnuel onBack={handleBackToHome} />;
  }

  if (currentPage === 'edg_annuel_tabs') {
    return <EdgAnnuelTabs onBack={handleBackToHome} initialTab={edgAnnuelTab} />;
  }

  if (currentPage === 'reporting') {
    if (year === 2025) {
      return <ConfigurationChiffre2025 onBack={handleBackToHome} />;
    }
    return <Reporting onBack={handleBackToHome} />;
  }

  if (currentPage === 'edg_mensuel') {
    return <EdgMensuel month={selectedMonth} setMonth={setSelectedMonth} onBack={handleBackToHome} />;
  }

  if (currentPage === 'budget_edg_annuel') {
    return <BudgetEdgAnnuel onBack={handleBackToHome} />;
  }

  if (currentPage === 'vs_budget') {
    return <VsBudget onBack={handleBackToHome} />;
  }

  if (currentPage === 'vs_n1') {
    return <VsN1 onBack={handleBackToHome} />;
  }

  if (currentPage === 'realise_edg_annee_fiscale') {
    return <RealiseEdgAnneeFiscale onBack={handleBackToHome} />;
  }

  if (currentPage === 'mise_en_paiement') {
    return <MiseEnPaiement month={selectedMonth} setMonth={setSelectedMonth} onBack={handleBackToHome} />;
  }

  if (currentPage === 'facture_devis') {
    return <FactureDevis onBack={handleBackToHome} />;
  }

  if (currentPage === 'config_salaires') {
    return <ConfigSalaires onBack={handleBackToHome} />;
  }

  if (currentPage === 'calculette_salaires') {
    return <CalculetteSalaires onBack={handleBackToHome} />;
  }

  if (currentPage === 'visuel_vacances') {
    return <VisuelVacances onBack={handleBackToHome} />;
  }

  return <Home year={year} onMonthSelect={handleMonthSelect} onSyntheseCA={handleSyntheseCA} onRecapAnnuel={handleRecapAnnuel} onReporting={handleReporting} onEdgMensuel={handleEdgMensuel} onBudgetEdgAnnuel={handleBudgetEdgAnnuel} onVsBudget={handleVsBudget} onVsN1={handleVsN1} onRealiseEdgAnneeFiscale={handleRealiseEdgAnneeFiscale} onMiseEnPaiement={handleMiseEnPaiement} onFactureDevis={handleFactureDevis} onConfigSalaires={handleConfigSalaires} onCalculetteSalaires={handleCalculetteSalaires} onVisuelVacances={handleVisuelVacances} />;
}
