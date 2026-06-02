# Saisie des heures personnel et taux horaires

## Objectif

La partie personnel doit permettre :

- de saisir les heures naturellement dans le suivi quotidien ;
- de convertir ces heures en centieme pour les calculs de frais de personnel ;
- d'importer les couts salariaux PDF pour alimenter les taux horaires par statut et section ;
- d'utiliser ces taux dans la vue complete, pour les frais de personnel projetes et realises.

## Saisie des heures dans le suivi quotidien

Formats acceptes :

- `7`
- `7h30`
- `7:30`
- `7.30`
- `7,30`
- `7 30`

Regle retenue :

- en mode saisie, l'utilisateur doit voir un format horaire lisible, par exemple `7h30` ;
- il ne faut pas convertir brutalement pendant la frappe, car cela rend la saisie non fluide ;
- en vue complete et dans les calculs, l'heure doit etre convertie en centieme.

Exemples attendus :

- `7` -> saisie `7h00`, complet `7,00`
- `7h30` -> saisie `7h30`, complet `7,50`
- `7.30` -> saisie `7h30`, complet `7,50`
- `7,30` -> saisie `7h30`, complet `7,50`
- `7:30` -> saisie `7h30`, complet `7,50`
- `7h10` -> complet `7,17`
- `7h20` -> complet `7,33`
- `7h25` -> complet `7,42`
- `7h40` -> complet `7,67`
- `7h50` -> complet `7,83`

Point critique :

- ne pas arrondir les heures pour qu'elles finissent par `0` ou `5` ;
- l'arrondi doit etre uniquement mathematique au centieme ;
- les totaux personnel doivent additionner les valeurs deja converties et arrondies au centieme ligne par ligne, afin que les totaux correspondent aux valeurs visibles.

Exemple de controle :

- `6,45 + 8,52 + 4,75 + 7,25 + 7,75 + 17,57 + 16,67` doit donner `68,96`.

## Fonction de conversion

La logique commune est centralisee dans `src/utils.ts`, fonction `parseHourInputToDecimal`.

Cette fonction convertit les formats heures/minutes en nombre decimal utilisable pour les calculs.

## Referentiel personnel

La page `Info personnel` sert a faire le lien entre le nom lu dans un PDF de paie et la colonne du suivi quotidien.

Chaque ligne contient :

- nom attendu dans le PDF ;
- statut : cadre, agent de maitrise, niveau I et II, niveau III, apprenti ;
- section : salle ou cuisine ;
- alias eventuels pour les variantes de nom.

Exemple : `Pringy Nicolas | Cadre | Salle`.

## Import PDF salaires

L'import se fait depuis la page `Suivi quotidien`, dans la fenetre `Importer`, avec un fichier PDF salaires.

Mecanique retenue :

- le PDF est lu localement ;
- le PDF n'est pas conserve ;
- le texte brut de l'import n'est pas conserve ;
- les noms sont compares au referentiel `Info personnel` ;
- pour chaque salarie retrouve, l'import lit la colonne `Total heures` ;
- le cout utilise est la colonne `Cout global` ;
- le taux horaire est calcule avec provision CP : `cout global * coefficient CP / heures` ;
- coefficient CP cadre : `1,18` ;
- coefficient CP autres statuts : `1,10` ;
- les salaries avec `(forfait jour)` utilisent `151,67` heures, tout en recuperant le cout global normalement ;
- les taux sont regroupes par statut et section ;
- si plusieurs salaries correspondent a la meme colonne, une moyenne est appliquee.

## Import historique Excel - personnel

Correction ajoutee le 01/06/2026 : l'import historique Excel lit aussi les heures de personnel dans les zones :

- `PROJECTION S/C AVEC PLANIFICATION SKELLO` ;
- `FRAIS PERSONNEL REALISE`.

Principe :

