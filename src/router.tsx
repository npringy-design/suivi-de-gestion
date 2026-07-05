import { createHashRouter, useNavigate, useParams } from 'react-router-dom';
import { lazy, useEffect, useRef } from 'react';
import type { ComponentType } from 'react';

import { useData } from '@/contexts/DataContext';

type MonthProps = { month: number; year: number; onBack: () => void };
type MonthWithSetMonthProps = MonthProps & { setMonth: (m: number) => void };
type PageProps = { onBack: () => void };

const Home = lazy(() => import('@/pages/Home'));
const Dashboard = lazy(() => import('@/Dashboard'));
const SyntheseCA = lazy(() => import('@/features/edg/SyntheseCA'));
const RecapAnnuel = lazy(() => import('@/features/edg/RecapAnnuel'));
const Reporting = lazy(() => import('@/features/edg/Reporting'));
const SaisieTheorique = lazy(() => import('@/features/caisse/SaisieTheorique'));
const CbNepting = lazy(() => import('@/features/caisse/CbNepting'));
const Especes = lazy(() => import('@/features/caisse/Especes'));
const Conecs = lazy(() => import('@/features/caisse/Conecs'));
const AncvPapiers = lazy(() => import('@/features/caisse/AncvPapiers'));
const SaisieTR = lazy(() => import('@/features/caisse/SaisieTR'));
const VisuTRPapiers = lazy(() => import('@/features/caisse/VisuTRPapiers'));
const Sunday = lazy(() => import('@/features/caisse/Sunday'));
const Uber = lazy(() => import('@/features/caisse/Uber'));
const AmexAncv = lazy(() => import('@/features/caisse/AmexAncv'));
const Deliveroo = lazy(() => import('@/features/caisse/Deliveroo'));
const ClickCollect = lazy(() => import('@/features/caisse/ClickCollect'));
const RemiseTR = lazy(() => import('@/features/caisse/RemiseTR'));
const BilanSynthese = lazy(() => import('@/features/comptabilite/BilanSynthese'));
const DepensesPetiteCaisse = lazy(() => import('@/features/facturation/DepensesPetiteCaisse'));
const VsBudget = lazy(() => import('@/features/edg/VsBudget'));
const VsN1 = lazy(() => import('@/features/edg/VsN1'));
const RealiseEdgAnneeFiscale = lazy(() => import('@/features/edg/RealiseEdgAnneeFiscale'));
const MiseEnPaiement = lazy(() => import('@/features/facturation/MiseEnPaiement'));
const FactureDevis = lazy(() => import('@/features/facturation/FactureDevis'));
const ConfigSalaires = lazy(() => import('@/features/salaires/ConfigSalaires'));
const CalculetteSalaires = lazy(() => import('@/features/salaires/CalculetteSalaires'));
const ConfigurationChiffre2025 = lazy(() => import('@/features/salaires/ConfigurationChiffre2025'));
const VisuelVacances = lazy(() => import('@/features/salaires/VisuelVacances'));
const EdgAnnuelTabs = lazy(() => import('@/features/edg/EdgAnnuelTabs'));
const ParametrageComptable = lazy(() => import('@/features/comptabilite/ParametrageComptable'));
const ExportComptable = lazy(() => import('@/features/comptabilite/ExportComptable'));
const UserManagementPage = lazy(() => import('@/UserManagementPage'));

const parseMonthParam = (value: string | undefined, fallback: number) => {
  const month = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(month) && month >= 0 && month <= 11 ? month : fallback;
};

function DashboardRoute() {
  const { month: monthParam } = useParams();
  const { selectedYear, selectedMonth, setSelectedMonth } = useData();
  const navigate = useNavigate();
  const initialMonthRef = useRef(parseMonthParam(monthParam, selectedMonth));

  useEffect(() => {
    setSelectedMonth(initialMonthRef.current);
  }, [setSelectedMonth]);

  return <Dashboard initialMonth={initialMonthRef.current} year={selectedYear} onBack={() => navigate('/')} />;
}

