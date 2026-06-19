/**
 * Diagnostic V25 — lit un fichier Excel et affiche ce qu'ExcelJS voit.
 * Usage : node scripts/diagnose-v25.mjs "chemin/vers/fichier.xlsx"
 */

import { Workbook } from 'exceljs';
import { resolve } from 'path';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage : node scripts/diagnose-v25.mjs "chemin/vers/fichier.xlsx"');
  process.exit(1);
}

const workbook = new Workbook();
await workbook.xlsx.readFile(resolve(filePath));

console.log('\n=== ONGLETS DU CLASSEUR ===');
workbook.worksheets.forEach((ws, i) => {
  console.log(`  [${i}] "${ws.name}"  (${ws.rowCount} lignes x ${ws.columnCount} colonnes)`);
});

// Inspecte le premier onglet qui ressemble à un mois (pas BILAN/REPORTING/ANNUEL)
const sheet = workbook.worksheets.find(ws => {
  const n = ws.name.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return !/BILAN|SAISIE|REPORTING|ANNUEL/.test(n);
}) || workbook.worksheets[0];

console.log(`\n=== INSPECTION DE L'ONGLET "${sheet.name}" ===`);

const describeValue = (v) => {
  if (v === null || v === undefined) return `null/undefined`;
  if (v instanceof Date) return `Date(${v.toISOString().slice(0,10)})`;
  if (typeof v === 'number') return `number(${v})`;
  if (typeof v === 'string') return `string("${v.slice(0,30)}")`;
  if (typeof v === 'object') {
    const keys = Object.keys(v).join(', ');
    const result = v.result !== undefined ? ` result=${JSON.stringify(v.result)}` : '';
    const formula = v.formula ? ` formula="${String(v.formula).slice(0,20)}"` : '';
    const shared = v.sharedFormula ? ` sharedFormula="${v.sharedFormula}"` : '';
    return `object{${keys}}${formula}${shared}${result}`;
  }
  return String(v);
};

// Affiche les 15 premières lignes, colonnes 0-12
console.log('\nLigne | Col0(date) | Col1(CAmidi) | Col2(CAsoir) | Col3(limo) | Col8(cvtMidi) | Col10(cvtSoir)');
console.log('-'.repeat(100));

for (let row = 0; row < Math.min(sheet.rowCount, 60); row++) {
  const cols = [0, 1, 2, 3, 8, 10];
  const cells = cols.map(c => sheet.getCell(row + 1, c + 1));
  const hasContent = cells.some(c => c.value !== null && c.value !== undefined);
  if (!hasContent) continue;

  const fmt = (cell) => {
    const v = describeValue(cell.value);
    const t = cell.text ? `  text:"${cell.text.slice(0,15)}"` : '';
    return `${v}${t}`;
  };

  console.log(`\nLigne ${String(row).padStart(3)} :`);
  cols.forEach((c, i) => {
    console.log(`  col${c}: ${fmt(cells[i])}`);
  });
}
