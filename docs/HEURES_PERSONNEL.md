# Saisie des heures personnel

## Objectif

Les heures personnel doivent pouvoir etre saisies naturellement par les utilisateurs, puis etre converties en heures decimales pour les calculs de cout horaire et de projection salariale.

## Formats acceptes

Les formats suivants sont acceptes pour une meme valeur :

- `7h30`
- `7:30`
- `7.30`
- `7,30`

Ces exemples sont tous convertis en `7.5` heures pour les calculs.

## Regle de conversion

- Une saisie avec `h` ou `:` est interpretee comme heures + minutes.
- Une saisie avec `.` ou `,` et deux chiffres apres le separateur est interpretee comme heures + minutes quand les minutes sont entre `00` et `59`.
- Une saisie decimale simple reste acceptee : `7.5` et `7,5` valent `7.5` heures.

La logique commune est centralisee dans `parseHourInputToDecimal` dans `src/utils.ts`.

## Import salaires

La page `Configuration Salaires et Charges` permet d'importer un fichier `.xlsx`, `.xls` ou `.csv` sur le mois selectionne.

Colonnes attendues, avec noms souples :

- nom du salarie : `Nom`, `Salarie`, `Collaborateur`, `Employe` ;
- statut ou categorie : `Statut`, `Categorie`, `Poste`, `Niveau`, `Classification` ;
- heures mensuelles : `Heures`, `Heures mensuelles`, `Heures payees` ;
- cout global mensuel : `Cout global`, `Cout total charge`, `Cout mensuel` ;
- ou, si le cout global n'est pas fourni, cout horaire : `Cout horaire`, `Taux horaire`, `Cout heure`.

Les statuts reconnus alimentent les sections existantes :

- cadre ;
- agent de maitrise ;
- niveau I et II ;
- niveau III ;
- apprenti.

L'import remplace les lignes du mois selectionne dans la configuration salaires. Si seul un cout horaire est fourni, le cout global est reconstitue a partir des heures mensuelles afin que le calcul existant conserve sa logique : `cout horaire = cout global avec provision CP / heures`.

Le mois verrouille ne peut pas etre importe.
