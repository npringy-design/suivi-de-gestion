# Paramétrage comptable

Statut : première base créée, non branchée au contrôle automatique.

## Objectif

La page `Paramétrage comptable` sert à préparer la future vérification des systèmes de caisse sans ajouter un nouvel import.

Les feuilles de caisse journalières alimentent déjà la saisie et la synthèse. Cette page ajoute une couche de correspondance entre :

- les rubriques issues de la caisse ;
- les compagnies ou moyens de paiement ;
- les comptes comptables attendus ;
- les colonnes débit et crédit ;
- les libellés comptables et mots-clés utiles au rapprochement.

## Page créée

Route prévue : `/parametrage-comptable`.

Accès ajouté dans le menu `Outils` de l'accueil sous le libellé `Paramétrage comptable`.

Fichiers concernés :

- page principale : `src/ParametrageComptable.tsx` ;
- branchement route/menu : `scripts/accountingSettingsRoutePatch.ts` ;
- activation du patch : `vite.config.ts`.

## Données configurables

Chaque ligne contient :

- actif / inactif ;
- famille : chiffre d'affaires, TVA, paiement, écart ou ajustement ;
- élément caisse ;
- compagnie ;
- compte débit ;
- compte crédit ;
- libellé comptable ;
- règle métier ;
- tolérance en euros ;
- mots-clés de reconnaissance ;
- notes.

## Décision métier importante

Les colonnes `Débit` et `Crédit` sont séparées dès le départ.

Raison : le futur contrôle caisse devra vérifier l'équilibre comptable d'une journée. Un simple champ `sens` serait trop faible et obligerait ensuite à reconstruire la logique.

Exemples de base :

- moyens de paiement : plutôt en débit, comptes 531xxx ou 511xxx ;
- chiffre d'affaires : plutôt en crédit, comptes 707xxx ;
- TVA collectée : plutôt en crédit, comptes 4457xx ;
- écart négatif : plutôt en débit, compte 658xxx ;
- écart positif : plutôt en crédit, compte 758xxx.

## Sauvegarde actuelle

Pour cette première version, la sauvegarde est locale via `localStorage`, clé `parametrage_comptable_v1`.

Cela permet de construire la table et de tester la structure sans toucher aux données existantes ni à Supabase.

## Limites actuelles

- La page ne génère pas encore d'écritures comptables.
- La page ne contrôle pas encore une journée de caisse.
- Les comptes proposés sont une base de travail à confirmer avec le cabinet comptable.
- La sauvegarde n'est pas encore partagée entre postes ou utilisateurs.

## Prochaine étape logique

Brancher cette table sur les données déjà présentes dans la synthèse caisse pour créer un écran de contrôle journalier :

- total débit ;
- total crédit ;
- écart débit/crédit ;
- statut OK / toléré / à vérifier ;
- détail des lignes générées par jour.

La prochaine étape ne doit pas modifier l'import caisse existant. Elle doit seulement lire les données déjà transcrites dans l'application.
