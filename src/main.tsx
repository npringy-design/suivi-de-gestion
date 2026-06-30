import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';

// Après un nouveau déploiement, les anciens chunks JS référencés par la page
// déjà ouverte n'existent plus sur le serveur (hash changé). On force un
// rechargement complet une seule fois pour récupérer le nouvel index.html
// et les nouveaux assets, au lieu d'afficher l'écran d'erreur générique.
const RELOAD_FLAG = 'reload-after-chunk-error';

const isChunkLoadError = (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message);
};

const handleChunkLoadError = (reason: unknown) => {
  if (!isChunkLoadError(reason)) return;
  if (sessionStorage.getItem(RELOAD_FLAG)) return;
  sessionStorage.setItem(RELOAD_FLAG, '1');
  window.location.reload();
};

const parseBudgetInteger = (value: string) => {
  const normalized = value.replace(/\s/g, '').replace(/[^\d,-]/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const findAnnualBudgetTable = () => {
  const tables = Array.from(document.querySelectorAll('table'));
  return tables.find((table) => {
    const headerRows = table.tHead?.rows;
    if (!headerRows || headerRows.length < 2) return false;

    const groupText = headerRows[0]?.textContent?.replace(/\s+/g, ' ').toUpperCase() ?? '';
    const columnText = headerRows[1]?.textContent?.replace(/\s+/g, ' ').toUpperCase() ?? '';

    return groupText.includes('CA')
      && groupText.includes('COUVERT')
      && columnText.includes('CUMUL')
      && columnText.includes('VAR')
      && columnText.includes('NB CVTS');
  });
};

const splitBudgetVariationHeader = (table: HTMLTableElement) => {
  const firstRow = table.tHead?.rows[0];
  if (!firstRow) return;

  const headerCells = Array.from(firstRow.cells);
  const alreadySplit = headerCells.some((cell) => cell.textContent?.trim().toUpperCase() === 'VARIATION');
  if (alreadySplit) return;

  const caHeader = headerCells.find((cell) => (
    cell.textContent?.trim().toUpperCase() === 'CA' && cell.colSpan === 5
  ));
  if (!caHeader) return;

  caHeader.colSpan = 4;
  const variationHeader = caHeader.cloneNode(false) as HTMLTableCellElement;
  variationHeader.textContent = 'VARIATION';
  variationHeader.colSpan = 1;
  variationHeader.style.borderTopRightRadius = '';
  caHeader.after(variationHeader);
};

const normalizeAnnualBudgetTotals = (table: HTMLTableElement) => {
  const bodyRows = Array.from(table.tBodies[0]?.rows ?? []);
  const totalRow = table.tFoot?.rows[0];
  if (!totalRow || bodyRows.length === 0) return;

  const lastMonthRow = [...bodyRows].reverse().find((row) => {
    const caJour = row.cells[3]?.textContent?.trim() ?? '';
    return caJour !== '' && caJour !== '0,00 €' && caJour !== '—';
  });

  if (lastMonthRow) {
    const lastCaVariation = lastMonthRow.cells[5]?.textContent?.trim() ?? '';
    const lastCouvertsVariation = lastMonthRow.cells[13]?.textContent?.trim() ?? '';

    if (lastCaVariation && totalRow.cells[5]?.textContent !== lastCaVariation) {
      totalRow.cells[5].textContent = lastCaVariation;
    }

    if (lastCouvertsVariation && totalRow.cells[13]?.textContent !== lastCouvertsVariation) {
      totalRow.cells[13].textContent = lastCouvertsVariation;
    }
  }

  const cumulativeCovers = bodyRows.reduce((sum, row) => (
    sum + parseBudgetInteger(row.cells[12]?.textContent ?? '')
  ), 0);
  const cumulativeCoversText = String(Math.round(cumulativeCovers));

  if (cumulativeCovers > 0 && totalRow.cells[12]?.textContent !== cumulativeCoversText) {
    totalRow.cells[12].textContent = cumulativeCoversText;
  }
};

const normalizeAnnualBudgetRecap = () => {
  const budgetTable = findAnnualBudgetTable();
  if (!budgetTable) return;

  splitBudgetVariationHeader(budgetTable);
  normalizeAnnualBudgetTotals(budgetTable);
};

const startAnnualBudgetRecapNormalizer = () => {
  const run = () => window.requestAnimationFrame(normalizeAnnualBudgetRecap);
  run();
  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.setInterval(run, 500);
};

window.addEventListener('unhandledrejection', (event) => handleChunkLoadError(event.reason));
window.addEventListener('error', (event) => handleChunkLoadError(event.error ?? event.message));

// Si l'app démarre normalement, on réautorise un futur rechargement automatique.
window.setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5000);

createRoot(document.getElementById('root')!).render(<App />);
startAnnualBudgetRecapNormalizer();
