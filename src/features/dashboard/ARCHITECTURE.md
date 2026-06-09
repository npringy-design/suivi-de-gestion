# Dashboard — règle d'architecture

Dashboard.tsx est l'orchestrateur. Il ne doit contenir que :
- Les imports et la déclaration du composant
- L'appel aux hooks (useDashboard*State, useDashboard*Handlers)
- Les useMemo d'assemblage appelant des fonctions de dashboardCalculations.ts
- Le JSX de haut niveau (layout, sidebar, header, table) via sous-composants

Toute nouvelle logique métier → dashboardCalculations.ts ou nouveau hook
Toute nouvelle colonne ou groupe → dashboardColumns.ts ou dashboardStaticConfig.ts
Tout nouveau bloc JSX > 50 lignes → nouveau composant dans components/

Objectif taille Dashboard.tsx : < 400 lignes.
