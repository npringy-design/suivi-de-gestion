# Import historique Excel

## Objectif

Permettre de remplir rapidement le suivi quotidien a partir des anciens fichiers Excel de gestion, au lieu de saisir manuellement plusieurs mois ou plusieurs annees.

## Version actuelle

Premiere version ciblee : import des previsions budgetaires journalieres depuis les feuilles mensuelles du fichier Excel historique.

L'import est accessible depuis le bouton `Importer` du suivi quotidien, carte `Budget historique Excel`.

## Regle importante validee

L'import ne doit pas recopier tout le tableau Excel.

La logique retenue est la meme que dans le fichier Excel :

- on importe uniquement les donnees de base de prevision ;
- l'application recalcule ensuite les CA, totaux, cumuls et tickets moyens globaux ;
- on ne force pas les colonnes calculees.

## Perimetre d'import actuel

L'import lit uniquement le mois actuellement affiche dans le suivi quotidien.

Exemple : pour tester janvier, il faut d'abord afficher janvier dans le suivi quotidien, puis importer le fichier Excel.

Cette limite est volontaire pour eviter de remplir 12 mois d'un coup pendant la phase de validation.

## Feuille lue

L'application cherche la feuille mensuelle correspondant au mois affiche et a l'annee affichee :

- janvier 2026 -> `JANV 26` ;
- fevrier 2026 -> `FEV 26` ;
- mars 2026 -> `MARS 26` ;
- etc.

Les feuilles de type `BILAN`, `SAISIE`, `REPORTING`, `ANNUEL`, `REALISE` sont ignorees pour cet import budget.

## Colonnes utilisees

Pour chaque vraie date du mois, l'import lit uniquement :

- couverts midi ;
- TM midi ;
- couverts soir ;
- TM soir.

Dans la structure Excel actuelle, cela correspond a la zone `COUVERT RESTAURANTS` / `Prevision Saisie`.

Pour Hippo Thillois, les colonnes limonade du fichier Excel sont ignorees.

## Destination dans l'application

Les valeurs sont ecrites dans le dashboard du suivi quotidien :

- couverts budget midi -> colonne dashboard `6` ;
- TM budget midi -> colonne dashboard `7` ;
- couverts budget soir -> colonne dashboard `8` ;
- TM budget soir -> colonne dashboard `9` ;
- couverts / TM limonade -> colonnes dashboard `14` et `15`, videes pour Thillois.

Les colonnes CA budget midi, soir, total jour et cumul mois ne sont pas importees directement. Elles doivent etre recalculees par l'application a partir des couverts et TM.

## Securite import

L'import fonctionne avec une previsualisation avant validation :

1. lecture locale du fichier Excel ;
2. detection des jours trouves sur le mois affiche ;
3. affichage des couverts et TM detectes ;
4. validation manuelle avant ecriture dans le suivi quotidien.

Les fichiers ne sont pas conserves dans l'application.

## Multi-site

La structure Excel etant commune, l'import peut etre etendu aux autres sites.

Point important : la gestion de la limonade doit rester configurable par site. Thillois est sans limonade. D'autres sites pourront activer la lecture des colonnes limonade si besoin.

## Fichiers concernes

- `scripts/dashboardHistoricalBudgetExcelPatch.ts` : premiere couche de lecture/previsualisation/application de l'import budget Excel ;
- `scripts/dashboardHistoricalBudgetFocusedPatch.ts` : correction ciblee pour limiter l'import au mois affiche et aux couverts/TM ;
- `scripts/dashboardThilloisNoLimonadePatch.ts` : neutralisation limonade pour Thillois ;
- `vite.config.ts` : activation des patchs ;
- `src/Dashboard.tsx` : composant cible modifie au build.

## Prochaines evolutions possibles

- Consolider `dashboardHistoricalBudgetExcelPatch.ts` et `dashboardHistoricalBudgetFocusedPatch.ts` en un seul patch propre quand la logique sera validee terrain.
- Importer aussi le realise journalier depuis les feuilles `BILAN` ou `SAISIE` apres validation de la source fiable.
- Ajouter un choix explicite de site avec option `limonade activee / desactivee`.
- Ajouter une detection des annees disponibles dans le fichier.
- Ajouter un rapport d'erreurs plus detaille pour les dates manquantes ou incoherentes.
