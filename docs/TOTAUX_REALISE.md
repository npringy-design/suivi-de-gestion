# Totaux realises

Regle validee : le ticket moyen restaurant ne prend pas en compte la VAE.

Les lignes total semaine et total mois doivent recalculer les moyennes a partir des totaux CA midi + soir et couverts midi + soir. Elles ne doivent pas additionner les moyennes journalieres ni les cumuls.

Correction du 31/05/2026 : les lignes total semaine et total mois affichent aussi les ecarts au budget CA HT en valeur et en pourcentage. Ces ecarts sont recalcules depuis les totaux de la ligne, et non additionnes depuis les jours.

Correction du 31/05/2026 : les ecarts budget couverts en pourcentage sur les totaux semaine/mois sont recalcules depuis l'ecart en couverts et les couverts budget de la ligne. Exemple : +127 couverts pour 745 budget = environ +17,05 %, pas +97,26 %.
