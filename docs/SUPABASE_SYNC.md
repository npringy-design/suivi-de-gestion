# Sauvegarde Supabase

## Statut

Statut : valide, avec optimisation segmentee ajoutee.

Validation effectuee avant optimisation :

- sauvegarde depuis le navigateur principal vers Supabase : OK ;
- chargement depuis une navigation privee : OK ;
- saisie depuis la navigation privee vers Supabase : OK ;
- retour navigateur principal avec donnees retrouvees : OK ;
- rafraichissement d'une sous-page corrige : OK.

A revalider apres optimisation segmentee :

- ouverture depuis un navigateur deja connu ;
- ouverture depuis navigation privee ;
- modification d'une valeur journaliere ;
- import caisse puis refresh ;
- import facture puis refresh ;
- verification que plusieurs lignes `segments_v2` apparaissent dans `suivi_gestion_app_state`.

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

## Optimisation segmentee v2

Probleme identifie : une feuille de caisse par jour, 80 a 100 factures par mois et plusieurs annees d'historique peuvent rendre un snapshot global unique trop lourd.

Decision : la sauvegarde Supabase ne doit plus reecrire tout l'historique a chaque petite modification.

Depuis le changement du 27/05/2026, `src/services/supabaseAppState.ts` sauvegarde l'etat en segments :

- un manifeste : `...:segments_v2:manifest` ;
- un segment par mois : `...:segments_v2:allData:<annee>:<mois>` ;
- un segment `config2025` ;
- un segment `customEvents` ;
- un segment `personnelInfos`.

Avantage : modifier ou importer une donnee sur un mois ne force plus la reecriture complete de plusieurs annees de donnees.

Compatibilite :

- l'application tente d'abord de lire le format segmente v2 ;
- si aucun manifeste v2 n'existe, elle relit encore l'ancien snapshot global `global_state_v1` ;
- les prochaines sauvegardes recreent automatiquement les segments v2.

Important : les fichiers importes et les textes complets extraits ne doivent toujours pas etre sauvegardes dans ces segments. Seules les donnees metier validees sont conservees.

## Alertes visibles

Une banderole d'alerte apparait si :

- Supabase n'est pas configure dans Vercel ;
- la lecture Supabase au demarrage echoue ;
- une sauvegarde Supabase echoue apres modification.

Quand une sauvegarde Supabase reussit, l'alerte est masquee.

## Donnees sauvegardees

Format actuel : segments v2.

Segments sauvegardes :

- `allData` par annee et par mois ;
- `config2025` ;
- `customEvents` ;
- `personnelInfos`.

Ancien format encore relisible :

- `allData` ;
- `config2025` ;
- `customEvents` ;
- `personnelInfos` dans un snapshot global unique.

## Configuration requise

Dans Supabase, executer :

- `supabase/APP_STATE_SETUP.sql`

Dans Vercel, ajouter les variables :

- `VITE_SUPABASE_URL` ;
- `VITE_SUPABASE_ANON_KEY` ;
- optionnel : `VITE_SITE_ID`, defaut `hippo_thillois` ;
- optionnel : `VITE_APP_STATE_TABLE`, defaut `suivi_gestion_app_state` ;
- optionnel : `VITE_APP_STATE_KEY`, defaut `suivi-gestion:<site>:global_state_v1`.

La variable `VITE_SUPABASE_ANON_KEY` peut recevoir la nouvelle cle `publishable` Supabase ou l'ancienne cle `anon` JWT.

Sans `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, l'application continue de fonctionner en localStorage uniquement, mais une alerte doit rester visible.

## Routage

Le routeur utilise maintenant un mode avec `#` dans l'URL pour eviter les erreurs 404 au rafraichissement d'une sous-page.

Exemples :

- `/#/synthese/4` ;
- `/#/especes/4`.

## Fichiers concernes

- `src/services/supabaseAppState.ts` : lecture/ecriture REST Supabase, avec format segmente v2 ;
- `scripts/dataContextCloudSyncPatch.ts` : branche la sauvegarde Supabase dans `DataContext` au build et affiche les alertes ;
- `vite.config.ts` : activation du patch ;
- `supabase/APP_STATE_SETUP.sql` : table isolee et regles Supabase ;
- `src/router.tsx` : routeur hash pour eviter les 404 au refresh.

## Limites connues

- Si deux personnes modifient exactement en meme temps depuis deux PC differents, la derniere sauvegarde peut remplacer la precedente.
- Un autre PC deja ouvert ne se met pas automatiquement a jour en direct ; il retrouvera les donnees au rechargement de l'application.
- Le format segmente reduit la taille des ecritures, mais le chargement initial reconstruit encore l'etat complet connu. Une evolution future pourra charger uniquement l'annee ou le mois ouvert si le volume devient encore plus important.
- La version multi-site fine devra passer par une structure plus stricte avec `site_id` ou des cles par site bien controlees.

## Controle de deploiement

Dernier controle avant optimisation : sauvegarde et rechargement Supabase valides dans les deux sens.

Controle a faire apres deploiement du format segmente : import caisse, import facture, refresh, puis verification Supabase des cles `segments_v2`.