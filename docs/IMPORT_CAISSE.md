# Import des feuilles de caisse

Note : l'import caisse accepte maintenant plusieurs feuilles avec validation unitaire avant application.

Ce document fixe les règles de fonctionnement pour l'import des feuilles de caisse dans la saisie journalière.

## Objectif

L'import caisse sert uniquement à lire une feuille de caisse et à reporter automatiquement les montants utiles dans les bons champs de gestion.

La feuille importée n'est pas une pièce jointe de l'application. Elle reste un document source externe.

## Règles de sauvegarde

- Le fichier PDF importé ne doit pas être sauvegardé dans l'application.
- Le texte complet extrait du PDF ne doit pas être sauvegardé.
- Les montants transcrits dans les champs métier sont sauvegardés comme des données de gestion normales.
- Un snapshot d'audit léger peut être sauvegardé pour garder la trace de la lecture.
- Le snapshot doit rester limité aux informations utiles : date, nom du fichier, date d'import, montants lus et champs remplis.
- Un seul snapshot caisse doit exister par jour et par établissement, sauf décision explicite de conserver un court historique.

## Ce que l'import peut modifier

L'import caisse peut remplir ou remplacer les champs automatiques liés à la feuille de caisse :

- réalisé de la saisie journalière ;
- théorique des éléments de caisse ;
- indicateurs directement calculés depuis la feuille de caisse.

L'import ne doit pas modifier les champs saisis manuellement par l'utilisateur :

- réel caisse ;
- commentaires ;
- justificatifs d'écart ;
- corrections manuelles ;
- détails saisis à la main pour les titres restaurant ou ANCV papier.

## Réimport d'une même journée

Si une feuille est réimportée pour une journée qui possède déjà un snapshot caisse :

1. l'application peut remplacer les valeurs automatiques issues de l'import ;
2. le snapshot du jour est remplacé par le nouveau snapshot ;
3. les saisies réelles et commentaires manuels ne sont pas touchés ;
4. l'utilisateur doit comprendre qu'il remplace la lecture automatique du jour.

## Modèles lus

### Modèle historique

Le modèle déjà en place reste pris en charge.

### Modèle Récap période Au Bureau

Détection : présence de `Récap période` et `CA / PERIODE JOURNEE`.

Mapping réalisé :

- `REPRISE ACOMPTES 428` -> VAE ;
- `COUVERT MIDI 438` -> CA midi et couverts midi ;
- `COUVERT SOIR 440` -> CA soir et couverts soir ;
- `PAX MIDI 444` -> part limonade midi ;
- `PAX SOIR 446` -> part limonade soir ;
- `PAX MIDI 444` + `PAX SOIR 446` -> CA limonade et couverts limonade ;
- les lignes `LIMO & WEB` ne sont plus utilisées pour le réalisé, car elles ne correspondent pas au mapping demandé.

Mapping caisse / théorique :

- `REGLEMENTS -> Total` -> total encaissements TTC ;
- `ESPECES` -> espèces ;
- `ANCV` -> ANCV papier ;
- `TR EDENRED` -> TR carte ;
- `SUNDAY` + `TPE SUNDAY` -> Sunday ;
- `UBEREATS WEB` -> Uber.

## Snapshot d'audit

Le snapshot d'audit sert à relire ce qui a été extrait sans conserver le PDF.

Exemple de structure attendue :

```ts
type CaisseImportSnapshot = {
  businessDate: string;
  importedAt: string;
  fileName: string;
  sourceHash?: string;
  values: {
    caMidiHt?: string;
    caSoirHt?: string;
    vaeHt?: string;
    couvertsMidi?: string;
    couvertsSoir?: string;
    cb?: string;
    especes?: string;
    amex?: string;
    trCarte?: string;
    trPapier?: string;
    ancv?: string;
    sunday?: string;
    uber?: string;
    deliveroo?: string;
    clickCollect?: string;
  };
  appliedFields: Array<{
    target: string;
    value: string;
  }>;
};
```

Le snapshot ne doit pas contenir :

- le PDF ;
- une image du PDF ;
- le texte complet extrait ;
- des données inutiles à la vérification métier.

## Ligne de conduite technique

- Garder la lecture PDF séparée de l'application des valeurs.
- Garder le mapping des champs explicite et facile à relire.
- Ne jamais mélanger valeurs automatiques et valeurs réelles manuelles.
- Préférer une structure typée plutôt que des clés libres dispersées.
- Si une règle métier change, mettre à jour ce document dans le même changement de code.
- Après modification de l'import, exécuter au minimum `npm.cmd run lint:ts` et `npm.cmd run build`.

## Décision actuelle

Pour le suivi quotidien, la règle retenue est :

- lecture du PDF à la demande ;
- transcription immédiate des montants utiles ;
- sauvegarde des montants dans les données métier ;
- absence de sauvegarde du fichier importé ;
- conservation possible d'un snapshot léger pour audit et relecture.
