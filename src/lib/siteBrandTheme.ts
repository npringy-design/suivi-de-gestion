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
