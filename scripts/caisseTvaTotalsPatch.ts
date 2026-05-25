import type { Plugin } from 'vite';

export const caisseTvaTotalsPatch = (): Plugin => ({
  name: 'caisse-tva-totals-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    if (!next.includes('parseCaisseTvaTotals')) {
      next = next.replace(
        "import { parseRecapPeriodeCaisse } from '@/caisseRecapPeriodeParser';",
        "import { parseRecapPeriodeCaisse } from '@/caisseRecapPeriodeParser';\nimport { parseCaisseTvaTotals } from '@/caisseTvaTotalsParser';"
      );
    }

    const oldBlock = "bilanValues: {\n        ttc_5_5: findCaisseTtcByRate(sourceText, '5,5'),\n        ttc_10: findCaisseTtcByRate(sourceText, '10'),\n        ttc_20: findCaisseTtcByRate(sourceText, '20'),\n      }";
    if (next.includes(oldBlock)) {
      next = next.replace(oldBlock, 'bilanValues: parseCaisseTvaTotals(sourceText)');
    }

    return { code: next, map: null };
  },
});
