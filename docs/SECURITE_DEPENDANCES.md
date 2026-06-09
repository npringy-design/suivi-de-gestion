# Securite des dependances npm

Photographie de `npm audit` au 09/06/2026 (apres patch jspdf et react-router-dom).
Ce fichier doit etre supprime une fois toutes les vulnerabilites corrigees.

## vite (eleve)

- Version installee : `<=6.4.1` (derniere publiee : `8.x`)
- Risque : traversee de chemin dans la gestion des `.map` des dependances optimisees
  (GHSA-4w7w-66w2-5vf9) et lecture arbitraire de fichiers via le WebSocket du serveur
  de developpement (GHSA-p9ff-h696-f583)
- Action recommandee : monter de version (`vite@7` ou `8`) en verifiant la
  compatibilite avec `@vitejs/plugin-react` et `@tailwindcss/vite` avant migration

## Vulnerabilites transitives (outillage de developpement uniquement)

Ces paquets ne sont pas embarques dans le build de production.

- `dompurify` (modere) : bypass XSS (GHSA-39q2-94rc-95cp et autres) —
  `npm audit fix` disponible
- `minimatch` (eleve, via `@typescript-eslint/*`) : ReDoS (GHSA-3ppc-4f35-3m26 et
  autres) — corrige en montant `@typescript-eslint/*` vers `>=8` (`npm audit fix --force`,
  montee de version majeure a valider)
- `picomatch` (eleve) : injection de methode et ReDoS (GHSA-3v7f-55p6-f55p,
  GHSA-c2c7-rcm5-vvqj) — `npm audit fix` disponible
- `postcss` (modere) : XSS via la sortie de stringification CSS (GHSA-qx2v-qp2m-jg93) —
  `npm audit fix` disponible
- `ws` (modere) : divulgation de memoire non initialisee (GHSA-58qx-3vcg-4xpx) —
  `npm audit fix` disponible
