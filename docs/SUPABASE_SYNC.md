# Sauvegarde Supabase

## Objectif

Centraliser les donnees de l'application pour permettre l'utilisation depuis plusieurs postes.

## Premiere version

La premiere version reste volontairement prudente :

- lecture Supabase au demarrage si la configuration est presente ;
- sauvegarde automatique vers Supabase apres modification ;
- actualisation des autres postes toutes les 10 secondes ;
- conservation du localStorage comme secours si Supabase est absent ou indisponible ;
- pas de dependance npm Supabase ajoutee : l'application utilise l'API REST Supabase directement.

Ce n'est pas encore un realtime instantane par canal permanent. Ce choix limite les risques pendant les premiers tests.

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
- optionnel : `VITE_APP_STATE_KEY`, defaut `gestion:<site>:global_state_v1`.

Sans `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, l'application continue de fonctionner en localStorage uniquement.

## Fichiers concernes

- `src/services/supabaseAppState.ts` : lecture/ecriture REST Supabase ;
- `scripts/dataContextCloudSyncPatch.ts` : branche la synchronisation dans `DataContext` au build ;
- `vite.config.ts` : activation du patch ;
- `supabase/APP_STATE_SETUP.sql` : table et regles Supabase.

## Limites connues

- Le dernier poste qui sauvegarde gagne en cas de modification simultanee sur la meme zone.
- La mise a jour entre postes peut prendre jusqu'a 10 secondes.
- La version multi-site fine devra passer par une structure plus stricte avec `site_id` ou des cles par site bien controlees.
