// Réduction d'un classeur Excel aux onglets utiles à l'import, avant `workbook.xlsx.load`.
// Charger un classeur de 250 onglets bloque le navigateur plus de 40 s : on retire donc du zip
// les onglets inutiles (workbook.xml, rels, fichiers de feuilles), sans toucher au parsing.

export const BUDGET_SHEET_TOKENS: readonly (readonly string[])[] = [
  ['JANV', 'JANVIER'],
  ['FEV', 'FEVR', 'FEVRIER', 'FÉV', 'FÉVR', 'FÉVRIER'],
  ['MARS'],
  ['AVRIL', 'AVR'],
  ['MAI'],
  ['JUIN'],
  ['JUIL', 'JUILLET'],
  ['AOUT', 'AOÛT'],
  ['SEPT', 'SEPTEMBRE'],
  ['OCT', 'OCTOBRE'],
  ['NOV', 'NOVEMBRE'],
  ['DEC', 'DÉC', 'DECEMBRE', 'DÉCEMBRE'],
];

// Nom normalisé : sans accents, majuscules, séparateurs réduits à un espace.
export const normalizeExcelSheetName = (value: string): string => value
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Z0-9]+/gi, ' ')
  .trim()
  .toUpperCase();

const EXCLUDED_SHEET_PATTERN = /BILAN|SAISIE|REPORTING|ANNUEL|REALISE/;
const MONTH_TOKENS_NORMALIZED = BUDGET_SHEET_TOKENS.flat().map(normalizeExcelSheetName);

// Onglet mensuel « MOIS AA » ou « MOIS AAAA » (même exclusion que la recherche d'onglet d'import).
const isMonthSheetName = (normalized: string): boolean =>
  !EXCLUDED_SHEET_PATTERN.test(normalized)
  && MONTH_TOKENS_NORMALIZED.some(token => normalized.includes(token))
  && /\d{2}/.test(normalized);

// Année d'un classeur de suivi, lue dans le nom de ses onglets mensuels (« JANV 26 », « MARS 2025 ») :
// l'année la plus fréquente. null si aucun onglet mensuel n'en porte.
export const detectWorkbookYear = (sheetNames: readonly string[]): number | null => {
  const counts = new Map<number, number>();
  sheetNames.forEach(name => {
    const normalized = normalizeExcelSheetName(name);
    if (!isMonthSheetName(normalized)) return;
    const match = /(?:^|\s)(20\d{2}|\d{2})$/.exec(normalized);
    if (!match) return;
    const year = match[1].length === 2 ? 2000 + Number(match[1]) : Number(match[1]);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  });
  let best: number | null = null;
  counts.forEach((count, year) => { if (best === null || count > (counts.get(best) ?? 0)) best = year; });
  return best;
};

// Onglets utiles aux imports : mensuels, « ANNUEL BUDGET », et « 01 » à « 12 » (EDG mensuel V25).
export const isImportSheetName = (name: string): boolean => {
  const normalized = normalizeExcelSheetName(name);
  return normalized === 'ANNUEL BUDGET' || /^(0[1-9]|1[0-2])$/.test(normalized) || isMonthSheetName(normalized);
};

const decodeXmlAttr = (value: string): string => value
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&');

const readAttr = (tag: string, attr: string): string | null => {
  const match = new RegExp(`(?:^|\\s)${attr}="([^"]*)"`).exec(tag);
  return match ? decodeXmlAttr(match[1]) : null;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Chemin absolu dans le zip d'une cible de relation (« worksheets/sheet1.xml » ou « /xl/... »).
const resolveWorkbookTarget = (target: string): string => {
  const cleaned = target.replace(/^\/+/, '');
  return cleaned.startsWith('xl/') ? cleaned : `xl/${cleaned}`;
};

export type SheetFilterStats = { kept: number; total: number };

export async function keepOnlyImportSheets(
  buffer: ArrayBuffer,
  keepSheet: (name: string) => boolean,
  onStats?: (stats: SheetFilterStats) => void,
): Promise<ArrayBuffer> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buffer);

  const workbookFile = zip.file('xl/workbook.xml');
  const relsFile = zip.file('xl/_rels/workbook.xml.rels');
  if (!workbookFile || !relsFile) throw new Error('structure du classeur non reconnue (workbook.xml)');
  let workbookXml = await workbookFile.async('string');
  let relsXml = await relsFile.async('string');

  const sheetTags = workbookXml.match(/<sheet\s[^>]*?\/>/g) ?? [];
  if (sheetTags.length === 0) throw new Error('aucun onglet trouvé dans workbook.xml');

  const relTags = relsXml.match(/<Relationship\s[^>]*?\/>/g) ?? [];
  const relById = new Map<string, { tag: string; target: string }>();
  relTags.forEach(tag => {
    const id = readAttr(tag, 'Id');
    const target = readAttr(tag, 'Target');
    if (id && target) relById.set(id, { tag, target });
  });

  const removedParts: string[] = [];
  let kept = 0;
  sheetTags.forEach(tag => {
    const name = readAttr(tag, 'name') ?? '';
    if (keepSheet(name)) { kept += 1; return; }
    workbookXml = workbookXml.replace(tag, '');
    const rel = relById.get(readAttr(tag, 'r:id') ?? '');
    if (!rel) return;
    relsXml = relsXml.replace(rel.tag, '');
    const sheetPath = resolveWorkbookTarget(rel.target);
    const fileName = sheetPath.split('/').pop() ?? '';
    zip.remove(sheetPath);
    zip.remove(`xl/worksheets/_rels/${fileName}.rels`);
    removedParts.push(`/${sheetPath}`);
  });
  if (kept === 0) throw new Error('aucun onglet utile trouvé');
  onStats?.({ kept, total: sheetTags.length });

  // calcChain et noms définis référencent les onglets retirés : on les supprime.
  const calcChainRel = relTags.find(tag => /calcChain/i.test(readAttr(tag, 'Type') ?? ''));
  if (calcChainRel) relsXml = relsXml.replace(calcChainRel, '');
  zip.remove('xl/calcChain.xml');
  workbookXml = workbookXml.replace(/<definedNames>[\s\S]*?<\/definedNames>/, '').replace(/<definedNames\s*\/>/, '');

  const contentTypesFile = zip.file('[Content_Types].xml');
  if (contentTypesFile) {
    let contentTypes = await contentTypesFile.async('string');
    [...removedParts, '/xl/calcChain.xml'].forEach(part => {
      contentTypes = contentTypes.replace(new RegExp(`<Override\\s[^>]*PartName="${escapeRegExp(part)}"[^>]*?/>`), '');
    });
    zip.file('[Content_Types].xml', contentTypes);
  }

  zip.file('xl/workbook.xml', workbookXml);
  zip.file('xl/_rels/workbook.xml.rels', relsXml);
  return zip.generateAsync({ type: 'arraybuffer', compression: 'STORE' });
}
