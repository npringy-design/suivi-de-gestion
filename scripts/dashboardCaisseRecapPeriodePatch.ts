import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch import caisse recap periode non applique : ' + label);
  return code.replace(from, to);
};

export const dashboardCaisseRecapPeriodePatch = (): Plugin => ({
  name: 'dashboard-caisse-recap-periode-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = replaceRequired(
      next,
      "import { parseHourInputToDecimal } from '@/utils';",
      "import { parseRecapPeriodeCaisse } from '@/caisseRecapPeriodeParser';\nimport { parseHourInputToDecimal } from '@/utils';",
      'import parser recap periode'
    );

    next = replaceRequired(
      next,
      "  const parseCaisseRealise = (sourceText: string): ParsedCaisseImport => {\n    const text = sourceText.replace(/\\u00a0/g, ' ').replace(/€/g, '').replace(/\\s+/g, ' ');",
      "  const parseCaisseRealise = (sourceText: string): ParsedCaisseImport => {\n    const recapPeriodeParsed = parseRecapPeriodeCaisse(sourceText, normalizeImportText);\n    if (recapPeriodeParsed) return recapPeriodeParsed as ParsedCaisseImport;\n\n    const text = sourceText.replace(/\\u00a0/g, ' ').replace(/€/g, '').replace(/\\s+/g, ' ');",
      'appel parser recap periode'
    );

    return { code: next, map: null };
  },
});
