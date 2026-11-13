import type { ShiftRoleDef } from '@/types/dataTypes';

// Dégradés par défaut des rôles d'origine ; un rôle ajouté dégrade sa couleur vers une teinte plus sombre.
const DEFAULT_GRADIENTS: Record<string, [string, string]> = {
  '#1e3a5f': ['#1e3a5f', '#0b1f33'],
  '#f59e0b': ['#f59e0b', '#d97706'],
  '#be123c': ['#be123c', '#881337'],
};

export const roleGradient = (couleur: string): string => {
  const [from, to] = DEFAULT_GRADIENTS[couleur.toLowerCase()] ?? [couleur, `color-mix(in srgb, ${couleur} 65%, black)`];
  return `linear-gradient(135deg, ${from}, ${to})`;
};

// Texte foncé sur les couleurs claires (salle ambrée), blanc sinon.
export const roleTextColor = (couleur: string): string => {
  const match = /^#([0-9a-f]{6})$/i.exec(couleur);
  if (!match) return '#ffffff';
  const value = parseInt(match[1], 16);
  const luminance = (0.299 * ((value >> 16) & 255) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255)) / 255;
  return luminance > 0.6 ? '#1f1300' : '#ffffff';
};

export const NO_ROLE_COLOR = '#94a3b8';

export const roleColorOf = (roles: ShiftRoleDef[], roleId: string | undefined): string =>
  roles.find(role => role.id === roleId)?.couleur ?? NO_ROLE_COLOR;

export const BEBAS_FONT = "'Bebas Neue', Impact, 'Arial Narrow', sans-serif";
