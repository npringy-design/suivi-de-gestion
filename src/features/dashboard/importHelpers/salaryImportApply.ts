import type { PersonnelInfo } from '@/contexts/DataContext';
import type { SalaryImportPreviewRow } from '@/types/dataTypes';

import { extractPayrollLineName, mergePersonnelAlias } from './personnelSalaryImport';

export type PersonnelAfterImport = {
  personnelInfos: PersonnelInfo[];
  createdCount: number; // fiches créées pour les lignes « nouveau salarié »
  savedAliases: number; // alias mémorisés sur des fiches existantes
};

// À la validation de l'aperçu (rows = lignes réellement importées) :
// - une ligne sans fiche devient une fiche Info personnel (catégorie/service confirmés dans l'aperçu,
//   alias = nom lu dans le PDF) pour être reconnue aux imports suivants ;
// - une ligne associée à une fiche existante mémorise son nom PDF en alias si demandé.
export const applyImportedPersonnel = (
  personnelInfos: PersonnelInfo[],
  rows: SalaryImportPreviewRow[],
  createId: () => string,
): PersonnelAfterImport => {
  const aliasByPersonnelId = new Map<string, string>();
  rows
    .filter(row => row.origin === 'matched' && row.saveAlias && row.sourceLine)
    .forEach(row => {
      const alias = extractPayrollLineName(row.sourceLine);
      if (alias) aliasByPersonnelId.set(row.personnel.id, alias);
    });

  let savedAliases = 0;
  const updated = personnelInfos.map(personnel => {
    const alias = aliasByPersonnelId.get(personnel.id);
    if (!alias) return personnel;
    const aliases = mergePersonnelAlias(personnel, alias);
    if (aliases === personnel.aliases) return personnel;
    savedAliases += 1;
    return { ...personnel, aliases };
  });

  const created = rows
    .filter(row => row.origin === 'new')
    .map((row): PersonnelInfo => {
      const draft: PersonnelInfo = { ...row.personnel, id: createId(), aliases: '' };
      return { ...draft, aliases: mergePersonnelAlias(draft, extractPayrollLineName(row.sourceLine)) };
    });

  return { personnelInfos: [...updated, ...created], createdCount: created.length, savedAliases };
};
