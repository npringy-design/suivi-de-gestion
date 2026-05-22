# Suivi quotidien - vue complete realise

## Objectif

Nettoyer la vue complete de l'onglet Realise pour retrouver une disposition lisible, proche du tableau de gestion attendu.

Le changement cible uniquement l'affichage complet de la section Realise. Le recap mail valide ne doit pas etre modifie.

## Disposition retenue

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

## Regles de calcul

- CA HT restaurant total = CA midi + CA soir.
- CA HT limonade total = CA limonade midi + CA limonade soir quand le detail existe, sinon l'ancienne valeur totale reste exploitable.
- CA HT total jour = VAE + CA restaurant total + CA limonade total.
- Ecart budget CA = total jour realise - total jour budget.
- Pourcentage d'ecart budget CA = ecart budget CA / budget CA.
- Couverts limonade total = couverts limonade midi + couverts limonade soir quand le detail existe, sinon l'ancienne valeur totale reste exploitable.
- Couverts total jour = total restaurant + total limonade.
- Ecart budget couverts = total couverts realise complet - budget couverts restaurant et limonade.

## Limite volontaire

Les colonnes `ECART VS N-1` sont presentes dans la disposition, mais elles ne sont pas encore calculees tant qu'une source N-1 fiable n'est pas branchee.

## Fichiers concernes

- `scripts/dashboardLimonadeSplitPatch.ts` : patch temporaire cible applique a `Dashboard.tsx` au build.
- `src/Dashboard.tsx` : composant principal de suivi quotidien.
- `vite.config.ts` : activation des patchs Dashboard.

## Points a verifier

- En vue complete > Realise, seuls les blocs CA HT et Couverts doivent apparaitre selon la disposition cible.
- La saisie limonade midi/soir doit alimenter les totaux limonade.
- Les totaux jour et ecarts budget doivent se recalculer sans toucher au recap mail.
