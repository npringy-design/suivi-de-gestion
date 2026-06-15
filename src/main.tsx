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

window.addEventListener('unhandledrejection', (event) => handleChunkLoadError(event.reason));
window.addEventListener('error', (event) => handleChunkLoadError(event.error ?? event.message));

// Si l'app démarre normalement, on réautorise un futur rechargement automatique.
window.setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5000);

createRoot(document.getElementById('root')!).render(<App />);