function SyntheseRoute() {
  const { month: monthParam } = useParams();
  const navigate = useNavigate();
  const todayMonth = new Date().getMonth();
  const initialMonth = parseMonthParam(monthParam, todayMonth);
  const goToMonthPage = (path: string) => (month: number) => navigate(path + '/' + month);
  const handleMonthChange = (month: number) => navigate('/synthese/' + month, { replace: true });

  return (
    <SyntheseCA
      initialMonth={initialMonth}
      onMonthChange={handleMonthChange}
      onBack={() => navigate('/')}
      onSaisieTheorique={goToMonthPage('/saisie-theorique')}
      onCbNepting={goToMonthPage('/cb-nepting')}
      onEspeces={goToMonthPage('/especes')}
      onConecs={goToMonthPage('/conecs')}
      onAncvPapiers={goToMonthPage('/ancv-papiers')}
      onSaisieTR={goToMonthPage('/saisie-tr')}
      onVisuTRPapiers={goToMonthPage('/visu-tr-papiers')}
      onSunday={goToMonthPage('/sunday')}
      onUber={goToMonthPage('/uber')}
      onAmexAncv={goToMonthPage('/amex-ancv')}
      onDeliveroo={goToMonthPage('/deliveroo')}
      onClickCollect={goToMonthPage('/click-collect')}
      onRemiseTR={goToMonthPage('/remise-tr')}
      onBilanSynthese={goToMonthPage('/bilan-synthese')}
      onDepensesPetiteCaisse={goToMonthPage('/depenses-petite-caisse')}
    />
  );
}

function MonthRoute({ Component, backPath }: { Component: ComponentType<MonthProps>; backPath: string }) {
  const { selectedYear, selectedMonth } = useData();
  const navigate = useNavigate();

  return (
    <Component
      month={selectedMonth}
      year={selectedYear}
      onBack={() => navigate(backPath)}
    />
  );
}

function MonthParamRoute({ Component }: { Component: ComponentType<MonthProps> }) {
  const { month: monthParam } = useParams();
  const { selectedYear, selectedMonth } = useData();
  const navigate = useNavigate();
  const month = parseMonthParam(monthParam, selectedMonth);

  return (
    <Component
      month={month}
      year={selectedYear}
      onBack={() => navigate('/synthese/' + month)}
    />
  );
}

function MonthRouteWithSetMonth({ Component, backPath }: { Component: ComponentType<MonthWithSetMonthProps>; backPath: string }) {
  const { selectedYear, selectedMonth, setSelectedMonth } = useData();
  const navigate = useNavigate();

  return (
    <Component
      month={selectedMonth}
      year={selectedYear}
      setMonth={setSelectedMonth}
      onBack={() => navigate(backPath)}
    />
  );
}

function PageRoute({ Component, backPath }: { Component: ComponentType<PageProps>; backPath: string }) {
  const navigate = useNavigate();
  return <Component onBack={() => navigate(backPath)} />;
}

