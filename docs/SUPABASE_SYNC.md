# Sauvegarde Supabase

## Objectif

Centraliser les donnees de l'application dans Supabase pour pouvoir les retrouver depuis n'importe quel PC.

Le but n'est pas de faire une synchronisation active multi-PC en temps reel. Supabase sert de sauvegarde centrale et de source de chargement au demarrage de l'application.

## Projet Supabase partage avec Gestion Commandes

Il est possible d'utiliser le meme projet Supabase que Gestion Commandes Doquet pour rester dans les limites du plan gratuit.

Regle obligatoire : Suivi de gestion doit rester isole.

Pour cela, l'application utilise par defaut une table separee :

- `suivi_gestion_app_state`

Elle ne doit pas utiliser la table `app_state` de Gestion Commandes Doquet.

## Comportement retenu

- Au demarrage, l'application lit Supabase si la configuration est presente.
- Si des donnees existent dans Supabase, elles sont chargees dans l'application.
- Apres modification, l'application sauvegarde automatiquement dans Supabase avec un court delai.
- Le localStorage reste conserve comme cache technique local, mais il ne doit pas masquer un probleme Supabase.
- Si Supabase n'est pas configure ou si la sauvegarde echoue, une alerte visible apparait dans l'application.
- Il n'y a pas d'actualisation automatique toutes les 10 secondes.
- Il n'y a pas de realtime permanent pour cette premiere version.

Ce fonctionnement permet d'ouvrir l'application depuis un autre PC et de retrouver les donnees sauvegardees, tout en evitant de croire qu'une donnee est dans le cloud quand Supabase est indisponible.

## Alertes visibles

Une banderole d'alerte apparait si :

- Supabase n'est pas configure dans Vercel ;
- la lecture Supabase au demarrage echoue ;
- une sauvegarde Supabase echoue apres modification.

Quand une sauvegarde Supabase reussit, l'alerte est masquee.

## Donnees sauvegardees

Snapshot global actuel :

- `allData` ;
- `config2025` ;
- `customEvents` ;
- `personnelInfos`.

## Configuration requise

Dans Supabase, executer :

- `supabase/APP_STATE_SETUP.sql`

Dans Vercel, ajouter les variables :

- `VITE_SUPABASE_URL` ;
- `VITE_SUPABASE_ANON_KEY` ;
- optionnel : `VITE_SITE_ID`, defaut `hippo_thillois` ;
- optionnel : `VITE_APP_STATE_TABLE`, defaut `suivi_gestion_app_state` ;
- optionnel : `VITE_APP_STATE_KEY`, defaut `suivi-gestion:<site>:global_state_v1`.

Sans `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, l'application continue de fonctionner en localStorage uniquement, mais une alerte doit rester visible.

## Fichiers concernes

- `src/services/supabaseAppState.ts` : lecture/ecriture REST Supabase ;
- `scripts/dataContextCloudSyncPatch.ts` : branche la sauvegarde Supabase dans `DataContext` au build et affiche les alertes ;
- `vite.config.ts` : activation du patch ;
- `supabase/APP_STATE_SETUP.sql` : table isolee et regles Supabase.

## Limites connues

- Si deux personnes modifient exactement en meme temps depuis deux PC differents, la derniere sauvegarde peut remplacer la precedente.
- Un autre PC deja ouvert ne se met pas automatiquement a jour en direct ; il retrouvera les donnees au rechargement de l'application.
- La version multi-site fine devra passer par une structure plus stricte avec `site_id` ou des cles par site bien controlees.

## Controle de deploiement

Dernier controle : relance d'un build pour publier le correctif d'alerte Supabase en production.
