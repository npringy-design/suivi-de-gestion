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

## Referentiel personnel

La page `Info personnel` sert a faire le lien entre le nom lu dans un PDF de paie et la colonne du suivi quotidien.

Chaque ligne contient :

- nom attendu dans le PDF ;
- statut : cadre, agent de maitrise, niveau I et II, niveau III, apprenti ;
- section : salle ou cuisine ;
- alias eventuels pour les variantes de nom.

Exemple : `Pringy Nicolas | Cadre | Salle`.

## Import PDF salaires

L'import se fait depuis la page `Suivi quotidien`, dans la fenetre `Importer`, avec un fichier PDF salaires.

Mecanique :

- le PDF est lu localement, sans conservation du fichier ;
- les noms sont compares au referentiel `Info personnel` ;
- pour chaque salarie retrouve, l'import cherche les heures et le cout global sur la ligne ou autour de son nom ;
- le taux horaire est calcule avec la logique existante : `cout global * 1,10 / heures` ;
- les taux sont regroupes par statut et section ;
- si plusieurs salaries correspondent a la meme colonne, une moyenne est appliquee ;
- les taux du mois sont mis a jour dans le suivi quotidien pour les colonnes cuisine/salle concernees.

Le mois verrouille dans la configuration salaires ne peut pas etre remplace par l'import PDF.
