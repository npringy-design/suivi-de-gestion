import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch format montants cout matiere non applique : ' + label);
  return code.replace(from, to);
};

export const dashboardCostMatterAmountFormatPatch = (): Plugin => ({
  name: 'dashboard-cost-matter-amount-format-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = replaceRequired(
      next,
      `  const formatImportedNumber = (value: number, decimals = 2) => value > 0 ? value.toFixed(decimals) : '';`,
      `  const formatImportedNumber = (value: number, decimals = 2) => value !== 0 ? value.toFixed(decimals) : '';`,
      'conserver les imports negatifs'
    );

    next = replaceRequired(
      next,
      `    const isPercentage = colName.includes('RATIO') || colName.includes('%') || subGroupName.includes('RATIO');`,
      `    const isPercentage = groupName !== 'COUT MATIERE' && (colName.includes('RATIO') || colName.includes('%') || subGroupName.includes('RATIO'));`,
      'episaveurs cout matiere en montant'
    );

    return { code: next, map: null };
  },
});
