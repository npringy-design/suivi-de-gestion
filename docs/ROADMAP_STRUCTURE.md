# Roadmap structure — post-audit juin 2026

Chaque etape laisse le projet deployable. Vercel vert avant de passer a la suivante.
Une etape terminee : la supprimer de ce fichier et ajouter une ligne dans POINT_AVANCEMENT.md.
Ce fichier est a supprimer quand toutes les etapes sont faites.

Regle documentation : ne documenter que ce qui est en cours ou utile pour comprendre.
Supprimer toute section terminee. Pas de roman — juste l'essentiel.

---

## Etape 6 — Valeurs monetaires en number dans DataContext (en cours)

**Risque : eleve. Proceder par groupe de champs homogenes.**

Strategie validee sur les 4 premiers canaux simples (Sunday, Uber, Deliveroo, ClickCollect) :
- `reel: string` → `reel: number` dans les types
- Parsing dans les updaters dedie (`parseMoneyValue`) au moment du stockage
- `CurrencyInput` accepte `string | number`
- `CanalSaisie` accepte `Record<string, string | number>`
- Les donnees existantes en string restent lisibles (parseMoneyValue est tolerant)

Prochains groupes a migrer (meme pattern) :
- `DayDataNepting.saisie_reel_nepting` et `pourboire_sunday` → number
- `DayDataEspeces.mis_au_coffre` et `pieces` → number
- `DayDataConecs.conecs_reel_nepting` → number
- `DayDataAmexAncv.reel_nepting` → number
- Champs `DayDataAncvPapiers` (`montant_total`, `total_enveloppes_ancv`) → number
- Champs `DayDataSaisieTR.TrEntry.valeur` et `nombre` → number
- Champs `DayDataBilanSynthese` → number
- Champs monetaires de `MonthDataDepensesPetiteCaisse`
- Champs de `DayDataTheorique` (impact plus large : theorique est lu partout)
