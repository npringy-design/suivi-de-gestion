import { useAuthSession } from '@/AuthGate';
import { getSiteBrand, type SiteBrand } from '@/lib/sites';

// Nuance de couleur par enseigne (pas par site individuel) : tous les sites "hippo" partagent
// la même teinte, de même pour "au_bureau" quand cette enseigne existera. Chaque champ correspond
// 1:1 à une couleur déjà utilisée dans la sidebar (Home.tsx) et le sélecteur de site — "au_bureau"
// reprend exactement les valeurs cyan/teal historiques (aucun changement visuel tant qu'aucun site
// de cette enseigne n'existe), "hippo" reprend la palette rouge déjà utilisée sur l'écran de connexion.
export type SiteBrandTheme = {
  sidebarGradient: string;
  sidebarGlowA: string;
  sidebarGlowB: string;
  sidebarBorder: string;
  sidebarBorderSoft: string;
  sidebarHeaderLabel: string;
  sidebarHeaderTitle: string;
  iconBtnBg: string;
  iconBtnBgHover: string;
  iconBtnText: string;
  navGroupBg: string;
  navGroupIconBg: string;
  navGroupIconText: string;
  navGroupIconRing: string;
  navGroupDividerFrom: string;
  navItemActiveFrom: string;
  navItemActiveTo: string;
  navItemActiveShadow: string;
  navItemActiveRing: string;
  navItemInactiveText: string;
  navItemHoverBg: string;
  // Pastille pleine couleur : badge du sélecteur de site, cases à cocher de la gestion des utilisateurs.
  brandDot: string;

  // Cartes KPI de l'accueil (SummaryCard : CA, TM, Budget...) et carte S/C.
  cardGradient: string;
  cardBorder: string;
  cardBorderHover: string;
  cardShadowHover: string;
  cardGlow: string;
  cardLabelText: string;
  // Bulles météo/date + modales "Sélection de période" et "Prévision semaine" (même fond).
  panelGradient: string;
  panelBorder: string;
  panelBorderSoft: string;
  panelBorderFaint: string;
  panelTitleText: string;
  panelSubtleText: string;
  // Tuile "date" de l'accueil (un peu plus claire que les autres cartes).
  dateTileGradient: string;
  dateTileOverlay: string;
  dateTileAccent: string;
  dateTilePin: string;
  // Fond sombre des petites pastilles/lignes (S/C, badge période active).
  pillBgDark: string;
  // Cartes graphiques (fond blanc, accent discret).
  chartCardBorder: string;
  chartIconColor: string;
  // Dégradés des icônes des 4 cartes KPI de l'accueil.
  kpiGradient1: [string, string];
  kpiGradient2: [string, string];
  kpiGradient3: [string, string];
  kpiGradient4Negative: [string, string];

  // Page Tableau de bord (Dashboard.tsx) : en-tête + sidebar mois + tuiles d'action.
  sidebarGradientWide: string;
  panelGradientHover: string;
  sidebarActiveAccent: string;
  sidebarActiveAccentShadow: string;

  // Grand bandeau du nom du restaurant en haut de l'Accueil.
  heroGradient: string;
  heroBottomOverlay: string;
};

const AU_BUREAU_THEME: SiteBrandTheme = {
  sidebarGradient: 'linear-gradient(180deg,#07111f 0%,#0a2430 48%,#073d43 100%)',
  sidebarGlowA: 'rgba(45,212,191,0.16)',
  sidebarGlowB: 'rgba(14,116,144,0.22)',
  sidebarBorder: 'rgba(165,243,252,0.10)',
  sidebarBorderSoft: 'rgba(165,243,252,0.15)',
  sidebarHeaderLabel: 'rgba(207,250,254,0.55)',
  sidebarHeaderTitle: '#ecfeff',
  iconBtnBg: 'rgba(8,51,68,0.6)',
  iconBtnBgHover: 'rgba(12,74,110,0.7)',
  iconBtnText: 'rgba(207,250,254,0.7)',
  navGroupBg: 'rgba(207,250,254,0.10)',
  navGroupIconBg: 'rgba(103,232,249,0.10)',
  navGroupIconText: '#cffafe',
  navGroupIconRing: 'rgba(207,250,254,0.20)',
  navGroupDividerFrom: 'rgba(165,243,252,0.35)',
  navItemActiveFrom: '#078892',
  navItemActiveTo: '#0f5d66',
  navItemActiveShadow: 'rgba(8,51,68,0.4)',
  navItemActiveRing: 'rgba(165,243,252,0.20)',
  navItemInactiveText: 'rgba(207,250,254,0.7)',
  navItemHoverBg: 'rgba(103,232,249,0.10)',
  brandDot: '#0e7490',

  cardGradient: 'linear-gradient(to bottom right,#061f28,#073846,#0b5a62)',
  cardBorder: 'rgba(165,243,252,0.25)',
  cardBorderHover: 'rgba(165,243,252,0.5)',
  cardShadowHover: 'rgba(8,51,68,0.2)',
  cardGlow: 'rgba(165,243,252,0.10)',
  cardLabelText: 'rgba(207,250,254,0.75)',
  panelGradient: 'linear-gradient(to bottom right,#052a34,#0a4d58,#0d6b6f)',
  panelBorder: 'rgba(207,250,254,0.25)',
  panelBorderSoft: 'rgba(207,250,254,0.20)',
  panelBorderFaint: 'rgba(207,250,254,0.15)',
  panelTitleText: '#ecfeff',
  panelSubtleText: 'rgba(236,254,255,0.75)',
  dateTileGradient: 'linear-gradient(to bottom right,#06313b,#0b5f65,#16847d)',
  dateTileOverlay: 'rgba(8,51,68,0.2)',
  dateTileAccent: '#115e59',
  dateTilePin: '#cffafe',
  pillBgDark: 'rgba(8,51,68,0.25)',
  chartCardBorder: 'rgba(22,78,99,0.10)',
  chartIconColor: '#0e7490',
  kpiGradient1: ['#0891b2', '#115e59'],
  kpiGradient2: ['#14b8a6', '#155e75'],
  kpiGradient3: ['#f59e0b', '#0f766e'],
  kpiGradient4Negative: ['#0e7490', '#1e293b'],

  sidebarGradientWide: 'linear-gradient(135deg,#07111f 0%,#0a2430 46%,#073d43 100%)',
  panelGradientHover: 'linear-gradient(135deg,#07323d 0%,#0b5b67 52%,#0f787b 100%)',
  sidebarActiveAccent: '#3b82f6',
  sidebarActiveAccentShadow: 'rgba(59, 130, 246, 0.3)',

  heroGradient: 'linear-gradient(to right,#050914,#101b3f,#123847)',
  heroBottomOverlay: 'rgba(23,37,84,0.2)',
};

