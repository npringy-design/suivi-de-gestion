# Instructions Codex

Avant toute modification :

- Lire le document docs/POINT_AVANCEMENT.md / feuille de route du projet si présent.
- Toujours vérifier que la version utilisée est "5.4 moyen".
- Mode économie strict obligatoire.
- Lire uniquement les fichiers nécessaires.
- Ne jamais faire de diagnostic global sauf demande explicite.
- Ne jamais modifier plus de fichiers que nécessaire.
- Ne jamais lancer build/test complet sauf demande explicite.
- Ne jamais corriger des problèmes annexes non demandés.
- Répondre court : fichiers modifiés + vérification faite.
- Le push direct sur `main` est autorisé pour les corrections terminées demandées par l'utilisateur, en restant ciblé, vérifié et documenté.

# Push et sécurité

- Le commit/push est autorisé.
- Le push direct sur `main` est autorisé quand l'utilisateur demande une correction ou une modification claire.
- Ne pas élargir la tâche avant push.
- Ne modifier que les fichiers nécessaires.
- Si la correction nécessite plus de 3 fichiers, expliquer brièvement pourquoi.

# Confirmations outil

- Minimiser au maximum les demandes de confirmation côté ChatGPT/GitHub.
- Regrouper les modifications dans un seul lot cohérent quand c'est possible.
- Éviter les fichiers de test, temporaires ou intermédiaires sauf nécessité réelle.
- Éviter les commits multiples pour une même correction simple.
- Préférer une lecture ciblée, une modification ciblée, puis un seul push final.
- Si l'outil impose quand même une confirmation plateforme, continuer sans redemander une validation métier supplémentaire dans la discussion.
