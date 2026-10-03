import type { PersonnelCategory, PersonnelDepartment } from '@/types/dataTypes';

// Correspondance emploi du PDF (colonne entre la date d'entrée et la période) → catégorie et service,
// utilisée pour pré-remplir un salarié dont le nom ne figure dans aucun import précédent. Les suggestions
// sont toujours à confirmer dans l'aperçu : cette table se modifie ici, sans toucher au reste de l'import.
//
// Les mots-clés sont comparés sans accent ni casse, en début de mot ; la première règle qui correspond
// l'emporte (les plus spécifiques en premier). À ajuster avec les catégories déjà utilisées dans Config Salaires.

type JobCategoryRule = { keywords: string[]; category: PersonnelCategory };
type JobDepartmentRule = { keywords: string[]; department: PersonnelDepartment };

export const JOB_CATEGORY_RULES: JobCategoryRule[] = [
  { keywords: ['APPRENTI', 'ALTERNANT'], category: 'apprenti' },
  { keywords: ['DIRECTEUR', 'DIRECTRICE', 'GERANT', 'MANAGER GENERAL', 'RESPONSABLE D ETABLISSEMENT'], category: 'cadre' },
  { keywords: ['ASSISTANT MANAGER', 'ASSISTANTE MANAGER', 'SECOND DE CUISINE', 'CHEF DE CUISINE', 'MAITRE D HOTEL', 'RESPONSABLE'], category: 'maitrise' },
  { keywords: ['CHEF DE PARTIE', 'CHEF DE RANG', 'CHEF BARMAN'], category: 'niv3' },
  { keywords: ['SERVEUR', 'SERVEUSE', 'COMMIS', 'PLONGEUR', 'RUNNER', 'BARMAN', 'BARMAID', 'CUISINIER', 'HOTE', 'EMPLOYE', 'AGENT'], category: 'niv12' },
];

export const JOB_DEPARTMENT_RULES: JobDepartmentRule[] = [
  { keywords: ['CUISIN', 'CHEF DE PARTIE', 'SECOND', 'PLONG', 'GRILLARDIN', 'PIZZAIOLO', 'COMMIS DE CUISINE'], department: 'cuisine' },
  { keywords: ['SERV', 'SALLE', 'RUNNER', 'BAR', 'HOTE', 'MANAGER', 'DIRECT', 'MAITRE D HOTEL', 'CHEF DE RANG'], department: 'salle' },
];

export const DEFAULT_JOB_CATEGORY: PersonnelCategory = 'niv12';
export const DEFAULT_JOB_DEPARTMENT: PersonnelDepartment = 'salle';

const normalizeJob = (job: string) =>
  job
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

const startsWord = (normalizedJob: string, keyword: string) =>
  ` ${normalizedJob}`.includes(` ${keyword}`);

export type InferredPersonnel = {
  category: PersonnelCategory;
  department: PersonnelDepartment;
  // false quand aucune règle ne correspond (valeurs par défaut)
  recognized: boolean;
};

export const inferPersonnelFromJob = (jobTitle: string): InferredPersonnel => {
  const job = normalizeJob(jobTitle);
  const category = JOB_CATEGORY_RULES.find(rule => rule.keywords.some(keyword => startsWord(job, keyword)))?.category;
  const department = JOB_DEPARTMENT_RULES.find(rule => rule.keywords.some(keyword => startsWord(job, keyword)))?.department;

  return {
    category: category ?? DEFAULT_JOB_CATEGORY,
    department: department ?? DEFAULT_JOB_DEPARTMENT,
    recognized: category !== undefined,
  };
};
