# Sauvegarde Supabase

## Statut

Statut : optimisation segmentee et chargement mensuel a la demande ajoutes.

Validation effectuee avant optimisation :

- sauvegarde depuis le navigateur principal vers Supabase : OK ;
- chargement depuis une navigation privee : OK ;
- saisie depuis la navigation privee vers Supabase : OK ;
- retour navigateur principal avec donnees retrouvees : OK ;
- rafraichissement d'une sous-page corrige : OK.

A revalider apres optimisation segmentee et chargement a la demande :

- ouverture depuis un navigateur deja connu ;
- ouverture depuis navigation privee ;
- modification d'une valeur journaliere ;
- changement de mois et verification du chargement de ce mois ;
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
- En format segmente v2, elle charge le socle global puis uniquement le mois de demarrage.
- Quand l'utilisateur change de mois, le mois demande est charge depuis Supabase seulement si necessaire.
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

## Chargement mensuel a la demande

Depuis le changement suivant, l'application ne reconstruit plus tout l'historique au demarrage quand le format segmente v2 est disponible.

Fonctionnement :

- `fetchCloudAppBootstrap(year, month)` charge le manifeste, les segments communs et le mois courant seulement ;
- `fetchCloudMonth(year, month)` charge un mois specifique quand l'utilisateur y accede ;
- `scripts/dataContextCloudSyncPatch.ts` garde en memoire les mois deja charges pour eviter des lectures repetitives ;
- la sauvegarde conserve la liste des mois deja connus dans le manifeste, afin de ne pas perdre les mois non charges en memoire.

Effet attendu : l'ouverture de l'application reste legere meme apres plusieurs annees d'import, et Supabase n'est sollicite que pour les mois utiles.

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

- `src/services/supabaseAppState.ts` : lecture/ecriture REST Supabase, format segmente v2 et chargement ciblé ;
- `scripts/dataContextCloudSyncPatch.ts` : branche la sauvegarde Supabase dans `DataContext`, charge les mois a la demande et affiche les alertes ;
- `vite.config.ts` : activation du patch ;
- `supabase/APP_STATE_SETUP.sql` : table isolee et regles Supabase ;
- `src/router.tsx` : routeur hash pour eviter les 404 au refresh.

## Limites connues

- Si deux personnes modifient exactement en meme temps depuis deux PC differents, la derniere sauvegarde peut remplacer la precedente.
- Un autre PC deja ouvert ne se met pas automatiquement a jour en direct ; il retrouvera les donnees au rechargement de l'application.
- Le chargement mensuel a la demande reduit fortement le poids d'ouverture, mais certaines pages annuelles peuvent demander plusieurs mois si elles doivent calculer une annee complete.
- La version multi-site fine devra passer par une structure plus stricte avec `site_id` ou des cles par site bien controlees.

## Controle de deploiement

Dernier controle avant optimisation : sauvegarde et rechargement Supabase valides dans les deux sens.

Controle a faire apres deploiement du format segmente et du chargement a la demande : import caisse, import facture, refresh, changement de mois, puis verification Supabase des cles `segments_v2`.