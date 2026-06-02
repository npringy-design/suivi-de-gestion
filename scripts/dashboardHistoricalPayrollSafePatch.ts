import type { Plugin } from 'vite';

export const dashboardHistoricalPayrollSafePatch = (): Plugin => ({
  name: 'dashboard-historical-payroll-safe-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;

    const next = code.replace(
      /  const findHistoricalPayrollTargetColumn = \(headerText: unknown, baseTargetCol: number\) => \{[\s\S]*?  const findHistoricalPayrollTargetColumnNear =/,
      `  const findHistoricalPayrollTargetColumn = (headerText: unknown, baseTargetCol: number) => {
    const rawHeader = String(headerText ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
    const header = normalizeHistoricalSupplierName(rawHeader);
    if (!header || /TOTAL|COUT|GLOBAL|PRODUCTIVITE|BUDGET|FRAIS|PERSONNEL|RATIO|ECART/.test(header)) return 0;

    const sectionOffset = header.includes('SALLE') ? 1 : 0;
    const spacedHeader = rawHeader.replace(/[^A-Z0-9]+/g, ' ').split(' ').filter(Boolean).join(' ');
    const isLevelOneTwo = spacedHeader.includes('NIV I II')
      || spacedHeader.includes('NIVEAU I II')
      || spacedHeader.includes('NIVEAU 1 2')
      || spacedHeader.includes('NIV 1 2')
      || header.includes('NIVIETII')
      || header.includes('NIVEAU1ET2')
      || header.includes('NIVEAUIETII');
    const isLevelThree = !isLevelOneTwo && (
      spacedHeader.includes('NIV III')
      || spacedHeader.includes('NIVEAU III')
      || spacedHeader.includes('NIV 3')
      || spacedHeader.includes('NIVEAU 3')
      || header.includes('NIVIII')
      || header.includes('NIVEAUIII')
      || header.includes('NIVEAU3')
    );

    if (header.includes('CADRE')) return baseTargetCol + sectionOffset;
    if (header.includes('MAITRISE')) return baseTargetCol + 2 + sectionOffset;
    if (isLevelOneTwo) return baseTargetCol + 4 + sectionOffset;
    if (isLevelThree) return baseTargetCol + 6 + sectionOffset;
    if (header.includes('APPRENTI')) return baseTargetCol + 8 + sectionOffset;
    return 0;
  };

  const findHistoricalPayrollTargetColumnNear =`
    );

    return { code: next, map: null };
  },
});
