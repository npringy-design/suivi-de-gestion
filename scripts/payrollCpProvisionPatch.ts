import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch provision CP salaires non applique : ' + label);
  return code.replace(from, to);
};

const replaceEveryRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch provision CP salaires non applique : ' + label);
  return code.split(from).join(to);
};

export const payrollCpProvisionPatch = (): Plugin => ({
  name: 'payroll-cp-provision-patch',
  enforce: 'pre',
  transform(code, id) {
    const normalizedId = id.replace(/\\/g, '/');

    if (normalizedId.endsWith('/src/personnelSalaryImport.ts')) {
      let next = code;

      next = replaceRequired(
        next,
        "type SalariesCategories = Record<PersonnelCategory, SalarieRow[]>;",
        "type SalariesCategories = Record<PersonnelCategory, SalarieRow[]>;\n\nexport const getPayrollProvisionMultiplier = (category?: PersonnelCategory | string) =>\n  category === 'cadre' ? 1.18 : 1.10;",
        'helper import salaires'
      );
      next = replaceRequired(
        next,
        'const coutHoraire = (cost * 1.1) / hours;',
        'const coutHoraire = (cost * getPayrollProvisionMultiplier(personnel.category)) / hours;',
        'import PDF cout horaire'
      );
      next = replaceRequired(
        next,
        "export const averagePayrollRate = (rows: SalarieRow[], department?: 'cuisine' | 'salle') => {",
        "export const averagePayrollRate = (rows: SalarieRow[], department?: 'cuisine' | 'salle', category?: PersonnelCategory | string) => {",
        'signature averagePayrollRate'
      );
      next = replaceRequired(
        next,
        'return heures > 0 && coutGlobal > 0 ? (coutGlobal * 1.1) / heures : 0;',
        'return heures > 0 && coutGlobal > 0 ? (coutGlobal * getPayrollProvisionMultiplier(category)) / heures : 0;',
        'moyenne taux horaire'
      );

      return { code: next, map: null };
    }

    if (normalizedId.endsWith('/src/ConfigSalaires.tsx')) {
      let next = code;

      next = replaceRequired(
        next,
        "  const formatDepartment = (value?: string) => value === 'cuisine' ? 'Cuisine' : value === 'salle' ? 'Salle' : '-';",
        "  const formatDepartment = (value?: string) => value === 'cuisine' ? 'Cuisine' : value === 'salle' ? 'Salle' : '-';\n  const getPayrollProvisionMultiplier = (category: SalaryCategory) => category === 'cadre' ? 1.18 : 1.10;",
        'helper config salaires'
      );
      next = replaceEveryRequired(
        next,
        'const provision = coutGlobal * 1.10;',
        'const provision = coutGlobal * getPayrollProvisionMultiplier(category);',
        'provision config salaires'
      );

      return { code: next, map: null };
    }

    if (normalizedId.endsWith('/src/Dashboard.tsx')) {
      let next = code;

      next = replaceEveryRequired(
        next,
        'averagePayrollRate(rows, department)',
        'averagePayrollRate(rows, department, category)',
        'taux dashboard avec categorie'
      );

      return { code: next, map: null };
    }

    if (normalizedId.endsWith('/src/DashboardAnalysisView.tsx')) {
      let next = code;

      next = replaceRequired(
        next,
        'return averagePayrollRate(salariesConfig?.[category] || [], section);',
        'return averagePayrollRate(salariesConfig?.[category] || [], section, category);',
        'taux analyse avec categorie'
      );

      return { code: next, map: null };
    }

    return null;
  },
});