// Palette rouge, cohérente avec l'écran de connexion existant (#4b1f14 / #7a2f18 / #b6461d / #f2a51a).
const HIPPO_THEME: SiteBrandTheme = {
  sidebarGradient: 'linear-gradient(180deg,#1f0906 0%,#3a0f0a 48%,#5c1710 100%)',
  sidebarGlowA: 'rgba(248,113,113,0.16)',
  sidebarGlowB: 'rgba(180,40,25,0.22)',
  sidebarBorder: 'rgba(254,202,202,0.10)',
  sidebarBorderSoft: 'rgba(254,202,202,0.15)',
  sidebarHeaderLabel: 'rgba(254,226,226,0.55)',
  sidebarHeaderTitle: '#fef2f2',
  iconBtnBg: 'rgba(42,10,6,0.6)',
  iconBtnBgHover: 'rgba(92,23,16,0.7)',
  iconBtnText: 'rgba(254,226,226,0.7)',
  navGroupBg: 'rgba(254,226,226,0.10)',
  navGroupIconBg: 'rgba(252,165,165,0.10)',
  navGroupIconText: '#fee2e2',
  navGroupIconRing: 'rgba(254,226,226,0.20)',
  navGroupDividerFrom: 'rgba(254,202,202,0.35)',
  navItemActiveFrom: '#b6461d',
  navItemActiveTo: '#7a2f18',
  navItemActiveShadow: 'rgba(42,10,6,0.4)',
  navItemActiveRing: 'rgba(254,202,202,0.20)',
  navItemInactiveText: 'rgba(254,226,226,0.7)',
  navItemHoverBg: 'rgba(252,165,165,0.10)',
  brandDot: '#b6461d',

  cardGradient: 'linear-gradient(to bottom right,#2a0a06,#4a130b,#7a2f18)',
  cardBorder: 'rgba(254,202,202,0.25)',
  cardBorderHover: 'rgba(254,202,202,0.5)',
  cardShadowHover: 'rgba(42,10,6,0.2)',
  cardGlow: 'rgba(254,202,202,0.10)',
  cardLabelText: 'rgba(254,226,226,0.75)',
  panelGradient: 'linear-gradient(to bottom right,#2a0a06,#5c1710,#7a2f18)',
  panelBorder: 'rgba(254,226,226,0.25)',
  panelBorderSoft: 'rgba(254,226,226,0.20)',
  panelBorderFaint: 'rgba(254,226,226,0.15)',
  panelTitleText: '#fef2f2',
  panelSubtleText: 'rgba(254,242,242,0.75)',
  dateTileGradient: 'linear-gradient(to bottom right,#3a0f0a,#7a2f18,#b6461d)',
  dateTileOverlay: 'rgba(42,10,6,0.2)',
  dateTileAccent: '#5c1710',
  dateTilePin: '#fee2e2',
  pillBgDark: 'rgba(42,10,6,0.25)',
  chartCardBorder: 'rgba(122,47,24,0.10)',
  chartIconColor: '#991b1b',
  kpiGradient1: ['#b6461d', '#4b1f14'],
  kpiGradient2: ['#c2410c', '#7a2f18'],
  kpiGradient3: ['#f59e0b', '#5c1710'],
  kpiGradient4Negative: ['#9a3412', '#1e293b'],

  sidebarGradientWide: 'linear-gradient(135deg,#1f0906 0%,#3a0f0a 46%,#5c1710 100%)',
  panelGradientHover: 'linear-gradient(135deg,#3a0f0a 0%,#6b2412 52%,#8a3a1f 100%)',
  sidebarActiveAccent: '#b6461d',
  sidebarActiveAccentShadow: 'rgba(182, 70, 29, 0.35)',

  heroGradient: 'linear-gradient(to right,#140402,#2a0a06,#4b1f14)',
  heroBottomOverlay: 'rgba(42,10,6,0.25)',
};

export const SITE_BRAND_THEMES: Record<SiteBrand, SiteBrandTheme> = {
  hippo: HIPPO_THEME,
  au_bureau: AU_BUREAU_THEME,
};

export const getSiteBrandTheme = (brand: SiteBrand): SiteBrandTheme => SITE_BRAND_THEMES[brand] || HIPPO_THEME;

// Raccourci pour les composants sous AuthGate (sidebar, sélecteur de site) : lit le site actif
// et renvoie directement la nuance correspondante.
export const useSiteBrandTheme = (): SiteBrandTheme => {
  const { activeSiteId } = useAuthSession();
  return getSiteBrandTheme(getSiteBrand(activeSiteId));
};
