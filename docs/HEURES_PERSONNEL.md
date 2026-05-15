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
