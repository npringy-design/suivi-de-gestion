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

const normalizeAnnualBudgetRecap = () => {
  const tables = Array.from(document.querySelectorAll('table'));
  const budgetTable = tables.find((table) => {
    const firstGroup = table.tHead?.rows[0]?.cells[1];
    const headerText = table.tHead?.textContent ?? '';
    return firstGroup?.textContent?.trim() === 'CA'
      && firstGroup.getAttribute('colspan') === '5'
      && headerText.includes('COUVERT')
      && headerText.includes('VAR');
  });

  if (!budgetTable) return;

  const bodyRows = Array.from(budgetTable.tBodies[0]?.rows ?? []);
  const totalRow = budgetTable.tFoot?.rows[0];
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

const startAnnualBudgetRecapNormalizer = () => {
  const run = () => window.requestAnimationFrame(normalizeAnnualBudgetRecap);
  run();
  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
};

window.addEventListener('unhandledrejection', (event) => handleChunkLoadError(event.reason));
window.addEventListener('error', (event) => handleChunkLoadError(event.error ?? event.message));

// Si l'app démarre normalement, on réautorise un futur rechargement automatique.
window.setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5000);

createRoot(document.getElementById('root')!).render(<App />);
startAnnualBudgetRecapNormalizer();