- detection de la zone par le titre ;
- lecture simplifiee depuis la colonne `TOTAL HEURES` de chaque bloc ;
- import des 5 colonnes statut qui suivent : cadre, maitrise, niveau I/II, niveau III, apprenti ;
- l'ancien Excel regroupe les heures par statut, sans repartition cuisine/salle fiable ;
- l'application garde des colonnes cuisine/salle : par prudence, l'import historique place les heures sur les colonnes cuisine de chaque statut ;
- les lignes `Total Semaine`, cumul et total mois ne servent pas de source ;
- les heures sont ecrites dans les colonnes de saisie du suivi quotidien ;
- les couts globaux, productivites, ratios et ecarts restent recalcules par l'application.

Correction du 02/06/2026 : les heures personnel utilisent la meme ligne source corrigee que le budget/realise quand le fichier Excel presente un decalage de ligne. Cela evite que le 1er janvier prenne les heures du 2 janvier et que la derniere semaine reste vide.

Correction du 02/06/2026 : le parseur de dates historique accepte maintenant aussi les dates texte francaises avec jour de semaine, par exemple `lundi 26 janvier 2026`. Objectif : eviter que la derniere semaine soit ignoree si Excel stocke ces dates en texte au lieu d'une vraie date.

Colonnes visees :

- projection : colonnes cuisine `62`, `64`, `66`, `68`, `70` ;
- realise : colonnes cuisine `77`, `79`, `81`, `83`, `85`.

Les taux horaires ne sont pas repris depuis l'ancien Excel. Ils viennent de la configuration salaire du mois via les imports PDF salaires / page `Configuration Salaires et Charges`. Cela evite de figer d'anciens taux dans l'historique et respecte la regle : config salaire = source des taux, suivi quotidien = source des heures.

## Configuration salaires

La page `Configuration Salaires et Charges` sert a ajuster le snapshot salaires du mois.

Regles retenues :

- chaque ligne salariee peut etre supprimee individuellement ;
- la suppression ne doit plus retirer automatiquement la derniere ligne du tableau ;
- si la derniere ligne d'une categorie est supprimee, une ligne vide est recreee pour garder la saisie possible ;
- le bouton `Remise a zero` vide tout le mois selectionne : nom, section, heures, cout global, provision, cout horaire et ligne PDF source ;
- apres suppression ou remise a zero, la vue complete doit recalculer avec uniquement les lignes restantes de la config salaire ;
- si une categorie n'a plus de ligne valide, le taux horaire de cette categorie/section vaut `0` ;
- aucun taux par defaut ne doit creer artificiellement un montant quand une config salaire existe mais est vide.

Provision CP :

- dans la configuration salaire, la colonne `Total avec Provision CP` applique le coefficient par categorie ;
- cadre : `cout global * 1,18` ;
- agents de maitrise, niveaux I/II, niveau III et apprentis : `cout global * 1,10` ;
- la meme regle est utilisee pour les taux horaires affiches, l'import PDF, la vue complete et la vue analyse.

## Mois cible de l'import salaires

Le mois du PDF est lu dans le titre ou dans les lignes du tableau.

Regle : le PDF salaires d'un mois alimente le mois suivant dans l'application.

Exemples :

- PDF `Couts salariaux - Avril 2026` -> alimente `Mai 2026` ;
- PDF `Aout 2026` -> alimente `Septembre 2026` ;
- PDF `Decembre 2026` -> detection prevue vers `Janvier 2027`, a tester plus tard avec le changement d'annee.

## Snapshot et performance

L'import salaires ne doit pas garder une pile d'imports a relire.

Principe retenu :

- lecture du PDF une seule fois ;
- calcul des valeurs utiles ;
- sauvegarde d'un snapshot leger dans le mois cible ;
- aucune relecture du PDF a l'ouverture de l'application.

Le snapshot utile contient uniquement les informations necessaires aux calculs :

- statut ;
- section cuisine/salle ;
- heures ;
- cout global ;
- taux moyen par statut/section.

