# Suivi quotidien - vue Analyse

Statut : premiere refonte ajoutee, a valider visuellement apres redeploiement.

Objectif : transformer la vue `Analyse` de la page `Suivi quotidien` en vraie lecture operationnelle, sans remplacer la vue complete.

Fichiers :

- `src/DashboardAnalysisView.tsx` : composant de la vue Analyse ;
- `scripts/dashboardAnalysisModePatch.ts` : branchement de la vue Analyse dans `Dashboard.tsx` ;
- `vite.config.ts` : activation du patch.

Contenu affiche :

- KPI mois : CA realise, S/C mois, cout cuisine, cout salle ;
- liste S/C par jour du mois, avec total fin de mois ;
- liste CA par jour du mois, avec total fin de mois ;
- tableau journalier : CA, S/C, cout cuisine en euros et %, cout salle en euros et %, ticket moyen restaurant ;
- recap semaine ;
- lecture rapide : meilleur jour S/C, jour le plus lourd, heures cuisine/salle.

Calculs :

- CA total = VAE + midi + soir + limonade, ou total realise deja calcule si present ;
- CA restaurant = midi + soir ;
- ticket moyen restaurant = CA restaurant / couverts restaurant ;
- S/C = cout salarial realise / CA total ;
- cout cuisine et cout salle reconstruits depuis les heures realisees et les taux horaires salaires ;
- taux horaires issus du snapshot salaire via la meme logique que la version complete ;
- affichage en deux decimales pour eviter les arrondis non demandes.

Ligne de conduite :

- ne pas transformer cette vue en version complete bis ;
- garder une lecture compacte et utile pour analyse ;
- la vue complete reste la source detaillee ;
- toute info ajoutee doit aider a piloter : CA, S/C, cuisine/salle, couverts, TM, semaine/mois.
