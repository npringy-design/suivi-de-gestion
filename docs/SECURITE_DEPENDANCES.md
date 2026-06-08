# Securite des dependances npm

Photographie de `npm audit` au 08/06/2026. Ce fichier liste les CVEs connues a date
de redaction, sans correction immediate (remplacement hors perimetre pour le moment).

A SUPPRIMER une fois toutes les vulnerabilites listees ci-dessous corrigees.

## jspdf (critique)

- Version installee : `<=4.2.0` (derniere disponible : `4.2.1`)
- Risque : injection d'objet PDF via la couleur `FreeText` (GHSA-7x6v-j9x4-qf24) et
  injection HTML dans les nouvelles fenetres ouvertes (GHSA-wfv2-pwc8-crg5)
- Action recommandee : mettre a jour vers `jspdf@4.2.1` ou superieur (`npm audit fix`)

## react-router / react-router-dom (eleve)

- Version installee : `react-router-dom@^7.14.2` (derniere disponible : `7.17.0`)
- Risque : deni de service par expansion non bornee de chemin sur l'endpoint
  `__manifest` (GHSA-8x6r-g9mw-2r78)
- Action recommandee : mettre a jour vers `react-router-dom@7.17.0` ou superieur

## vite (eleve)

- Version installee : `<=6.4.1` (derniere disponible : `8.0.16`)
- Risque : traversee de chemin dans la gestion des `.map` des dependances optimisees
  (GHSA-4w7w-66w2-5vf9) et lecture arbitraire de fichiers via le WebSocket du serveur
  de developpement (GHSA-p9ff-h696-f583)
- Action recommandee : monter de version (`vite@7` ou `8`), en verifiant la
  compatibilite avec `@vitejs/plugin-react` et `@tailwindcss/vite` avant la migration

## xlsx (eleve, pas de correctif)

- Version installee : `0.18.5` (aucune version corrigee publiee)
- Risque : pollution de prototype (GHSA-4r6h-8v6p-xvw6) et deni de service par
  expression reguliere (ReDoS, GHSA-5pgg-2g8v-p4x9)
- Action recommandee : remplacer par une alternative maintenue (par exemple
  `exceljs` ou `@e965/xlsx`), en validant l'import/export Excel existant avant bascule

## Vulnerabilites transitives (outillage de developpement uniquement)

Ces paquets ne sont pas embarques dans le build de production ; ils proviennent de
la chaine de lint/test. Risque limite a l'environnement de developpement.

- `dompurify` (modere, via `jspdf`) : bypass XSS (GHSA-39q2-94rc-95cp et autres) -
  corrige en montant `jspdf`
- `minimatch` (eleve, via `@typescript-eslint/*`) : ReDoS (GHSA-3ppc-4f35-3m26 et
  autres) - corrige en montant `@typescript-eslint/eslint-plugin` et
  `@typescript-eslint/parser` vers une version `>=8`
- `picomatch` (eleve) : injection de methode et ReDoS (GHSA-3v7f-55p6-f55p,
  GHSA-c2c7-rcm5-vvqj)
- `postcss` (modere) : XSS via la sortie de stringification CSS (GHSA-qx2v-qp2m-jg93)
- `ws` (modere) : divulgation de memoire non initialisee (GHSA-58qx-3vcg-4xpx)

Action recommandee pour ces cinq entrees : `npm audit fix` (ou `--force` pour
`@typescript-eslint/*`, ce qui implique une montee de version majeure a valider).
