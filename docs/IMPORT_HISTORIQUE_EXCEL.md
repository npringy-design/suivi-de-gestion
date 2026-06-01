# Import historique Excel

## Objectif

Permettre de remplir rapidement le suivi quotidien a partir des anciens fichiers Excel de gestion, au lieu de saisir manuellement plusieurs mois ou plusieurs annees.

## Version actuelle

Version ciblee : import des donnees journalieres depuis les feuilles mensuelles du fichier Excel historique.

L'import est accessible depuis le bouton `Importer` du suivi quotidien, carte `Budget historique Excel`.

## Regle importante validee

L'import ne doit pas recopier tout le tableau Excel.

La logique retenue est la meme que dans le fichier Excel :

- on importe uniquement les donnees de base fiables ;
- l'application recalcule ensuite les CA, totaux, cumuls, tickets moyens et ratios ;
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

Les feuilles de type `BILAN`, `SAISIE`, `REPORTING`, `ANNUEL`, `REALISE` sont ignorees pour cet import.

## Donnees budget lues

Pour chaque vraie date du mois, l'import lit :

- couverts midi ;
- TM midi ;
- couverts soir ;
- TM soir.

Dans la structure Excel actuelle, cela correspond a la zone `COUVERT RESTAURANTS` / `Prevision Saisie`.

Pour Hippo Thillois, les colonnes limonade du fichier Excel sont ignorees.

## Donnees realisees lues

L'import lit aussi le realise journalier :

- CA HT VAE -> colonne dashboard `17` ;
- CA HT midi -> colonne dashboard `18` ;
- CA HT soir -> colonne dashboard `19` ;
- CA HT limonade -> colonne dashboard `20` ;
- couverts midi -> colonne dashboard `25` ;
- couverts soir -> colonne dashboard `27` ;
- couverts limonade -> colonne dashboard `34`.

Les totaux, cumuls, TM et ecarts sont recalcules par l'application.

## Donnees cout matiere lues

Correction ajoutee le 31/05/2026 : l'import lit la zone `COUT MATIERE` en detectant les fournisseurs depuis les en-tetes Excel.

Principe :

- l'application parcourt les en-tetes de la zone cout matiere ;
- elle normalise le nom fournisseur ;
- elle cherche la colonne correspondante dans les fournisseurs de l'application ;
- si une valeur existe sur une vraie ligne de date, elle est importee dans la bonne colonne fournisseur ;
- les lignes `Total Semaine`, cumuls et ratios sont ignorees comme sources d'import.

Colonnes dashboard visees : fournisseurs achats HT `45` a `57`.

Des alias sont prevus pour les variations courantes : Doquet/C10, Terre Azur/Pomona F&L, Plaine Maison/Socopa, Episaveur, Metro/Depannage, Martel, etc.

Correction du 01/06/2026 : les avoirs cout matiere doivent etre importes en negatif. Le formatage d'import accepte maintenant les valeurs negatives au lieu de les vider. Les colonnes fournisseur cout matiere restent affichees en montants, meme si leur nom contient `%` comme `EPISAVEUR20%` ou `EPISAVEUR5%`.

Les totaux achat HT, cumuls HT et ratios sans stock restent recalcules par l'application.

## Garde-fou lignes total semaine

Correction ajoutee le 31/05/2026 : les lignes de total, semaine, cumul ou total mois sont ignorees pendant la lecture.

Objectif : eviter que le dimanche recupere les valeurs d'une ligne `Total Semaine`, par exemple `380 + 365 = 745` au lieu des vrais couverts du dimanche.

L'import peut toujours regarder la ligne precedente si la date Excel et les valeurs sont decalees, mais cette ligne precedente est rejetee si elle ressemble a un total.

## Destination dans l'application

Les valeurs budget sont ecrites dans le dashboard du suivi quotidien :

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
3. affichage des valeurs detectees ;
4. validation manuelle avant ecriture dans le suivi quotidien.

Les fichiers ne sont pas conserves dans l'application.

## Multi-site

La structure Excel etant commune, l'import peut etre etendu aux autres sites.

Point important : la gestion de la limonade doit rester configurable par site. Thillois est sans limonade. D'autres sites pourront activer la lecture des colonnes limonade si besoin.

## Fichiers concernes

- `scripts/dashboardHistoricalBudgetExcelPatch.ts` : premiere couche de lecture/previsualisation/application de l'import historique Excel ;
- `scripts/dashboardHistoricalBudgetFocusedPatch.ts` : correction ciblee pour limiter l'import au mois affiche, aux couverts/TM et ignorer les lignes total semaine ;
- `scripts/dashboardHistoricalRealiseImportPatch.ts` : ajout du realise CA/couverts ;
- `scripts/dashboardHistoricalCostMatterImportPatch.ts` : ajout des achats cout matiere par detection d'en-tetes fournisseurs ;
- `scripts/dashboardHistoricalCostMatterSafePatch.ts` : securisation de la correspondance fournisseurs cout matiere ;
- `scripts/dashboardCostMatterAmountFormatPatch.ts` : conservation des imports negatifs et affichage montant des fournisseurs cout matiere ;
- `scripts/dashboardThilloisNoLimonadePatch.ts` : neutralisation limonade pour Thillois ;
- `vite.config.ts` : activation des patchs ;
- `src/Dashboard.tsx` : composant cible modifie au build.

## Prochaines evolutions possibles

- Consolider les patchs d'import historique en un seul module propre quand la logique sera validee terrain.
- Ajouter un choix explicite de site avec option `limonade activee / desactivee`.
- Ajouter une detection des annees disponibles dans le fichier.
- Ajouter un rapport d'erreurs plus detaille pour les dates manquantes, fournisseurs non reconnus ou valeurs incoherentes.
