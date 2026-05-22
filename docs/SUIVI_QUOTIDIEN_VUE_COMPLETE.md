# Suivi quotidien - vue complete realise et previsions

## Objectif

Nettoyer la vue complete des onglets Realise et Previsions pour retrouver une disposition lisible, proche du tableau de gestion attendu.

Le changement cible uniquement l'affichage complet des sections Realise et Previsions. Le recap mail valide ne doit pas etre modifie.

## Disposition retenue - Realise

La vue complete Realise est structuree en deux blocs principaux :

- CA HT ;
- Couverts.

Bloc CA HT :

- VAE ;
- CA HT restaurant : midi, soir, total ;
- CA HT limonade : midi, soir, total ;
- total jour ;
- cumul mois ;
- ecart budget : valeur et pourcentage ;
- ecart VS N-1 : valeur et pourcentage.

Bloc Couverts :

- couverts restaurant : midi, soir, total ;
- couverts limonade : midi, soir, total ;
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
- CA HT limonade : total ;
- total jour ;
- cumul mois ;
- ecart VS N-1 : valeur et pourcentage.

Bloc Couverts prevision :

- couverts restaurant : midi, soir, total ;
- couverts limonade : total ;
- total jour ;
- cumul mois ;
- ecart VS N-1 : valeur et pourcentage.

Point volontaire : la prevision limonade garde le format existant en total uniquement, car la saisie previsionnelle actuelle n'a pas encore de detail midi/soir limonade. Ne pas creer de fausses colonnes midi/soir non reliees.

## Regles de calcul

- CA HT restaurant total = CA midi + CA soir.
- CA HT limonade total = CA limonade midi + CA limonade soir quand le detail existe, sinon l'ancienne valeur totale reste exploitable.
- CA HT total jour = VAE + CA restaurant total + CA limonade total en realise.
- CA HT total jour prevision = CA restaurant total + CA limonade total.
- Ecart budget CA = total jour realise - total jour budget.
- Pourcentage d'ecart budget CA = ecart budget CA / budget CA.
- Couverts limonade total = couverts limonade midi + couverts limonade soir quand le detail existe, sinon l'ancienne valeur totale reste exploitable.
- Couverts total jour realise = total restaurant + total limonade.
- Couverts total jour prevision = couverts restaurant total + couverts limonade total.
- Ecart budget couverts = total couverts realise complet - budget couverts restaurant et limonade.

## Limite volontaire

Les colonnes `ECART VS N-1` sont presentes dans la disposition, mais elles ne sont pas encore calculees tant qu'une source N-1 fiable n'est pas branchee.

## Fichiers concernes

- `scripts/dashboardLimonadeSplitPatch.ts` : patch temporaire cible applique a `Dashboard.tsx` au build.
- `scripts/dashboardRealiseCleanLayoutPatch.ts` : disposition propre Realise et Previsions en vue complete.
- `src/Dashboard.tsx` : composant principal de suivi quotidien.
- `vite.config.ts` : activation des patchs Dashboard.

## Points a verifier

- En vue complete > Realise, seuls les blocs CA HT et Couverts doivent apparaitre selon la disposition cible.
- En vue complete > Previsions, la disposition doit etre alignee sur la meme logique propre.
- La saisie limonade midi/soir realise doit alimenter les totaux limonade.
- Les totaux jour et ecarts budget doivent se recalculer sans toucher au recap mail.
