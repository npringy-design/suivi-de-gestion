# Point d'avancement — suivi-de-gestion

Lire ce fichier en premier. Il décrit l'état actuel et les règles actives.
Les détails fonctionnels sont dans les fichiers `docs/` dédiés.

---

## 17/07/2026 (EdgMensuel : cartes KPI en colonne latérale desktop)

- `EdgMensuel.tsx` : sur desktop (`!isMobile`), les 5 cartes KPI passent d'un bandeau horizontal au-dessus du tableau à une colonne latérale gauche fixe (176px, fond `#f8fafc`, scroll indépendant) — le tableau récupère toute la hauteur disponible à droite. Mobile inchangé (bandeau horizontal wrap au-dessus du tableau). Le tableau (thead + tbody, ~50 lignes détail) est désormais extrait dans une variable `edgTable` réutilisée dans les deux branches mobile/desktop pour éviter la duplication du JSX. Aucun calcul ni donnée touché. tsc OK, build OK. Vérification visuelle non faite (Supabase non configuré en dev local — page de connexion bloquante) — à valider après déploiement.

## 13/07/2026 (Lisibilité cellules + agrégats "à date" EDG annuels)

- `BudgetEdgAnnuel.tsx` : les cellules Budget/Réalisé/Écart empilaient montant + ratio dans une même `<td>` via une div flex (illisible sur 80px) — découpées en colonnes séparées Montant/Ratio (comme `VsBudget.tsx`, déjà correct), pour les colonnes mensuelles et pour la colonne Total. `<thead>` adapté en conséquence (`colSpan` 3→6 par mois/total, sous-en-tête "Ratio" ajouté pour Budget et Réalisé, dupliqué pour Écart qui n'en avait pas). Aucune valeur ni logique de calcul touchée, uniquement le découpage des `<td>` et l'ajout d'un ratio d'écart affiché en plus (non calculé auparavant).
- `BudgetEdgAnnuel.tsx`, `VsBudget.tsx`, `VsN1.tsx` : les cartes KPI et la colonne "Total Année" additionnaient les 12 mois pour Budget/Réalisé (ou N-1/Réalisé), comparant un budget annuel complet à un réalisé partiel sur le mois en cours/futurs — écart faussé. Ajout de `isMonthComplete(m)` (mois strictement antérieur au mois courant, ou année strictement antérieure) dans les 3 fichiers ; `getTotalCalc`, `getRowData.totalB/totalR/totalN1` et `caTotal`/`caN1Total` n'agrègent désormais que les mois clos des deux côtés de la comparaison. Colonnes mensuelles individuelles inchangées. En-tête "ANNÉE {YEAR}" → "À DATE {YEAR}" (VsN1 : "TOTAL {YEAR-1}"/"TOTAL {YEAR}" → "À DATE {YEAR-1}"/"À DATE {YEAR}") ; sous-titre "Cumul à date (X mois clos)" ajouté sous le libellé de chaque carte KPI.
- Aucune modification de `getMonthCalculations`/`ecart()`/logique de calcul métier. tsc OK, eslint OK (0 erreur), `npm run build` OK. Vérification visuelle non faite (Supabase non configuré dans cet environnement de dev local — page de connexion bloquante) — à valider après déploiement.

## 13/07/2026 (Bandeaux de section EDG sur les onglets annuels)

- Ajout de la fonction `renderSectionBanner` (reprise à l'identique d'`EdgMensuel.tsx` : fond `#1e293b`, texte blanc `#f8fafc`, icône + titre en majuscules) dans `BudgetEdgAnnuel.tsx`, `VsBudget.tsx`, `VsN1.tsx` et `RealiseEdgAnneeFiscale.tsx` — `colSpan={999}` (au lieu de `10` dans EdgMensuel) pour couvrir le nombre de colonnes propre à chaque vue (12 mois × 3-4 colonnes + total). 8 bandeaux insérés aux mêmes endroits que dans EdgMensuel : 🍽️ Coût Matière, 📈 Marge, 👥 Personnel, 📣 Publicité, 🏢 Frais Généraux d'Exploitation, 🔧 Frais Généraux d'Occupation, 🏗️ Coût des Immeubles, 📊 Résultats et Trésorerie.
- Aucune modification de la logique de calcul, des cartes KPI ni du code couleur d'écart déjà en place. `<thead>` non touché. tsc OK, `npm run build` OK. Vérification visuelle non faite (Supabase non configuré dans cet environnement de dev local — page de connexion bloquante) — à valider après déploiement.

## 13/07/2026 (Harmonisation visuelle des onglets EDG annuels)

- Cartes KPI et code couleur d'écart d'`EdgMensuel.tsx` (vert `#166534` favorable / rouge `#b91c1c` défavorable, inversion de signe pour les lignes de charges sauf `refacturation`/`aides_subventions`/`retraitement_daa`) repris à l'identique dans `BudgetEdgAnnuel.tsx`, `VsBudget.tsx` et `VsN1.tsx` : bandeau de 5 cartes KPI (C.A. Total HT, Marge Brute, Total Salaires et Charges, Résultat Gestion, E.B.E.) avec totaux annuels via `getTotalCalc`, et `ecartColor`/`ecartText`/`ecartRatioText` appliqués aux cellules d'écart existantes (remplace l'ancien `eVal < 0 ? rouge : défaut` sans vert ni inversion). `VsN1.tsx` compare contre N-1 (labels adaptés) au lieu du Budget.
- `RealiseEdgAnneeFiscale.tsx` (vue Réalisé seul, sans Budget ni écart dans le code existant) : cartes KPI adaptées affichant uniquement le total Réalisé annuel fiscal par indicateur, sans ligne Écart ni code couleur (rien à comparer) — décision utilisateur.
- Aucune modification de logique de calcul (`getMonthCalculations`, `getRowData`, `getTotalCalc`, `ecart()` inchangés). tsc OK, eslint OK (0 erreur, warnings préexistantes uniquement).

## 12/07/2026 (EdgMensuel : suppression header/sidebar dupliqués)

- EdgMensuel : suppression du header/sidebar dupliqués via prop `hideHeader` (défaut `false`, même pattern que `BudgetEdgAnnuel`/`RealiseEdgAnneeFiscale`/`VsBudget`/`VsN1`) — désormais toujours monté avec `hideHeader={true}` depuis `EdgAnnuelTabs.tsx` (route `/edg-mensuel/:month`), qui fournit déjà son propre header/onglets. Sidebar sombre 260px et header interne (titre, nom du mois, badge redondant) supprimés dans ce mode, remplacés par une ligne compacte : sélecteur de mois horizontal (pastilles scrollables) + badge "Avancement". Padding du conteneur tableau réduit 32px→16px et padding vertical des cartes KPI réduit, uniquement en mode `hideHeader` (mode complet `hideHeader=false` inchangé pour compatibilité). Mobile : comportement overlay conservé en mode complet ; en mode `hideHeader`, plus de sidebar donc plus de hamburger, sélecteur de mois horizontal scrollable à la place. Aucun calcul/donnée touché. tsc OK, build OK. Vérification visuelle non faite (Supabase non configuré dans cet environnement de dev local, pas de session) — à valider après déploiement.

## 12/07/2026 (EDG : nouvelle page Paramètre EDG)

- EDG : nouvelle page Paramètre EDG (`/parametrage-edg`, lien Accueil dans "Outils") pour piloter l'auto-remplissage réalisé des 17 lignes EDG sous Résultat Gestion (loyer, amortissements, redevances...) : mode Fixe (recopie du budget saisi ce mois-ci), Pourcentage (% du CA réalisé du mois), ou Manuel (comportement actuel inchangé, aucune auto-valeur). Configuration globale (pas par mois/année), nouveau segment `edgChargesConfig` répliquant exactement le mécanisme `config2025` existant dans `DataContext.tsx` (storage localStorage dédié, `CloudSnapshot`/`CloudAppState`/segment cloud Supabase/`dirtySegmentsRef`/reset applicatif — `supabaseAppState.ts` et `DataContext.tsx` étendus en parallèle). `EdgMensuel.tsx` fusionne ces valeurs auto avec celles déjà calculées depuis le Suivi Quotidien (mêmes mécanismes `isAutoRealise`/point vert/saisie manuelle prioritaire, aucune clé en commun) ; les 4 autres vues EDG (BudgetEdgAnnuel, RealiseEdgAnneeFiscale, VsBudget, VsN1) non touchées. Clés/labels/valeurs par défaut centralisés dans `src/features/edg/edgChargesConfigDefaults.ts` (partagé par `DataContext` et la nouvelle page). tsc OK, build OK. Vérification visuelle non faite (Supabase non configuré dans cet environnement de dev local, pas de session) — à valider après déploiement.

## 12/07/2026 (EdgMensuel : écart contre budget complet)

- EdgMensuel : la colonne Écart comparait le réalisé à un budget proraté par l'avancement du mois (`réalisé − budget × monthProgress`), ce qui affichait des écarts verts trompeurs en cours de mois (ex. 112k€ réalisés vs 114k€ budgétés lu comme favorable car en avance sur le prorata). Décision produit : `ecart(r, b) = r − b` (budget complet, `monthProgress` conservé uniquement pour le badge "Avancement" du header). '—' affiché : par ligne détail si aucune donnée réalisée (ni saisie manuelle ni auto-calcul) n'existe pour cette clé ; pour les lignes calculées et les cartes KPI si le mois n'a aucune donnée réalisée du tout (aucun jour Suivi Quotidien renseigné et aucune saisie manuelle). Convention de signe/couleur (favorable = vert, défavorable = rouge, `invert` pour les lignes de charges) auditée ligne par ligne, inchangée car déjà correcte. En-tête "ECART BUDGET À DATE" → "ÉCART BUDGET", carte KPI "Écart à date" → "Écart". tsc OK, build OK.

## 12/07/2026 (EdgMensuel : lisibilité visuelle)

- EdgMensuel : ajout d'un bandeau de 5 cartes KPI (C.A. Total HT, Marge Brute, Total Salaires et Charges, Résultat Gestion, E.B.E. — Budget/Réalisé/Écart à date) sous le header, et de 8 bandeaux de section (Coût Matière, Marge, Personnel, Publicité, Frais Généraux d'Exploitation, Frais Généraux d'Occupation, Coût des Immeubles, Résultats et Trésorerie) scindant le mur de ~50 lignes détail en blocs identifiables. Présentation uniquement (JSX/CSS dans EdgMensuel.tsx), aucune donnée/calcul/clé touchés, colonnes Budget/Réalisé/Écart inchangées. Autres vues EDG non concernées. tsc OK, build OK. Vérification visuelle non faite (Supabase non configuré dans cet environnement de dev local, pas de session) — à valider après déploiement.

## 06/07/2026 (fix import Budget EDG : ratio importé au lieu du montant)

- Bug : `detectMonthColumns()` (`edgBudgetImport.ts`) scannait la ligne 5 de gauche à droite et écrasait `columns[month]` à chaque cellule date rencontrée. Or l'en-tête de chaque mois est fusionné sur 2 colonnes (montant € à gauche, ratio % à droite) et ExcelJS renvoie la même date fusionnée pour les deux colonnes — la boucle retenait donc en dernier la colonne ratio au lieu de la colonne montant. Toutes les valeurs de Budget EDG Annuel/Mensuel importées étaient en conséquence des ratios (ex. C.A. TOTAL HT affiché "1" au lieu de "111 825").
- Fix : `columns[month]` n'est plus écrasé une fois trouvé — seule la première colonne (la plus à gauche) portant la date d'un mois est retenue, toute colonne suivante portant la même date fusionnée est ignorée. Un test de non-régression simule la fusion réelle (`sheet.mergeCells`) et vérifie que le montant de la colonne de gauche est bien retourné. 7 tests OK (edgBudgetImport.test.ts), tsc OK, eslint OK, 99 tests OK, build OK.
- **Action requise** : toute donnée de Budget EDG déjà importée avant ce correctif est corrompue (stockée en ratios et non en euros, ex. `edgMensuel.ca_total_ht = "0.42"` au lieu de `"111825.00"`). Un ré-import du classeur Excel (feuille "ANNUEL BUDGET") est nécessaire après déploiement pour purger ces valeurs — l'import réécrit les clés présentes dans la feuille, donc un nouvel import suffit à corriger les mois déjà importés.

## 06/07/2026 (import auto du budget EDG depuis la feuille "ANNUEL BUDGET")

- Nouveau parseur `src/features/dashboard/importHelpers/edgBudgetImport.ts` : `parseEdgBudgetSheet(workbook)` lit la feuille `ANNUEL BUDGET` du classeur V26 (libellés en colonne A, 12 blocs mensuels de 3 colonnes, colonnes détectées dynamiquement via les dates en ligne 5 — aucun pas de colonne hardcodé), mappe les libellés vers les ~52 clés EDG existantes (`ca_total_ht`, `achats_food`, ... `remboursement_capital`) par correspondance de fragment normalisé (accents/casse/ponctuation ignorés, fragment le plus long prioritaire en cas d'ambiguïté), ignore les lignes de total recalculées par l'app. Réutilise `parseHistoricalBudgetCellNumber`/`parseHistoricalBudgetCellDate`/`getHistoricalBudgetCell` de `historicalBudgetImport.ts` sans duplication. Retourne `null` si la feuille est absente ou si aucune colonne mensuelle n'est détectée ; une cellule vide n'ajoute pas de clé (pas de `0` par défaut).
- `DataContext` : ajout de `importEdgBudget(valuesByMonth)` + helper `mergeEdgMensuelBudgetData` (`dataContextUpdateHelpers.ts`) — une seule mise à jour d'état fusionnant `edgMensuel` de chaque mois concerné (clés importées écrasent, saisie manuelle existante sur les autres clés préservée), au lieu d'une boucle `updateEdgMensuel` par cellule.
- Branché dans `handleHistoricalBudgetExcelImport` (`useDashboardImportHandlers.ts`) : après le traitement existant du Suivi Quotidien, `parseEdgBudgetSheet(workbook)` est appelé sur le classeur déjà chargé et, si non-null, importé immédiatement via `importEdgBudget` (pas de preview/validation, contrairement aux jours du Suivi Quotidien — le budget EDG annuel est une donnée indépendante). Feuille absente → import du Suivi Quotidien inchangé, sans erreur.
- 6 tests unitaires (`edgBudgetImport.test.ts`, workbook ExcelJS réel construit en mémoire) : détection feuille absente/insensible casse-espaces, mapping libellé→clé, colonnes par dates, cellules formule `{ result }`, lignes de total ignorées, cellule vide → clé absente. tsc OK, eslint OK (0 erreur), 98 tests OK, build OK.

## 06/07/2026 (fix EDG temps réel à zéro : colonnes dérivées non calculées)

- Les 5 vues EDG (`EdgMensuel`, `BudgetEdgAnnuel`, `RealiseEdgAnneeFiscale`, `VsBudget`, `VsN1`) lisaient `data[m]?.dashboard` brut, qui ne contient que les cellules de saisie — les colonnes dérivées (CA réalisé jour col 21, coûts matière/personnel jour col 58/87, etc.) ne sont calculées que par `computeDashboardData()`, appelé jusqu'ici uniquement dans `Dashboard.tsx` sur une copie jamais persistée. Toutes les agrégations EDG (CA réalisé, avancement, valeurs auto) retournaient donc 0.
- Ajout de `computeMonthDashboard(monthData, month, year)` dans `src/features/edg/edgRealtimeSources.ts` (même pattern que `useRecapAnnuelData`) : reconstruit `buildMonthRows`/`buildDynamicColumns` et appelle `computeDashboardData`, retourne `{}` si le mois n'a pas de dashboard saisi. Les 5 vues passent désormais par cette fonction avant d'agréger.
- Aligné le fallback réalisé auto : les 4 vues annuelles (`BudgetEdgAnnuel`, `RealiseEdgAnneeFiscale`, `VsBudget`, `VsN1`) utilisaient uniquement la saisie manuelle `edgMensuelRealise`, contrairement à `EdgMensuel` qui retombe sur `getAutoRealiseValues` (Suivi Quotidien) si aucune saisie. Les 4 vues appliquent maintenant la même priorité saisie manuelle > auto.
- 2 tests ajoutés à `edgRealtimeSources.test.ts` (calcul des colonnes dérivées, retour `{}` sur mois vide). tsc OK, eslint OK, 92 tests OK, build OK.

## 05/07/2026 (fix navigation mois EDG/Dashboard figée sur l'URL)

- `DashboardRoute` et `EdgMensuelRoute` (`src/router.tsx`) resynchronisaient `selectedMonth` depuis le paramètre d'URL à chaque changement de `selectedMonth` (effet avec `month`/`selectedMonth` en dépendances) — tout clic sur un autre mois dans une sidebar (EDG Mensuel, Dashboard) était immédiatement annulé par cet effet. Corrigé : synchronisation URL → state une seule fois au montage, via une ref capturant le mois initial (`initialMonthRef`), effet dépendant uniquement de `setSelectedMonth` (référence stable). `MonthParamRoute`/`MonthRouteWithSetMonth` n'avaient pas ce défaut (pas d'effet de resynchronisation) — vérifié, rien à corriger dessus.
- tsc OK, eslint OK, build OK. Vérification en direct impossible dans cet environnement (Supabase non configuré, pas de session) — câblage `dashboardData`/clés EDG (`achats_food`, `cout_salaires`, etc.) revérifié par lecture de code, cohérent avec `getAutoRealiseValues`.

## 05/07/2026 (EDG temps réel : fix CA col 21, réalisé auto + hub unifié)

- Fix bug CA réalisé EDG : 5 vues (`EdgMensuel`, `BudgetEdgAnnuel`, `RealiseEdgAnneeFiscale`, `VsBudget`, `VsN1`) sommaient la colonne 24 (VAR % VS N-1, hachurée, jamais remplie) au lieu de la colonne 21 (CA réalisé TOTAL JOUR). Centralisé dans `getCaRealiseMonth` (`src/features/edg/edgRealtimeSources.ts`), importé par les 5 vues — plus de duplication.
- Nouveau module `edgRealtimeSources.ts` (pur, sans React) : agrège le Suivi Quotidien pour l'EDG Mensuel — `getCaRealiseMonth`/`getCaBudgetMonth` (somme jour col 21/3), `getMonthProgress` (avancement du mois pondéré par le budget CA des jours renseignés, fallback ratio jours/mois si budget=0), `getAutoRealiseValues` (achats_food, cout_salaires, entretien_locaux, produits_entretien, pub_locale, contrats_maintenance déduits automatiquement du Suivi Quotidien, en négatif). 8 tests unitaires dédiés.
- EDG Mensuel : la colonne Réalisé se remplit désormais automatiquement depuis le Suivi Quotidien (cellule teintée + pastille "Calculé depuis le Suivi Quotidien"), reste modifiable manuellement (la saisie prime sur l'auto, effacer revient à l'auto) ; badge "Avancement : XX %" à côté du titre du mois ; colonne renommée "ECART BUDGET À DATE" = réalisé − budget × avancement (tiret si avancement nul). Colonne Budget non touchée.
- Navigation fusionnée : `EdgAnnuelTabs` devient le hub unique avec un premier onglet "Mensuel" (EdgMensuel) ; le raccourci Accueil "EdG Mensuel"/"Budget EdG" devient un seul "EDG" ; les routes `/edg-mensuel/:month` et `/budget-edg-annuel` pointent désormais vers ce hub (onglets Mensuel/Budget pré-sélectionnés), `/edg-annuel-tabs` reste la route principale du hub.
- tsc OK, build OK, 90 tests OK.

## 04/07/2026 (fix Frais de Personnel : import historique + ratio semaine)

- Import historique personnel (`getBestHistoricalPayrollValues`) : le fallback de compensation de décalage d'en-tête (offsets `dateRow±1` à `±4`) traversait les lignes "Total Semaine" et retombait sur les valeurs du dernier jour réel, les dupliquant sur les 3 jours suivants quand l'import s'arrêtait avant la fin d'une semaine. `collectHistoricalPayrollOffsetCandidates` s'arrête désormais dès qu'une ligne total (`isHistoricalBudgetTotalRow`) est rencontrée, dans chaque direction. tsc OK, build OK, 81 tests OK.
- Purge des duplications personnel déjà persistées : le reset des colonnes personnel à l'application de l'import ne couvrait que les jours présents dans les previews — un jour sans donnée source (skippé en amont) conservait indéfiniment les valeurs dupliquées d'un ancien import. `resetHistoricalPayrollForMonths` (useDashboardImportHandlers) vide désormais les colonnes personnel de tous les jours des mois importés avant réécriture, dans les deux flux V26 et V25. **Nécessite un ré-import du fichier Excel pour purger les mois touchés.** tsc OK, build OK, 81 tests OK.
- Remise en logique de la section Frais de Personnel (vue complète, lignes semaine/mois) : (1) la ligne TOTAL mois somme désormais les colonnes d'heures par catégorie via `parsePayrollHourForCalculation` comme les lignes semaine (avant : `parseMoneyValue` → 0 ou vide) ; (2) ratios mois Productivité/Frais Personnel % projection (cols 73/74/75) basés sur le CA budgété mois au lieu du CA réalisé, aligné jour/semaine ; (3) écarts au budget NB d'heures et S/C % (cols 91/92, semaine et mois) calculés "à date" via `computeMatchedPayrollEcarts` — seuls les jours avec du réalisé sont comparés à leur projection, plus d'écart type -1232h (réalisé 3 jours vs projection mois complet) ni de 0 parasites sur les semaines vides. Colonne VAR % VS N-1 personnel : non calculable (pas d'heures N-1), reste hachurée. tsc OK, build OK, 82 tests OK.
- Détection ligne "Total Semaine" à libellé formule en erreur : dans les feuilles V26 réelles, le libellé de la ligne total est la formule `"Total Semaine "&WEEKNUM(A16,2)` dont le résultat est en erreur — le texte lu est "Invalid Date" et `isHistoricalBudgetTotalRow` ne détectait pas la ligne, laissant le fallback personnel la traverser et re-dupliquer le dernier jour à chaque import. La détection cherche désormais aussi TOTAL/SEMAINE/CUMUL dans les littéraux entre guillemets des formules des cols 0-5. Vérifié par simulation sur le fichier HIP THILL réel (jours 6-8 juillet n'atteignent plus le 5) + test unitaire. tsc OK, build OK, 82 tests OK.
- Total semaine Frais Personnel Projection : `data[rIdx-73]` (Productivité) et `data[rIdx-74]`/`data[rIdx-75]` (Frais Personnel %) divisaient par `realiseCAW` (CA réalisé semaine, partiel en cours de semaine) au lieu de `budgetCaW` (CA budgété semaine) — incohérent avec le niveau jour qui utilise déjà le budget. Colonnes 76-92 (bloc réalisé/écarts) inchangées, elles utilisent `realiseCAW` à bon droit. tsc OK, build OK, 81 tests OK.

## 03/07/2026 (correctifs reskin vue complète — couleurs par section + transparence scroll)

- Retour utilisateur sur le reskin du jour : le code couleur par section (Frais de Personnel en violet, etc., comme le Récap Annuel) avait disparu — remplacé par un accent unique par onglet — et le scroll vertical laissait voir à travers les en-têtes sticky. Deux correctifs, toujours vue complète uniquement :
  - `src/lib/tableChrome.ts` : ajout de `GROUP_ACCENTS`/`accentForGroup` — palette par groupe alignée sur `SECTIONS` du Récap Annuel (COUT MATIERE #166534, FRAIS DE PERSONNEL PROJECTION/REALISE #9333ea violet, FRAIS GENERAUX #78350f, CONTRAT MENSUALISES/RESULTATS MENSUEL HT #1e3a5f). `DashboardTableHeader.tsx` calcule désormais un `sectionChrome` par groupe/sous-groupe/colonne (au lieu d'un `chrome` unique pour toute la table) ; les groupes Prévisions/Réalisé/Événements gardent l'accent d'onglet via le fallback. Bandeau TOTAL FRAIS GÉNÉRAUX dans `DashboardTableBody.tsx` recoloré avec l'accent Frais Généraux au lieu de l'accent global.
  - `headerBg`/`subHeaderBg`/`totalBg` dans `sectionChrome()` et `strongGradient()` portent maintenant une couche `#ffffff` opaque en second plan (fonds sticky) — le dégradé rgba seul laissait transparaître le contenu qui défile dessous ; bénéficie aussi à RecapAnnuel qui partage le même chrome.
- tsc OK, eslint OK, 81 tests OK, build OK.

## 03/07/2026 (reskin vue complète suivi quotidien)

- Vue complète du suivi quotidien alignée sur l'habillage du Récap Annuel (visuel uniquement, aucun calcul touché) : `tint`/`sectionChrome`/`strongGradient` extraits dans `src/lib/tableChrome.ts` (RecapAnnuel et Dashboard importent désormais le même habillage) ; en-tête 4 niveaux en dégradés teintés par onglet (Prévisions #d97706, Réalisé #1e40af — même palette que le récap), super-sections en dégradé plein, bloc DATE #1C1917 ; colonne DATE sticky en dégradé teinté avec base blanche opaque (anti-transparence au scroll), codes couleur métier conservés (férié/événement/vacances/week-end) ; jour courant et ligne TOTAL mois en accent plein texte blanc ; totaux semaine en tint léger ; bandeau TOTAL FRAIS GÉNÉRAUX en accent. Vues Saisie et Analyse inchangées, récap mail non touché. tsc OK, eslint OK, 81 tests OK, build OK.

## 03/07/2026 (fiabilisation sync Supabase — commit 1e98b67)

- Audit complet puis fiabilisation de la synchronisation Supabase : (1) `saveCloudAppState` ne pousse plus que les snapshots modifiés dans la session (`dirtyMonths` + `dirtySegments`) — un mois localStorage jamais resynchronisé ne peut plus écraser les saisies d'un autre poste ; (2) token de session utilisateur envoyé sur toutes les requêtes `app_state` (policies RLS `to authenticated`) ; (3) RAZ locale provisoire strictement locale (ne vide plus les segments cloud, recharger restaure depuis Supabase) ; (4) flush de la sauvegarde débouncée sur `visibilitychange`/`pagehide` ; (5) `saveNow` attend le flush React avant de capturer le snapshot (imports Excel). tsc OK, eslint OK, 81 tests OK, build OK.
- **À contrôler au prochain déploiement** : la synchro doit répondre avec le token de session — si les policies Supabase en prod diffèrent de `supabase/APP_STATE_SETUP.sql`, rejouer ce script puis supprimer toute policy `anon` restante.
- Dettes connues assumées (à traiter uniquement au fil de l'eau) : chunk `Dashboard` 1,5 Mo (passer exceljs en `import()` dynamique), deps `html2canvas` et `motion` probablement inutilisées, localStorage réécrit en entier à chaque frappe, `ARCHITECTURE.md` racine référence encore `src/types.ts`/`src/utils.ts` disparus.

## 03/07/2026 (fix Ratio Perso/Cuisine Coût Matière)

- RecapAnnuel Coût Matière : Ratio Perso/Ratio Cuisine affichaient toujours +0,00% — `fp(g(40))`/`fp(g(42))` lisaient des colonnes déjà formatées en `"xx%"` que `parseMoneyValue` ne sait pas parser. Remplacé par calcul local `g(39)/ca*100` et `g(41)/ca*100` (mois), sur le modèle de `ratioHT` ; ligne TOTAL idem avec `s(39)/totalCA*100` et `s(41)/totalCA*100` (auparavant `'—'` codé en dur). Seuils couleur ajoutés dans COLS_COUT_MATIERE : `threshold: 1` sur Ratio Perso, `threshold: 0.5` sur Ratio Cuisine (rouge au-dessus, vert en-dessous — mécanisme `threshold` existant, s'applique aussi à la ligne TOTAL). tsc OK, 81 tests OK.

## 30/06/2026 (signColor écarts + tirets Coût Matière)

- RecapAnnuel : (1) ajout `signColor?: boolean` sur ColDef, appliqué aux 6 colonnes écart valeur brute (CA HT + Couverts) — les positifs s'affichent en vert avec badge comme les négatifs ; (2) `getSectionValues` cout_matiere : toutes les valeurs à zéro retournent `—` au lieu de `0,00 €` / `+0.00%`. tsc OK, 81 tests OK.

## 30/06/2026 (isNeg sans unité + accent Frais Personnel violet)

- RecapAnnuel : (1) détection `isNeg` simplifiée en `v.startsWith('-') && v !== '—'` (suppression contrainte `%`/`€`/`h`) dans tbody et tfoot — les écarts numériques bruts de Couverts Restaurant passent en rouge comme CA HT ; (2) `accentBg` de `frais_personnel` changé de `#7c2d12` à `#9333ea`. tsc OK, 81 tests OK.

## 30/06/2026 (Pastille tfoot + fe(coutProj))

- RecapAnnuel : (1) `needsTotalSignal` dans le tfoot déclenche désormais la pastille sur toutes les valeurs rouges/vertes (threshold, invertSign, signe textuel) — `isNeg`/`isPos` remplacés par `color === '#dc2626' || color === '#16a34a'` ; (2) `fe(coutProj)` conditionné par `ca > 0` comme `fmtRatio(ratioProj)` — affiche `—` pour les mois sans données. tsc OK, 81 tests OK.

## 30/06/2026 (Unification style tous onglets)

- RecapAnnuel : suppression de la branche `isBudgetTable` et des 7 constantes `BUDGET_*` — tous les onglets utilisent désormais le même chrome générique basé sur `accentBg`. Pastilles signées conservées. tsc OK, 81 tests OK.

## 30/06/2026 (DATE tbody Budget neutre)

- RecapAnnuel : correction du reskin des tableaux — cellule d'en-tête isolée fusionnée visuellement avec le premier groupe, Budget réaligné sur la même taille/titre que les autres onglets, palette jaune-orangé, totaux +/- en pastilles contrastées ; colonnes et calculs inchangés. tsc OK.

- RecapAnnuel Budget : cellule DATE sticky tbody passe de BUDGET_HEADER_GRADIENT (brun) à fond neutre — blanc/#faf8f5 zebrée, jaune #fef3c7 sur mois courant ; texte #0f172a, borderRight #e7e5e4 ; thead et tfoot inchangés. tsc OK. build OK. 81 tests OK.

## 30/06/2026 (palette dégradé Budget)

- RecapAnnuel Budget : palette dédiée BUDGET_HEADER_GRADIENT (#B8763A→#9A5E28), BUDGET_SUBHEADER_BG (#C98848), BUDGET_TOTAL_GRADIENT (#6B3C14→#B8763A) ; appliqués conditionnellement via activeTab==='budget' sur thead ligne 1, libellés colonnes, DATE sticky tbody et tfoot ; toutes les autres sections inchangées. tsc OK. build OK. 81 tests OK.

## 30/06/2026 (couleur Budget + thead uniforme)

- RecapAnnuel : accentBg Budget #92400e → #d97706 (jaune-orangé) ; ligne 1 thead (DATE + groupes) passe de linear-gradient à accentBg plein uni, bordures rgba(0,0,0,0.15) ; reste du dégradé doux (ligne libellés tint 0.16, DATE sticky, tfoot) inchangé. tsc OK. build OK. 81 tests OK.

## 30/06/2026 (dégradé doux RecapAnnuel)

- RecapAnnuel : fonction tint() locale (hex→rgba) ; thead ligne 1 (DATE + groupes) en linear-gradient 135° tint(accentBg, 0.85→0.65→0.45), texte #0f172a ; ligne libellés en tint(accentBg, 0.16), texte #334155 ; DATE sticky tbody même dégradé (0.30→0.16→#f8fafc, 0.45→0.28→#f1f5f9 mois courant) ; bordures internes via tint ; ACCENT_PALE et paleBg supprimés (inutilisés) ; tfoot conserve accentBg plein. tsc OK. build OK. 81 tests OK.

## 29/06/2026 (palette section RecapAnnuel)

- RecapAnnuel : map ACCENT_PALE par accentBg (6 sections) ; ligne groupes reste accentBg plein ; ligne libellés passe à paleBg + texte #374151 (plus de filter:brightness) ; DATE sticky accentBg uniforme, fontWeight 800 + boxShadow inset blanc sur mois courant ; cellules données blanc/#f8f8f7 zebrées (#f8fafc mois courant) sans aucune couleur colDef.bg. tsc OK. build OK. 81 tests OK.

## 29/06/2026 (couleurs accentBg RecapAnnuel)

- RecapAnnuel : header tableau (DATE th, groupes th, libellés th, tfoot) utilise désormais accentBg/accentColor propre à chaque section au lieu du noir fixe #1C1917 ; libellés colonnes assombris via filter:brightness(0.75) ; cellules tbody uniformisées blanc/#f8f8f7 zebrées (bleu pâle #f0f4ff sur mois courant) sans colDef.bg ; DATE sticky accentBg avec opacity 0.82 sur mois courant ; bordures intérieures en rgba pour s'adapter à toutes les couleurs d'accent. tsc OK. build OK. 81 tests OK.

## 29/06/2026 (corrections visuelles RecapAnnuel)

- RecapAnnuel : (1) fond des cellules de données onglet Budget — alternance blanc/#f4f4f3 par groupe au lieu de BG_BUDG jaune ; (2) hover .rr passe de jaune (#FEF3C7) à indigo (#EEF2FF) ; (3) borderRadius 8 sur le wrapper card + borderCollapse:separate/borderSpacing:0 + coins manuels sur DATE th (top-left), dernier groupe th (top-right), TOTAL td (bottom-left), dernière td tfoot (bottom-right). tsc OK. build OK. 81 tests OK.

## 29/06/2026 (reskin RecapAnnuel maquette stone)

- RecapAnnuel reskin visuel maquette : header fond #1C1917, tabs déplacés en barre blanche séparée (border-bottom amber actif, texte only sans icônes SVG), sélecteur années amber dans le header, bloc droite "Buro Monte" deux lignes ; thead fond #1C1917/#292524 uniforme (plus d'alternance bleue), colonne DATE sticky #1C1917 fond white, données zebra #fff/#FAFAF9 jaune très clair sur mois courant, tfoot #1C1917 avec fallback couleur #D6D3D1 ; footer texte #A8A29E. tsc OK. build OK. 81 tests OK.

## 29/06/2026 (sync N-1 RecapAnnuel)

- RecapAnnuel Frais Personnel VS N-1 : correction tirets chez les autres utilisateurs — le bootstrap Supabase ne chargeait que l'année/mois courant, laissant allData[YEAR-1] vide ; ajout de fetchCloudYearMonths (supabaseAppState) + loadYearFromCloud (DataContext) + useEffect dans RecapAnnuel qui charge les 12 mois N-1 au montage si manquants. tsc OK.

## 29/06/2026 (rendu final RecapAnnuel)

- RecapAnnuel : suppression du donut camembert et de l'import recharts ; bloc budget simplifié en renderTable direct ; conteneur overflow:hidden ; wrapper table overflowX:auto + borderRadius 12 + ombre ; table borderCollapse:separate/width:max-content pour scroll horizontal propre sans compression des colonnes. tsc OK.

## 29/06/2026 (nettoyage RecapAnnuel)

- RecapAnnuel : suppression du LineChart (lineData, CartesianGrid, XAxis, YAxis, Tooltip) ; import recharts réduit à Cell/Pie/PieChart/ResponsiveContainer ; tableau pleine largeur (borderCollapse collapse, width 100%, wrapper width 100%) ; conteneur principal flex-column. tsc OK.

## 29/06/2026 (graphiques Budget)

- RecapAnnuel Budget : deux graphiques recharts ajoutés sous le tableau — LineChart "Évolution du CA cumulé" (cumul + CA mensuel en pointillés) et PieChart donut "Répartition des couverts" (Midi/Soir) avec tuiles % + nb couverts. Affiché uniquement sur l'onglet Budget. tsc OK.

## 29/06/2026

- RecapAnnuel reskin visuel : tabs intégrés dans le header (icônes SVG checkbox, actif #1e40af), pill blanche droite avec CA N-1 ; header tableau — ligne 1 #1e40af, groupes alternance #b4c6e7/#dbeafe, libellés #dbeafe/#1e40af ; colonne DATE sombre (#1e3a5f/#1e40af mois courant) ; tfoot #1e40af fond blanc texte ; AMBER et BG_YELL supprimées. tsc OK.

## 28/06/2026 (import coût matière)

- Import historique V25/V26 coût matière : correction de montants aberrants après import — `parseHistoricalBudgetCellNumber` et `parseHistoricalCostMatterCellNumber` ignorent désormais les cellules de type date (valeur `instanceof Date` ou `{formula, result: Date}`) avant le fallback `cell.text` qui pouvait convertir "01/12/2026 00:00:00.100" en ~10^14 ; garde-fou MAX_SUPPLIER_DAILY_AMOUNT = 500 000 € ajouté sur les deux parseurs. tsc OK.

## 28/06/2026

- RecapAnnuel Coût Matière : 3 bugs corrigés — (1) données fantômes sur mois/semaines vides : week_total et month_total effacent maintenant les cellules quand hasData=false au lieu de conserver les valeurs stales ; (2) CUMUL HT calculé en progressif dans getSectionValues au lieu de lire col 59 (toujours 0) ; (3) Ratio calculé inline (totalHT/caRéalisé) au lieu de lire col 60 (parseMoneyValue échoue sur "xx%"). TOTAL row CUMUL = s(58). tsc OK.

## 27/06/2026

- Écart VS N-1 : appairage des jours par semaine ISO + jour de semaine (au lieu de Nième occurrence dans le mois) ; total semaine calculé par différence des totaux réel/budget vs somme N-1 appairée (au lieu de déduction algébrique) — s'applique aux 4 colonnes : CA réalisé 118/119, couverts réalisés 123/124, CA budget 128/5, couverts budget 129/13. tsc OK.

## 26/06/2026

- RecapAnnuel Réalisé : colonne "VAR vs Budget %" ajoutée après Tendance Annuel dans CA HT et COUVERTS (= cumul écarts / budget annuel, dynamique) — COLS_REALISE passe à 22 colonnes, getSectionValues et getTotalValues à 22 valeurs. tsc OK.
- RecapAnnuel Réalisé CVTS : même disposition que CA HT — 10 colonnes (NB Midi / Écart Midi / NB Soir / Écart Soir / NB Jour / Moy Jour / Écart Jour NB / Écart Jour % / Cumul / Tendance progressive) ; getSectionValues et getTotalValues passent à 20 valeurs. tsc OK.
- RecapAnnuel Réalisé Tendance : logique corrigée — budgetAnnuel + cumul progressif des écarts réalisés (col 22 / col 29-10) jusqu'au mois courant ; mois vides maintiennent le dernier cumul figé ; TOTAL = budget + somme de tous les écarts réalisés. tsc OK.
- RecapAnnuel Réalisé : affichage '—' sur mois vides (ca=0) ; tendanceCA/tendanceCvts calculées (réalisé jan→lastReal + budget pour les mois restants) ; COLS_REALISE passe à 18 colonnes (Tendance Cvts ajoutée en couverts) ; cumul CA corrigé sur caByMonth. tsc OK.
- RecapAnnuel Réalisé : COLS_REALISE restructuré à 17 colonnes (VAE/Midi/Écart Midi/Soir/Écart Soir/Jour/Écart Valeur/Écart %/Cumul/Tendance + 7 couverts) ; getSectionValues et getTotalValues mis à jour (écarts vs budget Midi/Soir/Jour calculés, ecartJourPct protégé si g(3)=0, cumul = somme col 21/29 jan→mois, moyennes pondérées TOTAL). tsc OK.

- RecapAnnuel Réalisé précédent : COLS_REALISE réduit de 25 à 15 colonnes (colonnes vides/redondantes supprimées, ordre Midi/Soir/VAE/Mois) ; getSectionValues et getTotalValues recalculés (cumul = somme col 21 jan→mois, cumul couverts = somme col 29, VAR N-1 protégée si ca=0, moyennes pondérées TOTAL) ; sCvtsMidi/Soir/Jour hors scope supprimées. tsc OK.

## 26/06/2026 (Budget précédent)

- RecapAnnuel Budget : CA_N1_BY_MONTH remplacé par les réalisés 2025 (source feuille "Variation 2025") ; cumul CA et CVTS calculés par somme jan→mois courant (au lieu de getLastDayVal) ; VAR VS N-1 basé sur le CA budget du mois vs CA réalisé N-1 ; ligne TOTAL avec moyennes CVTS pondérées et cumul annuel = totalCaJour. tsc OK.

## 15/06/2026

- Détection des dates journalières import historique : correction de `parseHistoricalBudgetDate` (cellules formule ExcelJS `{formula, result}` non gérées + regex `d`→`\d` cassées). tsc OK.
- Erreur "Failed to fetch dynamically imported module" après redéploiement : `src/main.tsx` recharge la page une fois automatiquement si un chunk obsolète échoue à se charger. tsc OK.
- Correctif duplication du 1er janvier : `useDashboardImportHandlers.ts` ne retient désormais que les cellules de date issues d'une formule Excel (ligne journalière), écartant la date statique d'en-tête de feuille. tsc OK.
- Correctif décalage des données importées : suppression du fallback `rowNumber - 1` / `rowNumber - 2` (couverts/TM/réalisé/personnel) devenu obsolète, lecture directe sur `rowNumber`. tsc OK.
- Import budget historique Excel : lecture de tous les mois du classeur en un seul import. tsc OK.
- Correctif démarques : application sur tous les mois lors de l'import multi-mois. tsc OK.
- Correctif import multi-mois : mois importés marqués comme chargés pour éviter l'écrasement Supabase à la navigation. tsc OK.
- Correctif persistance import : `saveNow` déclenche une sauvegarde Supabase immédiate après confirmation de l'import (le debounce 900ms était annulé si l'utilisateur quittait avant qu'il ne se déclenche). tsc OK.
- Fix bootstrap cloud : `applyCloudState` passe en merger (setAllData fonctionnel) + `cloudBootstrapDoneRef` bloque la sauvegarde auto pendant le bootstrap → données des mois importés conservées au rechargement. tsc OK.
- Import historique Excel format V25 : parseur dédié `historicalV25Import.ts`, handler `handleHistoricalV25ExcelImport`, détection automatique schéma personnel, bouton distinct dans DashboardImportModal. tsc OK.
- Correctif import V25 : suppression filtre isFormulaCell inadapté (dates directes dans V25) + reset complet des colonnes avant récriture pour garantir l'idempotence. tsc OK.
- Correctif parsing V25 : parseHistoricalBudgetNumber extrait désormais le résultat des formules ExcelJS ({ result: number }) avant de tomber sur String(). Corrige CA midi/soir et couverts vides à l'import. tsc OK.
- Correction colonnes import V25 : budget (8/9/10/11), réalisé CA (20/23/27/29), couverts réalisés (42/44), coût matière mapping fixe (cols 67-79), contrats V25 désactivés (montants tous à 0), diagnostic temporaire supprimé. tsc OK.
- FG V25+V26 : remplacement boucle while par itération sur plages de rows fixes [9-15, 18-26, 29-37, 41-48] — suppression de la détection textuelle de fin de box. tsc OK.
- Reset complet des cellules FG avant import (box 0-3, colGroup 0-2, dIdx 0-6) pour éliminer les données corrompues des anciens imports. tsc OK.
- Fix reset FG : borne dIdx corrigée de 6 à 9 pour correspondre au calcul des totaux. tsc OK.
- FG V26 : détection dynamique des offsets de colonnes par recherche de 'DATE' en row 8 (suppression des offsets hardcodés [123,128,133] invalides pour FEV-DEC 26). tsc OK.
- FG : déplacement du reset+écriture dans apply (atomique avec saveNow) — suppression du reset dans handle qui ne persistait pas en base. tsc OK.
- Calcul ECART VS N-1 : correspondance par semaine ISO + jour de semaine, cols 5/13 (budget) et 118/119/123/124 (réalisé CA/couverts). tsc OK.
- Correctif indices cols N-1 prévision : écart CA écrit en col 128 (CA ECART VS N-1 VALEUR) et écart CVTS en col 129 (RESTAURANTS ECART VS N-1 VALEUR) — les deux étaient décalés d'un cran, causant l'affichage de couverts au lieu d'euros. Exclusion et copy-from-last-day mis à jour avec le col 129. Third pass mois total aligné (128/129). Overflow débordement fin de mois : les 6 premiers jours du mois suivant en N-1 sont fusionnés dans nMinus1Data (Dashboard.tsx), avec calcul exact du srcRIdx tenant compte des total-semaine intercalés. tsc OK.
- Matching N-1 : remplacement de l'index "semaine ISO + jour de semaine" par "Nième occurrence du même jour de semaine dans le mois en N-1". Calcul mathématique de la date cible (getN1TargetDate) : 1er jeudi de janvier 2026 → 1er jeudi de janvier 2025 ; 5ème samedi de janvier 2026 → 1er février 2025 (débordement naturel). Index par clé YYYY-M-D. S'applique aux prévisions (budget) et réalisé (CA/couverts). tsc OK.
- Correction lint prefer-const Dashboard.tsx L365 (mergedCellData let → const). lint + build OK.
- Correction test sentinelle dashboardModel.test.ts : toHaveLength 140→144 (4 colonnes écart ajoutées). 81 tests passent.
- Refactor colonnes ECART section réalisée + fix doublon + écarts € prévision : dashboardColumns = 144 entrées (indices 0–143). Doublon APPRENTI supprimé (ex-index 139). Indices finaux : 139 = ECART BUDGET CUMUL €, 140 = ECART N-1 JOUR €, 141 = ECART N-1 JOUR % (hatched), 142 = ECART BUDGET CVTS CUMUL NB ; fantômes 143/144 = cumulN1CA/Cvts. First pass : cols 127 (CA ECART € budget vs N-1) et 128 (CVTS ECART € budget vs N-1) désormais calculés ; cols 5/13 recalculés aussi. Second/third pass : exclusion [139,140,142] + copie forEach depuis dernier jour [118,119,121,123,124,127,128,139,140,141,142]. Third pass : cols 127/128/5/13 du mois calculés depuis fantômes 143/144 du dernier jour. tsc OK.
- Capture mail : supersampling ×2 + downsample → PNG 620px net (texte antialiasé).
- Capture mail : HTML clipboard testé et abandonné (Outlook dépouille les styles). PNG supersampling ×2 conservé comme solution finale.
- RecapAnnuel : lecture des totaux depuis la ligne `month_total` calculée par `computeDashboardData` (via `useRecapAnnuelData`) au lieu de la somme brute jour/jour ; `buildMonthRows` extrait dans `dashboardRows.ts` et réutilisé par Dashboard.tsx. tsc OK.
- RecapAnnuel refonte complète : sélecteur d'année (YEAR-1/YEAR/YEAR+1) dans le header via `setSelectedYear` ; colonnes limonade supprimées (budget 18→14 cols, réalisé sans COUVERTS LIMONADE) ; `getSectionValues`/`getTotalValues` rebranchés sur indices réels de `dashboardColumns.ts` ; `getFgTotal(mi)` branché pour le total FG hors contrat ; sous-catégories FG marquées `'—'` (TODO brancher par catégorie). tsc OK.
- RecapAnnuel correctifs mapping : réalisé 27→25 cols (CA HT Limo + Ecart Budget Limo supprimés) ; mapping `getSectionValues` réalisé corrigé (col 21 = CA total jour, col 22 = écart budget, varP calc local) ; couverts arrondis via `Math.round` ; `fmtHeures` (HH:MM) pour les colonnes heures FP/FG ; `getRaw` ajouté à `useRecapAnnuelData` pour lire les valeurs brutes string (%, ratios) sans passage par `parseMoneyValue` ; FP section dynamique selon schéma personnel (`global` 22 cols avec indices 130-134/135-139 vs `cuisine_salle` 32 cols 62-71/77-86). tsc OK.
- RecapAnnuel budget : VAE supprimée (donnée réalisée, hors Budget) → 14→13 cols ; `getLastDayVal` ajouté à `useRecapAnnuelData` (lit le dernier jour-type pour les cumuls progressifs cols 4 et 12) ; moyennes CVTS calculées CA÷NB au lieu d'être lues depuis `month_total` ; VAR N-1 branché sur `varP` local (CA_N1_BY_MONTH) au lieu de col 5/13 qui sont nulles sur `month_total` ; ligne TOTAL recalculée CA annuel÷couverts annuels. tsc OK.
- Modale ANCV Papier multi-lignes : `AncvEntry` ajouté dans `dataTypes.ts` + champ `lignes?: AncvEntry[]` dans `DayDataAncvPapiers` ; `updateAncvLigne` dans DataContext (recalcule `montant_total`/`nombre_ancv` automatiquement) ; `AncvPapierModal.tsx` refaite avec 8 lignes valeur+nombre (même pattern que TrPapierModal) ; chaîne de props Dashboard→DashboardDailyEntry→DashboardCaisseView mise à jour. lint + 81 tests + build OK.
- Correctif crash "x.replace is not a function" ANCV papier : `ancv?.montant_total` (number) passé en string brut à `parseCaisseNumber` → enveloppé dans `reelStr()` dans l'appel `renderRealCaisseControl`. tsc OK.
- Fix CurrencyInput décimal SaisieTR + modales TR/ANCV papier (saisie quotidienne) : draft local dans CurrencyInput préserve "5." en cours de frappe (SaisieTR.tsx et TrPapierModal.tsx) ; AncvPapierModal.tsx créée (montant + nombre ANCV) ; clic label "ANCV papier" et "TR papier" dans DashboardCaisseView ouvre la modale correspondante. lint + 81 tests + build OK.
- Modale TR Papier (saisie quotidienne) : clic sur le label "TR papier" dans DashboardCaisseView ouvre TrPapierModal — 4 colonnes (Edenred/Bimpli/Pluxee/Up), 8 lignes valeur+nombre par colonne, total en temps réel, persistance immédiate via updateSaisieTR, bouton Valider/✕. Le champ réel affiche le montant calculé. lint + 81 tests + build OK.
- Nettoyage structurel : `src/types.ts` fusionné dans `src/types/dataTypes.ts` ; `src/utils.ts` → `src/lib/utils.ts` ; `src/personnelSalaryImport.ts` → `src/features/dashboard/importHelpers/personnelSalaryImport.ts` ; `src/accountingConfig.ts` → `src/features/comptabilite/accountingConfig.ts` ; `src/caisseRecapPeriodeParser.ts` → `src/features/caisse/caisseRecapPeriodeParser.ts`. Tous les imports mis à jour. lint + 81 tests + build OK.

---

## État technique au 09/06/2026

- Build Vercel : READY sur `main`. `tsc --noEmit` sans erreur. 68 tests Vitest passent.
- ESLint `no-explicit-any` : `warn` (actif). Zéro `any` dans le code actuel.
- Sécurité : voir `docs/SECURITE_DEPENDANCES.md`. CVEs résiduelles sans correctif disponible (vite, dompurify transitif) — aucune action immédiate requise.
- `Dashboard.tsx` : 1 139 lignes. Orchestrateur pur — voir règle Dashboard dans `AGENTS.md` et `src/features/dashboard/ARCHITECTURE.md`.

---

## Architecture en place

```
src/
  features/
    dashboard/      ← hooks/, components/, importHelpers/
                       dashboardCalculations.ts, dashboardColumns.ts
                       dashboardStaticConfig.ts, dashboardTypes.ts
    caisse/         ← CbNepting, Especes, Conecs, AncvPapiers, SaisieTR,
                       VisuTRPapiers, Sunday, Uber, AmexAncv, Deliveroo,
                       ClickCollect, RemiseTR, SaisieTheorique
    edg/            ← EdgMensuel, BudgetEdgAnnuel, EdgAnnuelTabs,
                       RealiseEdgAnneeFiscale, VsBudget, VsN1,
                       RecapAnnuel, SyntheseCA, Reporting
    salaires/       ← ConfigSalaires, CalculetteSalaires,
                       ConfigurationChiffre2025, VisuelVacances
    comptabilite/   ← ExportComptable, ParametrageComptable, BilanSynthese
    facturation/    ← FactureDevis, MiseEnPaiement, DepensesPetiteCaisse
  pages/            ← Home, DashboardAnalysisView
  components/       ← CanalSaisie, CurrencyInput
  contexts/         ← DataContext (provider + useData)
  types/            ← dataTypes.ts (tous les types métier)
  lib/              ← money, formatters, constants, browserStorage, suiviPermissions
  services/         ← supabaseAppState, supabaseAuth
```

---

## Règles actives

**Monnaie** : stocker en `number`, parser avec `parseMoneyValue()`, afficher avec `formatEuro()`.
**Types** : nouveaux types métier → `src/types/dataTypes.ts` uniquement.
**Utilitaires** : importer depuis `src/lib/`, ne jamais redéfinir localement.
**Dashboard** : pas de logique ajoutée directement — hooks ou sous-composants uniquement.
**Doc** : supprimer les sections qui ne décrivent que de l'historique terminé.
**Anti-gonflement** : factoriser au moment où on touche le code concerné, jamais en chantier isolé ; nouvelle page = modèle existant (`CanalSaisie` pour les canaux de caisse) ; fichier > ~500 lignes lors d'une modif → extraire dans le même commit. Détails dans `AGENTS.md`.
**Sync cloud** : toute nouvelle donnée persistée passe par `updateDataForYear(month, ...)` ou marque son segment dirty, sinon elle ne sera jamais poussée vers Supabase. Ne jamais réintroduire de sauvegarde de l'état complet. Détails dans `AGENTS.md` et `docs/SUPABASE_SYNC.md`.

---

## Fonctionnalités en place

- Auth Supabase globale via `AuthGate.tsx`. Détails : `docs/AUTHENTIFICATION.md`.
- Sync Supabase par segments mensuels. Détails : `docs/SUPABASE_SYNC.md`.
- Import caisse PDF. Détails : `docs/IMPORT_CAISSE.md`.
- Import historique Excel (budget, réalisé, coût matière). Détails : `docs/IMPORT_HISTORIQUE_EXCEL.md`.
- Export comptable CSV. Détails : `docs/ECRITURES_COMPTABLES.md`.
- Gestion utilisateurs (`/#/utilisateurs`). Détails : `docs/AUTHENTIFICATION.md`.
- Accueil avec KPIs, météo Thillois, sélection de période. Détails : `docs/ACCUEIL.md`.
- Synthèse CA avec maintien du mois par route. Détails : `docs/SYNTHESE_CA.md`.

---

## Points d'attention actifs

Import historique personnel : correction des regex `\d` cassées, lecture des cellules `Date`/timedelta (semaine 5+) et des chaînes décimales `"H.MM"`, ajout du schéma `global` (5 colonnes, cols 130-139) en plus de `cuisine_salle` (10 colonnes, cols 62-71/77-86), détection automatique du schéma par mois via `personnelSchema`. tsc OK.

L'appli sera multi-site (~6 sites) : aucune logique codée en dur par site ou par mois.

**Invitation email utilisateur** : retirée temporairement. Le lien Supabase pointe vers localhost
(projet partagé avec Gestion Commandes). Ne pas modifier `Site URL` Supabase sans vérifier
l'impact sur Gestion Commandes.

**Tuile S/C accueil** : doit lire les valeurs consolidées de la vue complète du suivi quotidien,
ne pas recalculer localement les taux salariaux.