## Vue complete - frais de personnel

Les taux importes alimentent les colonnes :

- frais de personnel projection ;
- frais de personnel realise.

Regles d'affichage :

- les noms salaries ne doivent pas apparaitre dans les en-tetes ;
- les en-tetes doivent afficher uniquement le statut, cuisine/salle et le taux horaire ;
- exemple : `CADRE SALLE 37,89 €`.

Regles de calcul :

- les heures saisies sont converties au centieme ;
- les montants frais de personnel sont calcules avec les taux horaires importes ;
- lecture inter-pages : config salaire = taux horaire, vue saisie personnel = heures, vue complete = heures * taux horaire ;
- si le taux config salaire est vide ou nul, le montant calcule doit etre `0` ;
- en saisie journaliere, les heures realisees alimentent un recap calcule avec total heures, masse salariale du jour et ratio masse salariale / CA realise ;
- les totaux semaine et mois doivent correspondre a la somme des lignes visibles au centieme.

## Fichiers concernes

- `src/utils.ts` : conversion des heures ;
- `src/personnelSalaryImport.ts` : lecture du PDF salaires, forfait jour, cout global, mois cible ;
- `src/test/utils.test.ts` : tests de conversion des heures ;
- `src/test/personnelSalaryImport.test.ts` : tests d'import salaires ;
- `src/ConfigSalaires.tsx` : configuration salaires, suppression ligne et remise a zero ;
- `src/Dashboard.tsx` : suivi quotidien et vue complete ;
- `src/DashboardAnalysisView.tsx` : vue Analyse, lecture/synthese de la vue complete ;
- `scripts/dashboardPayrollColumnPatch.ts` : patch temporaire applique a `Dashboard.tsx` au build ;
- `scripts/dashboardStrictSalaryRatesPatch.ts` : suppression des taux salaires de secours dans les calculs de la vue complete ;
- `scripts/payrollCpProvisionPatch.ts` : coefficient provision CP par categorie, cadre a `1,18`, autres statuts a `1,10` ;
- `scripts/dashboardHistoricalPayrollImportPatch.ts` : ajout de l'import historique Excel des heures projection/realise ;
- `scripts/dashboardHistoricalTextDatePatch.ts` : support des dates texte francaises dans les imports historiques ;
- `vite.config.ts` : activation des patchs.

## Point technique important

Actuellement, une partie des corrections sur `Dashboard.tsx` passe par des patchs Vite.

Raison : `Dashboard.tsx` est tres gros et le remplacement complet du fichier est risque. Les patchs permettent de modifier des zones ciblees au build.

Ligne de conduite :

- ne pas multiplier les corrections dispersees sans verification ;
- si la logique personnel est validee, prevoir plus tard une integration propre directement dans `Dashboard.tsx` ;
- verifier systematiquement le build Vercel apres modification d'un patch.

## Points a verifier apres chaque correction

- le build Vercel passe ;
- `Suivi quotidien` s'ouvre sans erreur ;
- en saisie, `7`, `7h30`, `7.30`, `7,30`, `7:30`, `7 30` restent fluides ;
- la saisie affiche un format type `7h30` ;
- la vue complete affiche le decimal type `7,50` ;
- les totaux semaine/mois correspondent a la somme des valeurs visibles au centieme ;
- l'import PDF salaires d'avril alimente bien mai ;
- les forfaits jour sont bien a `151,67` heures ;
- supprimer une ligne salaire recalcule les taux avec les lignes restantes ;
- `Remise a zero` vide toutes les donnees salaire du mois selectionne ;
- cadre : verifier que `Total avec Provision CP` et le taux horaire utilisent bien `cout global * 1,18` ;
- autres statuts : verifier que la provision reste bien en `cout global * 1,10` ;
- sans taux valide en config salaire, les montants frais de personnel doivent rester a `0` malgre les heures saisies.
