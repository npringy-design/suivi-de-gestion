# Point d'avancement global

Ce document sert de porte d'entree pour reprendre le projet sans perdre le fil. Chaque partie validee doit avoir une trace courte ici et une documentation detaillee dans `docs/`.

## Regle de travail

- Quand une fonctionnalite est validee, ajouter ou mettre a jour sa documentation dans `docs/`.
- Garder une trace de la mecanique employee : objectif, donnees lues, donnees modifiees, limites et ligne de conduite.
- Toujours noter clairement ce qui est valide, ce qui reste provisoire et ce qui est encore en cours.
- Pour chaque nouvelle partie fonctionnelle, creer un document associe dans `docs/`.
- Si un document existe deja pour la partie modifiee, le mettre a jour dans le meme changement de code.
- Ne pas modifier une partie deja validee sans demande explicite.
- Quand une modification est terminee et verifiee, pousser directement les changements effectues sans redemander une validation supplementaire, sauf si l'utilisateur demande explicitement de ne pas pousser.
- Avant livraison d'un changement code, verifier au minimum `npm.cmd run lint:ts` et `npm.cmd run build`.

## Suivi quotidien - import caisse

Statut : valide.

Ce qui est en place :

- import d'une feuille de caisse PDF depuis la saisie journaliere ;
- lecture du PDF et transcription des montants utiles au bon endroit ;
- pas de sauvegarde du fichier importe ;
- principe retenu d'un snapshot d'audit leger plutot qu'une conservation du PDF ;
- separation entre les valeurs automatiques issues de l'import et les champs reels saisis manuellement.

Ou regarder :

- documentation : `docs/IMPORT_CAISSE.md`
- logique principale : `src/Dashboard.tsx`
- donnees metier : `src/contexts/DataContext.tsx`

Point important :

- l'import caisse peut remplacer les valeurs automatiques d'une journee, mais ne doit pas toucher aux commentaires, corrections ou saisies reelles manuelles.

## Suivi quotidien - import factures fournisseurs

Statut : valide dans son principe actuel, avec IA desactivee.

Ce qui est en place :

- import possible de plusieurs factures en une fois ;
- lecture locale du PDF, sans sauvegarde du fichier ;
- extraction visee de trois informations : fournisseur, date facture, montant HT ;
- affichage en lignes dans une vue large, plus lisible qu'un petit cadrage vertical ;
- validation facture par facture ;
- statut vert seulement si la lecture est jugee complete et fiable ;
- statut orange si un humain doit verifier ou completer ;
- correction manuelle possible avant validation : fournisseur, date, montant HT et colonne cible ;
- ecriture du montant sur la date de facture, meme si cette date est dans un autre mois ;
- ajout du montant dans la colonne fournisseur cible, sans ecraser silencieusement une saisie existante ;
- lecture IA Gemini desactivee, car les tests reels n'etaient pas assez fiables et pouvaient generer un cout inutile.

Ou regarder :

- documentation : `docs/IMPORT_FACTURES.md`
- logique principale : `src/Dashboard.tsx`
- endpoint IA volontairement desactive : `api/invoice-vision.js`

Point important :

- ne pas ajouter des exceptions fournisseur par fournisseur. La logique doit rester generique et s'appuyer sur les fournisseurs configures dans les colonnes achats.

## Suivi quotidien - recap mail du jour

Statut : valide. Ne pas toucher pour le moment.

Ce qui est en place :

- bouton `Recap mail` dans la saisie journaliere ;
- ouverture d'une page de verification avant mail ;
- saisie manuelle du responsable midi, responsable soir, commentaire midi, commentaire soir et notes Google ;
- sections separees : Midi, Soir, Journee ;
- chiffres realises separes des ecarts vs budget ;
- comparaison budget avec montants et pourcentages pour CA, couverts et ticket moyen ;
- affichage vert pour les ecarts positifs, rouge pour les ecarts negatifs ;
- masquage des elements a zero, comme VAE ou limonade si non concernes ;
- generation d'une image PNG propre pour conserver la mise en forme dans Outlook ;
- Outlook s'ouvre avec le sujet pre-rempli, le corps reste vide pour coller directement l'image.

Ou regarder :

- documentation : `docs/RECAP_MAIL_JOUR.md`
- logique principale : `src/Dashboard.tsx`

Point important :

- le rendu actuel cote application et cote mail a ete valide. Ne pas modifier la mise en forme du recap mail sans nouvelle demande.

## Suivi quotidien - RAZ locale provisoire

Statut : provisoire, utile pour les tests.

Ce qui est en place :

- bouton RAZ visible sur la page suivi quotidien ;
- confirmation navigateur avant suppression ;
- suppression des donnees locales de test pour repartir proprement ;
- nettoyage des anciens formats locaux et des noms fournisseurs modifies localement.

Ou regarder :

- documentation : `docs/RAZ_LOCALE_PROVISOIRE.md`
- logique principale : `src/Dashboard.tsx`

Point important :

- ce bouton est temporaire. Il devra etre retire ou transforme en action admin encadree avant usage normal.

## Personnel - heures, salaires et cout horaire

Statut : en cours, import salaires ajoute.

Ce qui est en place :

- conversion commune des heures saisies en heures decimales ;
- formats acceptes : `7h30`, `7:30`, `7.30`, `7,30` ;
- ces formats sont convertis en `7.5` pour les calculs ;
- les decimaux simples restent acceptes : `7.5`, `7,5` ;
- la configuration des salaires utilise cette conversion pour calculer les couts horaires ;
- la calculette salaires utilise cette conversion pour totaliser les heures ;
- import Excel/CSV possible dans la configuration salaires pour remplir les noms, statuts, heures et couts globaux ;
- l'import accepte aussi un cout horaire si le cout global n'est pas fourni, puis reconstitue le cout global necessaire au calcul existant ;
- les statuts reconnus alimentent les sections cadre, maitrise, niveau I et II, niveau III et apprenti ;
- le suivi quotidien utilise la meme conversion d'heures pour les calculs de frais de personnel projection et realise.

Ou regarder :

- documentation : `docs/HEURES_PERSONNEL.md`
- fonction commune : `src/utils.ts`, fonction `parseHourInputToDecimal`
- import salaires : `src/salaryImport.ts`
- configuration salaires : `src/ConfigSalaires.tsx`
- calculette salaires : `src/CalculetteSalaires.tsx`
- tests : `src/test/utils.test.ts`, `src/test/salaryImport.test.ts`

Point important :

- l'affichage peut garder la saisie utilisateur, mais les calculs doivent toujours passer par la conversion commune.

## Dernieres verifications connues

Verifications effectuees apres la mise en place de la conversion des heures :

- `npm.cmd run test -- --run src/test/utils.test.ts` : OK
- `npm.cmd run lint` : OK, avec warnings existants du projet
- `npm.cmd run lint:ts` : OK
- `npm.cmd run build` : OK

## Phrase de reprise pour un nouveau clavardage

Lire d'abord `docs/POINT_AVANCEMENT.md`, puis les docs detaillees dans `docs/`. Le recap mail est valide et ne doit pas etre modifie pour le moment. La suite du travail est sur la partie personnel, salaires, heures et cout horaire.
