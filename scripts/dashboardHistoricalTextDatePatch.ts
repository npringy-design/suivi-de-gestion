import type { Plugin } from 'vite';

export const dashboardHistoricalTextDatePatch = (): Plugin => ({
  name: 'dashboard-historical-text-date-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;

    const marker = `    const frMatch = text.match(/(\\d{1,2})[\\/.-](\\d{1,2})[\\/.-](\\d{2,4})/);`;
    if (!code.includes(marker) || code.includes('const normalizedTextDate = text.normalize')) return null;

    const insert = `    const normalizedTextDate = text.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/\\./g, ' ').replace(/\\s+/g, ' ').trim().toLowerCase();
    const monthWords: Record<string, number> = { janvier: 0, janv: 0, fevrier: 1, fevr: 1, fev: 1, mars: 2, avril: 3, avr: 3, mai: 4, juin: 5, juillet: 6, juil: 6, aout: 7, septembre: 8, sept: 8, octobre: 9, oct: 9, novembre: 10, nov: 10, decembre: 11, dec: 11 };
    const wordDateMatch = normalizedTextDate.match(/(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)?\\s*(\\d{1,2})\\s+([a-z]+)\\s+(\\d{2,4})/);
    if (wordDateMatch) {
      const monthIndex = monthWords[wordDateMatch[2]];
      if (monthIndex !== undefined) {
        const fullYear = wordDateMatch[3].length === 2 ? Number('20' + wordDateMatch[3]) : Number(wordDateMatch[3]);
        return new Date(fullYear, monthIndex, Number(wordDateMatch[1]));
      }
    }
`;

    return { code: code.replace(marker, insert + marker), map: null };
  },
});
