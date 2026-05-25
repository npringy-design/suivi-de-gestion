# Ecritures comptables

Statut : brouillon conserve apres controle visuel.

## Usage

La page `Ecritures comptables` est la page d'usage courant. Elle permet de choisir une periode, generer les lignes comptables et verifier l'equilibre debit / credit.

La page `Parametrage comptable` reste accessible depuis cette page pour modifier les comptes si besoin. Le raccourci direct de l'accueil a ete retire pour eviter de mettre en avant un reglage rarement utilise.

## Regles actuelles

- CA HT 5,5 / 10 / 20 : comptes 707 au credit.
- TVA 5,5 / 10 / 20 : comptes 445 au credit.
- Total TTC caisse : premiere ligne 531100 au debit.
- Moyens de paiement : comptes 511 au debit.
- 580000 : especes reelles au debit.
- Ecart negatif : 658000 au debit.
- Ecart positif : 758000 au credit.
- Pourboires : 511280 au credit.
- Derniere ligne 531100 : contrepartie du bloc paiements au credit.

## Import caisse vers bilan synthese

L'import caisse alimente aussi le bilan synthese avec les TTC par taux de TVA quand ils sont lus dans la feuille :

- TTC 5,5 % ;
- TTC 10 % ;
- TTC 20 %.

Ces montants servent ensuite a calculer les HT et TVA dans le bilan synthese puis dans les ecritures comptables.

## Points de vigilance

- Conserver les lignes a zero si le modele comptable les attend.
- Ne pas changer le sens debit / credit sans comparer au modele comptable source.
- Les comptes restent a confirmer par le cabinet comptable avant export officiel.