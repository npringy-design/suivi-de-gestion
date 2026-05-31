# Import historique Excel

## Objectif

Permettre de remplir rapidement le suivi quotidien a partir des anciens fichiers Excel de gestion, au lieu de saisir manuellement plusieurs mois ou plusieurs annees.

## Version actuelle

Premiere version ciblee : import des budgets journaliers depuis les feuilles mensuelles du fichier Excel historique.

L'import est accessible depuis le bouton `Importer` du suivi quotidien, carte `Budget historique Excel`.

## Feuilles lues

L'application cherche les feuilles mensuelles de l'annee affichee :

- `JANV 26`, `FEV 26`, `MARS 26`, etc. pour 2026 ;
- meme logique pour les autres annees, si la structure reste identique.

Les feuilles de type `BILAN`, `SAISIE`, `REPORTING`, `ANNUEL`, `REALISE` sont ignorees pour cet import budget.

## Colonnes utilisees

Pour chaque ligne correspondant a une vraie date du mois :

- colonne A : date ;
- colonne B : CA HT budget midi ;
- colonne D : CA HT budget soir ;
- colonne L : couverts midi ;
- colonne P : couverts soir.

Pour Hippo Thillois, les colonnes limonade du fichier Excel sont ignorees.

## Destination dans l'application

Les valeurs sont ecrites dans le dashboard du suivi quotidien :

- CA budget midi -> colonne dashboard `0` ;
- CA budget soir -> colonne dashboard `1` ;
- CA budget limonade -> colonne dashboard `2`, vide pour Thillois ;
- couverts budget midi -> colonne dashboard `6` ;
- couverts budget soir -> colonne dashboard `8` ;
- couverts budget limonade -> colonne dashboard `14`, vide pour Thillois.

Les totaux jour, cumuls et tickets moyens sont recalcules par le suivi quotidien.

## Securite import

L'import fonctionne avec une previsualisation avant validation :

1. lecture locale du fichier Excel ;
2. detection des jours et mois trouves ;
3. affichage du total CA budget et du total couverts detectes ;
4. validation manuelle avant ecriture dans le suivi quotidien.

Les fichiers ne sont pas conserves dans l'application.

## Multi-site

La structure Excel etant commune, l'import peut etre etendu aux autres sites.

Point important : la gestion de la limonade doit rester configurable par site. Thillois est sans limonade. D'autres sites pourront activer la lecture des colonnes limonade si besoin.

## Fichiers concernes

- `scripts/dashboardHistoricalBudgetExcelPatch.ts` : lecture/previsualisation/application de l'import budget Excel ;
- `scripts/dashboardThilloisNoLimonadePatch.ts` : neutralisation limonade pour Thillois ;
- `vite.config.ts` : activation des patchs ;
- `src/Dashboard.tsx` : composant cible modifie au build.

## Prochaines evolutions possibles

- Importer aussi le realise journalier depuis les feuilles `BILAN` ou `SAISIE` apres validation de la source fiable.
- Ajouter un choix explicite de site avec option `limonade activee / desactivee`.
- Ajouter une detection des annees disponibles dans le fichier.
- Ajouter un rapport d'erreurs plus detaille pour les dates manquantes ou incoherentes.
