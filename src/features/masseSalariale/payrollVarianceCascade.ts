export type CascadeBar = { left: number; width: number }; // en % de la largeur de la piste

export type PayrollCascade = {
  min: number; // origine de l'échelle (€) : les barres ne démarrent pas à 0 pour que les écarts restent visibles
  start: CascadeBar;
  steps: CascadeBar[]; // une barre flottante par étape, qui part là où la précédente s'arrête
  end: CascadeBar;
};

const MIN_WIDTH_PCT = 1.5;

const floorTo500 = (value: number) => Math.floor(value / 500) * 500;

// Cascade de `start` (coût N-1) vers start + somme des étapes (coût N). Échelle : cumul minimum − ~5 %, arrondi à 500 €.
export const buildPayrollCascade = (start: number, amounts: number[]): PayrollCascade => {
  const levels = [start];
  amounts.forEach(amount => levels.push(levels[levels.length - 1] + amount));
  const min = Math.max(0, floorTo500(Math.min(...levels) * 0.95));
  const span = Math.max(Math.max(...levels) - min, 1);
  const bar = (from: number, to: number): CascadeBar => {
    const low = Math.min(from, to);
    const high = Math.max(from, to);
    const width = Math.max(MIN_WIDTH_PCT, ((high - low) / span) * 100);
    return { left: Math.min(((low - min) / span) * 100, 100 - width), width };
  };

  return {
    min,
    start: bar(min, levels[0]),
    steps: amounts.map((_, index) => bar(levels[index], levels[index + 1])),
    end: bar(min, levels[levels.length - 1]),
  };
};
