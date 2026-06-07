# Etape 6 — monnaie

Date : 07/06/2026

Statut : demarree.

## Lot 1 valide

Commits principaux :

- `0c1ee18` : ajout du helper `src/lib/money.ts`.
- `dfe6e6f` : utilisation du helper dans `src/components/CanalSaisie.tsx`.
- `0dc65ac` : utilisation du helper dans `src/VisuTRPapiers.tsx`.
- `e985856` : utilisation du helper dans `src/AncvPapiers.tsx`.

Vercel : success sur `e985856`.

## Regle appliquee

Ne pas changer les formules metier. Centraliser seulement le parsing, le nettoyage de saisie et le formatage des montants.

## Prochaine suite

Continuer progressivement sur les fichiers avec conversions monetaires locales, en validant Vercel par bloc.
