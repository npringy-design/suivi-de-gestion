# Suivi quotidien - vue complete realise et previsions

## Objectif

Nettoyer la vue complete des onglets Realise et Previsions pour retrouver une disposition lisible, proche du tableau de gestion attendu.

Le changement cible uniquement l'affichage complet des sections Realise et Previsions. Le recap mail valide ne doit pas etre modifie.

## Regle site Hippo Thillois - limonade desactivee

Hippo Thillois ne fait pas d'activite limonade. Pour ce site, les colonnes et lignes limonade doivent etre masquees/desactivees dans le suivi quotidien.

Regles appliquees :

- ne pas afficher les blocs `Limonade` dans les vues Saisie et Complete ;
- ne pas afficher les champs `CA HT limonade`, `couverts limonade` ni les details midi/soir limonade ;
- neutraliser les anciennes valeurs limonade eventuellement presentes en memoire pour qu'elles ne rentrent pas dans les totaux ;
- les totaux jour CA et couverts doivent donc correspondre a `VAE + CA restaurant` pour le realise, et a `CA restaurant` pour le budget/prevision ;
- lors de l'import historique Excel, ignorer les colonnes limonade pour Thillois.

Cette regle est appliquee au build via `scripts/dashboardThilloisNoLimonadePatch.ts`, apres les patchs de disposition du dashboard.

## Disposition retenue - Realise

La vue complete Realise est structuree en deux blocs principaux :

- CA HT ;
- Couverts.

Bloc CA HT :

- VAE ;
- CA HT restaurant : midi, soir, total ;
- total jour ;
- cumul mois ;
- ecart budget : valeur et pourcentage ;
- ecart VS N-1 : valeur et pourcentage.

Bloc Couverts :

- couverts restaurant : midi, TM midi, soir, TM soir, total, TM total ;
- total jour ;
- cumul mois ;
- ecart budget : valeur et pourcentage ;
- ecart VS N-1 : valeur et pourcentage.

## Disposition retenue - Previsions

La vue complete Previsions reprend la meme logique propre en deux blocs :

- CA HT ;
- Couverts.

Bloc CA HT prevision :

- CA HT restaurant : midi, soir, total ;
- total jour ;
- cumul mois ;
- ecart VS N-1 : valeur et pourcentage.

Bloc Couverts prevision :

- couverts restaurant : midi, TM midi, soir, TM soir, total, TM total ;
- total jour ;
- cumul mois ;
- ecart VS N-1 : valeur et pourcentage.

## Regles de calcul

- CA HT restaurant total = CA midi + CA soir.
- CA HT total jour = VAE + CA restaurant total en realise pour Thillois.
- CA HT total jour prevision = CA restaurant total pour Thillois.
- TM = CA HT / couverts sur la meme zone quand les deux donnees existent.
- Ecart budget CA = total jour realise - total jour budget.
- Pourcentage d'ecart budget CA = ecart budget CA / budget CA.
- Couverts total jour realise = total restaurant pour Thillois.
- Couverts total jour prevision = couverts restaurant total pour Thillois.
- Ecart budget couverts = total couverts realise complet - budget couverts restaurant.

## Limite volontaire

Les colonnes `ECART VS N-1` sont presentes dans la disposition, mais elles ne sont pas encore calculees tant qu'une source N-1 fiable n'est pas branchee.

## Fichiers concernes

- `scripts/dashboardLimonadeSplitPatch.ts` : ancien patch de support limonade, conserve pour compatibilite mais neutralise ensuite pour Thillois.
- `scripts/dashboardRealiseCleanLayoutPatch.ts` : disposition propre Realise et Previsions en vue complete.
- `scripts/dashboardThilloisNoLimonadePatch.ts` : masquage/desactivation limonade pour Hippo Thillois.
- `src/Dashboard.tsx` : composant principal de suivi quotidien.
- `vite.config.ts` : activation des patchs Dashboard.

## Points a verifier

- En vue complete > Realise, les blocs CA HT et Couverts ne doivent plus afficher de colonnes limonade.
- En vue complete > Previsions, les blocs CA HT et Couverts ne doivent plus afficher de colonnes limonade.
- En saisie journaliere, les lignes `Limonade midi` et `Limonade soir` ne doivent plus apparaitre.
- Les colonnes TM restaurant doivent rester visibles dans Realise et Previsions.
- Les totaux jour et ecarts budget doivent se recalculer sans limonade et sans toucher au recap mail.
