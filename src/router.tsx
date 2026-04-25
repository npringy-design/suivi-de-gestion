import { createBrowserRouter } from 'react-router-dom';

// Lazy load all pages for better performance
import { lazy } from 'react';

const Home = lazy(() => import('@/Home'));
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
