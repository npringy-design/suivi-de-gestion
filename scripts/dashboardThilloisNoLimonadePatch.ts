import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch no limonade Thillois non applique : ' + label);
  return code.replace(from, to);
};

export const dashboardThilloisNoLimonadePatch = (): Plugin => ({
  name: 'dashboard-thillois-no-limonade-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = replaceRequired(
      next,
      "      if (row.type === 'day') {\n        // Read inputs",
      "      if (row.type === 'day') {\n        // Hippo Thillois : pas d'activite limonade. Les valeurs restent ignorees meme si une ancienne donnee existe.\n        [2, 14, 15, 16, 20, 34, 35, 36, 110, 111, 112, 113, 114, 115].forEach(col => {\n          data[`${rIdx}-${col}`] = '';\n        });\n\n        // Read inputs",
      'neutralisation calcul limonade'
    );

    next = replaceRequired(
      next,
      "    const findColumn = (colIndex: number) => baseVisibleColumns.find(col => col.originalIndex === colIndex);",
      "    const thilloisNoLimonadeColumns = new Set([2, 14, 15, 16, 20, 34, 35, 36, 110, 111, 112, 113, 114, 115]);\n    const visibleColumnsWithoutLimonade = baseVisibleColumns.filter(col => {\n      const text = [col[0], col[1], col[2]].join(' ').toUpperCase();\n      return !thilloisNoLimonadeColumns.has(col.originalIndex) && !text.includes('LIMONADE');\n    });\n    const findColumn = (colIndex: number) => visibleColumnsWithoutLimonade.find(col => col.originalIndex === colIndex);",
      'filtre colonnes visibles limonade'
    );

    next = replaceRequired(
      next,
      "    if (activeTab !== 'REALISE' || tableViewMode !== 'COMPLET') return baseVisibleColumns;",
      "    if (activeTab !== 'REALISE' || tableViewMode !== 'COMPLET') return visibleColumnsWithoutLimonade;",
      'retour saisie sans limonade'
    );

    next = replaceRequired(
      next,
      "                  {renderDailyServiceRow('Limonade midi', 110, 112, 113)}\n                  {renderDailyServiceRow('Limonade soir', 111, 114, 115)}",
      "",
      'masquage saisie journaliere limonade'
    );

    return { code: next, map: null };
  },
});
