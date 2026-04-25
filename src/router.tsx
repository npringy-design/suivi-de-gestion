import { createBrowserRouter } from 'react-router-dom';

// Lazy load all pages for better performance
import { lazy } from 'react';

const Home = lazy(() => import('@/pages/Home'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const SyntheseCA = lazy(() => import('@/pages/SyntheseCA'));
const RecapAnnuel = lazy(() => import('@/pages/RecapAnnuel'));
const Reporting = lazy(() => import('@/pages/Reporting'));
const SaisieTheorique = lazy(() => import('@/pages/SaisieTheorique'));
const CbNepting = lazy(() => import('@/pages/CbNepting'));
const Especes = lazy(() => import('@/pages/Especes'));
const Conecs = lazy(() => import('@/pages/Conecs'));
const AncvPapiers = lazy(() => import('@/pages/AncvPapiers'));
const SaisieTR = lazy(() => import('@/pages/SaisieTR'));
const VisuTRPapiers = lazy(() => import('@/pages/VisuTRPapiers'));
const Sunday = lazy(() => import('@/pages/Sunday'));
const Uber = lazy(() => import('@/pages/Uber'));
const AmexAncv = lazy(() => import('@/pages/AmexAncv'));
const Deliveroo = lazy(() => import('@/pages/Deliveroo'));
const ClickCollect = lazy(() => import('@/pages/ClickCollect'));
const RemiseTR = lazy(() => import('@/pages/RemiseTR'));
const BilanSynthese = lazy(() => import('@/pages/BilanSynthese'));
const DepensesPetiteCaisse = lazy(() => import('@/pages/DepensesPetiteCaisse'));
const EdgMensuel = lazy(() => import('@/pages/EdgMensuel'));
const BudgetEdgAnnuel = lazy(() => import('@/pages/BudgetEdgAnnuel'));
const VsBudget = lazy(() => import('@/pages/VsBudget'));
const VsN1 = lazy(() => import('@/pages/VsN1'));
const RealiseEdgAnneeFiscale = lazy(() => import('@/pages/RealiseEdgAnneeFiscale'));
const MiseEnPaiement = lazy(() => import('@/pages/MiseEnPaiement'));
const FactureDevis = lazy(() => import('@/pages/FactureDevis'));
const ConfigSalaires = lazy(() => import('@/pages/ConfigSalaires'));
const CalculetteSalaires = lazy(() => import('@/pages/CalculetteSalaires'));
const ConfigurationChiffre2025 = lazy(() => import('@/pages/ConfigurationChiffre2025'));
const VisuelVacances = lazy(() => import('@/pages/VisuelVacances'));
const EdgAnnuelTabs = lazy(() => import('@/pages/EdgAnnuelTabs'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/dashboard/:month',
    element: <Dashboard />,
  },
  {
    path: '/synthese',
    element: <SyntheseCA />,
  },
  {
    path: '/recap-annuel',
    element: <RecapAnnuel />,
  },
  {
    path: '/reporting',
    element: <Reporting />,
  },
  {
    path: '/saisie-theorique',
    element: <SaisieTheorique />,
  },
  {
    path: '/cb-nepting',
    element: <CbNepting />,
  },
  {
    path: '/especes',
    element: <Especes />,
  },
  {
    path: '/conecs',
    element: <Conecs />,
  },
  {
    path: '/ancv-papiers',
    element: <AncvPapiers />,
  },
  {
    path: '/saisie-tr',
    element: <SaisieTR />,
  },
  {
    path: '/visu-tr-papiers',
    element: <VisuTRPapiers />,
  },
  {
    path: '/sunday',
    element: <Sunday />,
  },
  {
    path: '/uber',
    element: <Uber />,
  },
  {
    path: '/amex-ancv',
    element: <AmexAncv />,
  },
  {
    path: '/deliveroo',
    element: <Deliveroo />,
  },
  {
    path: '/click-collect',
    element: <ClickCollect />,
  },
  {
    path: '/remise-tr',
    element: <RemiseTR />,
  },
  {
    path: '/bilan-synthese',
    element: <BilanSynthese />,
  },
  {
    path: '/depenses-petite-caisse',
    element: <DepensesPetiteCaisse />,
  },
  {
    path: '/edg-mensuel/:month',
    element: <EdgMensuel />,
  },
  {
    path: '/budget-edg-annuel',
    element: <BudgetEdgAnnuel />,
  },
  {
    path: '/vs-budget',
    element: <VsBudget />,
  },
  {
    path: '/vs-n1',
    element: <VsN1 />,
  },
  {
    path: '/realise-edg-annee-fiscale',
    element: <RealiseEdgAnneeFiscale />,
  },
  {
    path: '/mise-en-paiement/:month',
    element: <MiseEnPaiement />,
  },
  {
    path: '/facture-devis',
    element: <FactureDevis />,
  },
  {
    path: '/config-salaires',
    element: <ConfigSalaires />,
  },
  {
    path: '/calculette-salaires',
    element: <CalculetteSalaires />,
  },
  {
    path: '/configuration-chiffre-2025',
    element: <ConfigurationChiffre2025 />,
  },
  {
    path: '/visuel-vacances',
    element: <VisuelVacances />,
  },
  {
    path: '/edg-annuel-tabs',
    element: <EdgAnnuelTabs />,
  },
]);

export default router;