const router = createHashRouter([
  { path: '/', element: <Home /> },
  { path: '/dashboard/:month', element: <DashboardRoute /> },
  { path: '/synthese', element: <SyntheseRoute /> },
  { path: '/synthese/:month', element: <SyntheseRoute /> },
  { path: '/recap-annuel', element: <PageRoute Component={RecapAnnuel} backPath='/' /> },
  { path: '/reporting', element: <PageRoute Component={Reporting} backPath='/' /> },
  { path: '/saisie-theorique', element: <MonthRoute Component={SaisieTheorique} backPath='/synthese' /> },
  { path: '/saisie-theorique/:month', element: <MonthParamRoute Component={SaisieTheorique} /> },
  { path: '/cb-nepting', element: <MonthRoute Component={CbNepting} backPath='/synthese' /> },
  { path: '/cb-nepting/:month', element: <MonthParamRoute Component={CbNepting} /> },
  { path: '/especes', element: <MonthRoute Component={Especes} backPath='/synthese' /> },
  { path: '/especes/:month', element: <MonthParamRoute Component={Especes} /> },
  { path: '/conecs', element: <MonthRoute Component={Conecs} backPath='/synthese' /> },
  { path: '/conecs/:month', element: <MonthParamRoute Component={Conecs} /> },
  { path: '/ancv-papiers', element: <MonthRoute Component={AncvPapiers} backPath='/synthese' /> },
  { path: '/ancv-papiers/:month', element: <MonthParamRoute Component={AncvPapiers} /> },
  { path: '/saisie-tr', element: <MonthRoute Component={SaisieTR} backPath='/synthese' /> },
  { path: '/saisie-tr/:month', element: <MonthParamRoute Component={SaisieTR} /> },
  { path: '/visu-tr-papiers', element: <MonthRoute Component={VisuTRPapiers} backPath='/synthese' /> },
  { path: '/visu-tr-papiers/:month', element: <MonthParamRoute Component={VisuTRPapiers} /> },
  { path: '/sunday', element: <MonthRoute Component={Sunday} backPath='/synthese' /> },
  { path: '/sunday/:month', element: <MonthParamRoute Component={Sunday} /> },
  { path: '/uber', element: <MonthRoute Component={Uber} backPath='/synthese' /> },
  { path: '/uber/:month', element: <MonthParamRoute Component={Uber} /> },
  { path: '/amex-ancv', element: <MonthRoute Component={AmexAncv} backPath='/synthese' /> },
  { path: '/amex-ancv/:month', element: <MonthParamRoute Component={AmexAncv} /> },
  { path: '/deliveroo', element: <MonthRoute Component={Deliveroo} backPath='/synthese' /> },
  { path: '/deliveroo/:month', element: <MonthParamRoute Component={Deliveroo} /> },
  { path: '/click-collect', element: <MonthRoute Component={ClickCollect} backPath='/synthese' /> },
  { path: '/click-collect/:month', element: <MonthParamRoute Component={ClickCollect} /> },
  { path: '/remise-tr', element: <MonthRoute Component={RemiseTR} backPath='/synthese' /> },
  { path: '/remise-tr/:month', element: <MonthParamRoute Component={RemiseTR} /> },
  { path: '/bilan-synthese', element: <MonthRoute Component={BilanSynthese} backPath='/synthese' /> },
  { path: '/bilan-synthese/:month', element: <MonthParamRoute Component={BilanSynthese} /> },
  { path: '/depenses-petite-caisse', element: <MonthRoute Component={DepensesPetiteCaisse} backPath='/synthese' /> },
  { path: '/depenses-petite-caisse/:month', element: <MonthParamRoute Component={DepensesPetiteCaisse} /> },
  { path: '/edg-mensuel/:month', element: <EdgMensuelRoute /> },
  { path: '/budget-edg-annuel', element: <EdgAnnuelTabsRoute initialTab='budget' /> },
  { path: '/vs-budget', element: <PageRoute Component={VsBudget} backPath='/' /> },
  { path: '/vs-n1', element: <PageRoute Component={VsN1} backPath='/' /> },
  { path: '/realise-edg-annee-fiscale', element: <PageRoute Component={RealiseEdgAnneeFiscale} backPath='/' /> },
  { path: '/mise-en-paiement/:month', element: <MonthRouteWithSetMonth Component={MiseEnPaiement} backPath='/' /> },
  { path: '/facture-devis', element: <PageRoute Component={FactureDevis} backPath='/' /> },
  { path: '/config-salaires', element: <PageRoute Component={ConfigSalaires} backPath='/' /> },
  { path: '/calculette-salaires', element: <PageRoute Component={CalculetteSalaires} backPath='/' /> },
  { path: '/configuration-chiffre-2025', element: <PageRoute Component={ConfigurationChiffre2025} backPath='/' /> },
  { path: '/visuel-vacances', element: <PageRoute Component={VisuelVacances} backPath='/' /> },
  { path: '/edg-annuel-tabs', element: <PageRoute Component={EdgAnnuelTabs} backPath='/' /> },
  { path: '/parametrage-comptable', element: <PageRoute Component={ParametrageComptable} backPath='/' /> },
  { path: '/ecritures-comptables', element: <PageRoute Component={ExportComptable} backPath='/' /> },
  { path: '/utilisateurs', element: <PageRoute Component={UserManagementPage} backPath='/' /> },
]);

function EdgMensuelRoute() {
  const { month: monthParam } = useParams();
  const { selectedMonth, setSelectedMonth } = useData();
  const navigate = useNavigate();
  const initialMonthRef = useRef(parseMonthParam(monthParam, selectedMonth));

  useEffect(() => {
    setSelectedMonth(initialMonthRef.current);
  }, [setSelectedMonth]);

  return <EdgAnnuelTabs onBack={() => navigate('/')} initialTab='mensuel' />;
}

function EdgAnnuelTabsRoute({ initialTab }: { initialTab: 'mensuel' | 'budget' | 'realise' | 'vs_budget' | 'vs_n1' }) {
  const navigate = useNavigate();
  return <EdgAnnuelTabs onBack={() => navigate('/')} initialTab={initialTab} />;
}

export default router;
