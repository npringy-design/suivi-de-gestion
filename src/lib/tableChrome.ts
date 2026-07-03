// Habillage visuel commun des tableaux de gestion.
// Utilisé par le Récap Annuel et la vue complète du suivi quotidien :
// toute retouche de palette se fait ici, une seule fois.

export const tint = (hex: string, opacity: number) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Dégradé plein pour les bandeaux forts (super-sections, ligne TOTAL).
export const strongGradient = (hex: string) =>
  `linear-gradient(180deg, ${tint(hex, 0.92)} 0%, ${hex} 100%)`;

export const sectionChrome = (accentBg: string) => {
  return {
    headerBg: `linear-gradient(180deg, ${tint(accentBg, 0.18)} 0%, ${tint(accentBg, 0.12)} 100%)`,
    subHeaderBg: `linear-gradient(180deg, ${tint(accentBg, 0.10)} 0%, ${tint(accentBg, 0.06)} 100%)`,
    totalBg: strongGradient(accentBg),
    headerColor: '#1f2937',
    subHeaderColor: '#334155',
    headerBorder: tint(accentBg, 0.18),
    headerDivider: tint(accentBg, 0.16),
  };
};

export type SectionChrome = ReturnType<typeof sectionChrome>;
