import { createHashRouter, useNavigate, useParams } from 'react-router-dom';
import { lazy , useEffect } from 'react';

import { useData } from '@/contexts/DataContext';

const Home = lazy(() => import('@/HomeWithAdminLink'));
const Dashboard = lazy(() => import('@/Dashboard'));
const SyntheseCA = lazy(() => import('@/SyntheseCA'));
const RecapAnnuel = lazy(() => import('@/RecapAnnuel'));
const Reporting = lazy(() => import('@/Reporting'));
const SaisieTheorique = lazy(() => import('@/SaisieTheorique'));
const CbNepting = lazy(() => import('@/CbNepting'));
const Especes = lazy(() => import('@/Especes'));
const Conecs = lazy(() => import('@/Conecs'));
const AncvPapiers = lazy(() => import('@/AncvPapiers'));
const SaisieTR = lazy(() => import('@/SaisieTR'));
const VisuTRPapiers = lazy(() => import('@/VisuTRPapiers'));
const Sunday = lazy(() => import('@/Sunday'));
const Uber = lazy(() => import('@/Uber'));
const AmexAncv = lazy(() => import('@/AmexAncv'));
const Deliveroo = lazy(() => import('@/Deliveroo'));
const ClickCollect = lazy(() => import('@/ClickCollect'));
const RemiseTR = lazy(() => import('@/RemiseTR'));
const BilanSynthese = lazy(() => import('@/BilanSynthese'));
const DepensesPetiteCaisse = lazy(() => import('@/DepensesPetiteCaisse'));
const EdgMensuel = lazy(() => import('@/EdgMensuel'));
const BudgetEdgAnnuel = lazy(() => import('@/BudgetEdgAnnuel'));
const VsBudget = lazy(() => import('@/VsBudget'));
const VsN1 = lazy(() => import('@/VsN1'));
const RealiseEdgAnneeFiscale = lazy(() => import('@/RealiseEdgAnneeFiscale'));
const MiseEnPaiement = lazy(() => import('@/MiseEnPaiement'));
const FactureDevis = lazy(() => import('@/FactureDevis'));
const ConfigSalaires = lazy(() => import('@/ConfigSalaires'));
const CalculetteSalaires = lazy(() => import('@/CalculetteSalaires'));
const ConfigurationChiffre2025 = lazy(() => import('@/ConfigurationChiffre2025'));
const VisuelVacances = lazy(() => import('@/VisuelVacances'));
const EdgAnnuelTabs = lazy(() => import('@/EdgAnnuelTabs'));
const UserManagementPage = lazy(() => import('@/UserManagementPage'));

const parseMonthParam = (value: string | undefined, fallback: number) => {
  const month = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(month) && month >= 0 && month <= 11 ? month : fallback;
};

function DashboardRoute() {
  const { month: monthParam } = useParams();
  const { selectedYear, selectedMonth, setSelectedMonth } = useData();
  const navigate = useNavigate();
  const month = parseMonthParam(monthParam, selectedMonth);

  useEffect(() => {
    if (month !== selectedMonth) {
      setSelectedMonth(month);
    }
  }, [month, selectedMonth, setSelectedMonth]);

  return <Dashboard initialMonth={month} year={selectedYear} onBack={() => navigate('/')} />;
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

function MonthRoute({ Component, backPath }: { Component: any; backPath: string }) {
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

function MonthParamRoute({ Component }: { Component: any }) {
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

function MonthRouteWithSetMonth({ Component, backPath }: { Component: any; backPath: string }) {
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

function PageRoute({ Component, backPath }: { Component: any; backPath: string }) {
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
  { path: '/budget-edg-annuel', element: <PageRoute Component={BudgetEdgAnnuel} backPath='/' /> },
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
  { path: '/utilisateurs', element: <PageRoute Component={UserManagementPage} backPath='/' /> },
]);

function EdgMensuelRoute() {
  const { month: monthParam } = useParams();
  const { selectedYear, selectedMonth, setSelectedMonth } = useData();
  const navigate = useNavigate();
  const month = parseMonthParam(monthParam, selectedMonth);

  useEffect(() => {
    if (month !== selectedMonth) {
      setSelectedMonth(month);
    }
  }, [month, selectedMonth, setSelectedMonth]);

  return <EdgMensuel month={month} setMonth={setSelectedMonth} onBack={() => navigate('/')} />;
}

export default router;
