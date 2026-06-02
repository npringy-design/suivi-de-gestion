# Import personnel historique adaptatif

## Contexte

Le chantier concerne uniquement la lecture des heures personnel dans l'import historique Excel. Les imports deja valides ne doivent pas etre modifies : budget/previsions, realise CA/couverts et cout matiere.

## Correction mise en place le 02/06/2026

Fichiers modifies :

- `scripts/dashboardHistoricalPayrollImportPatch.ts` ;
- `scripts/dashboardHistoricalPayrollSafePatch.ts` ;
- `vite.config.ts`.

Objectif : remplacer la logique trop rigide de lecture personnel sans toucher aux autres imports.

## Principe technique

La lecture personnel ne repose plus uniquement sur un decalage fixe autour de `TOTAL HEURES`.

La nouvelle logique :

- detecte les titres de zones `PROJECTION S/C AVEC PLANIFICATION SKELLO` et `FRAIS PERSONNEL REALISE` ;
- cherche les blocs `TOTAL HEURES` dans chaque section ;
- borne la projection avant la section realisee quand les deux existent, pour eviter les croisements ;
- lit plusieurs lignes d'en-tetes autour du bloc pour reconnaitre les colonnes personnel ;
- gere les formats globaux par statut et les formats detailles cuisine/salle ;
- garde un fallback prudent pour les anciens onglets sans en-tetes lisibles : colonnes cuisine uniquement, afin de ne pas inventer une repartition salle/cuisine ;
- elargit legerement les lignes candidates autour de la date deja detectee par les imports valides.

## Colonnes visees

Projection :

- format global : `62`, `64`, `66`, `68`, `70` ;
- format detaille : `62` a `71` selon statut et section.

Realise :

- format global : `77`, `79`, `81`, `83`, `85` ;
- format detaille : `77` a `86` selon statut et section.

## Points volontairement non modifies

- Pas de changement sur l'import budget/previsions.
- Pas de changement sur l'import realise CA/couverts.
- Pas de changement sur l'import cout matiere.
- Pas de changement sur la vue Analyse tant que l'import personnel adaptatif n'est pas valide terrain.
- Pas de regle fixe par mois ou par site.

## Validation technique

Le build Vercel du commit `3604a27b161cdc3b5bfd92b6823d87c4e9f1a473` est passe en succes.

## Validation terrain a faire

Tester dans l'application :

1. janvier 2026 : verifier que la derniere semaine remonte bien en personnel ;
2. fevrier 2026 : verifier que les heures personnel detaillees cuisine/salle remontent ;
3. verifier que les totaux personnel restent recalcules par l'application avec les taux de configuration salaires ;
4. verifier qu'aucune valeur cout matiere, budget ou realise CA/couverts n'a regresse.
