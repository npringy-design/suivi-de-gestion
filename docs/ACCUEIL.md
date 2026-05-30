# Accueil

Ce document fixe les regles actuelles de la page d'accueil.

## Objectif

La page d'accueil sert de porte d'entree rapide vers les modules principaux et affiche les indicateurs de pilotage de la periode selectionnee.

## Entete

L'entete doit afficher l'identite du site courant :

- titre principal : `Hippopotamus` ;
- localisation : `Thillois`.

Le visuel general de la banderole est conserve. Les modifications doivent rester ciblees pour ne pas casser le rendu valide de l'accueil.

## Selection de periode

Les anciennes listes deroulantes mois / annee de l'accueil ont ete retirees, car elles n'etaient pas une selection claire pour l'utilisateur.

La selection passe maintenant par la tuile date du jour. Un clic sur cette tuile ouvre une fenetre de selection permettant :

- un jour precis ;
- une periode personnalisee avec date de debut et date de fin ;
- un mois entier ;
- une annee entiere.

Quand une periode est appliquee, le mois et l'annee actifs de l'application sont recalcules depuis la date de debut de la periode. Cela permet de garder les liens existants vers le suivi quotidien, l'EdG mensuel et les autres pages mensuelles sans modifier leur mecanique.

Le badge de periode sous la date n'apparait pas en affichage courant. Il apparait uniquement quand l'utilisateur applique une selection differente de la date du jour.

## Tuiles et graphiques lies a la periode

Correction du 30/05/2026 : les tuiles principales de l'accueil suivent la periode selectionnee dans le calendrier et adaptent aussi leurs libelles.

### Affichage par defaut

Sans selection particuliere, l'accueil reste en mode pilotage courant :

- `CA realise` = cumul du mois en cours ;
- `CA veille` = CA total du jour precedent ;
- `TM veille` = ticket moyen restaurant du jour precedent ;
- `Realisation Budget` = CA realise du mois / budget du mois ;
- le graphique `Evolution du CA` reste mensuel.

### Affichage avec selection

Quand une selection calendrier est appliquee, les tuiles basculent en mode selection :

- jour seul : `CA total jour` = CA total du jour avec VAE ; `CA resto hors VAE` = CA restaurant midi + soir uniquement ; `TM resto jour` = ticket moyen restaurant ; `Budget jour` ;
- periode personnalisee : `CA periode`, `CA moy. / jour`, `TM periode`, `Budget periode` ;
- mois entier : `CA mois`, `CA moy. / jour`, `TM mois`, `Budget mois` ;
- annee entiere : `CA annee`, `CA moy. / mois`, `TM annee`, `Budget annee`.

Le graphique `Evolution du CA` affiche les jours de la selection quand une periode est appliquee.

La tuile `S/C` ne recalcule pas les salaires. Elle lit les valeurs consolidees de la vue complete du suivi quotidien : cout global realise et pourcentage frais personnel. Pour une selection, elle agrege les couts et CA de la selection puis affiche le ratio correspondant.

Point important : l'accueil lit les donnees du suivi quotidien deja chargees en memoire. Le mois de debut de periode est charge via la selection active. Si une periode traverse plusieurs mois, les autres mois doivent avoir deja ete charges au moins une fois pour etre totalement pris en compte.

## Meteo

La meteo de l'accueil est libellee `Meteo Thillois` et utilise les coordonnees de Thillois pour l'appel Open-Meteo.

## Ligne de conduite technique

- La selection de periode est appliquee via `scripts/homeHeaderPeriodPatch.ts`, active dans `vite.config.ts`.
- Les KPI et le graphique CA sont bases sur les donnees du dashboard du suivi quotidien via `scripts/homePayrollBubblePatch.ts`, complete par `scripts/homeSmartPeriodSourcesPatch.ts` pour les sources liees a la selection.
- Les libelles dynamiques et les ajustements visuels sont appliques via `scripts/homeVisualPolishPatch.ts`.
- La tuile `S/C` est appliquee via `scripts/homePayrollBubblePatch.ts` et doit rester branchee sur les valeurs consolidees de la vue complete, pas sur un recalcul local des taux salariaux.
- Ce choix reste volontairement cible : la page `src/Home.tsx` possede deja plusieurs ajustements au build et une reecriture directe complete serait plus risquee.
- Ne pas recreer de listes deroulantes mois / annee dans l'entete d'accueil sans besoin metier clair.
- Si les KPI doivent calculer des periodes multi-mois avec chargement automatique de chaque mois Supabase, le faire comme une evolution dediee du DataContext.

## Fichiers concernes

- `src/Home.tsx` : page source modifiee au build ;
- `scripts/homeHeaderPeriodPatch.ts` : patch de l'entete et de la selection de periode ;
- `scripts/homePayrollBubblePatch.ts` : KPI dashboard, graphique CA et tuile S/C ;
- `scripts/homeSmartPeriodSourcesPatch.ts` : adaptation des sources KPI selon la selection ;
- `scripts/homeVisualPolishPatch.ts` : libelles dynamiques et finitions visuelles ;
- `vite.config.ts` : activation des patchs.
