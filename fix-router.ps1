# Script pour corriger automatiquement les composants React Router
$files = @(
    'BudgetEdgAnnuel.tsx',
    'VsBudget.tsx',
    'VsN1.tsx',
    'RealiseEdgAnneeFiscale.tsx',
    'FactureDevis.tsx',
    'ConfigSalaires.tsx',
    'CalculetteSalaires.tsx',
    'ConfigurationChiffre2025.tsx',
    'VisuelVacances.tsx',
    'EdgAnnuelTabs.tsx'
)

foreach ($file in $files) {
    $path = "src/pages/$file"
    Write-Host "Processing $file..."

    # Lire le contenu
    $content = Get-Content $path -Raw

    # 1. Ajouter import useNavigate si pas déjà présent
    if ($content -notmatch "import.*useNavigate") {
        $content = $content -replace "(import React.*from 'react';)", "`$1`nimport { useNavigate } from 'react-router-dom';"
    }

    # 2. Modifier l'interface pour supprimer onBack
    $content = $content -replace "interface \w+Props \{\s*onBack: \(\) => void;\s*([^\}]*)\}", "interface `$1Props {`$2}"

    # 3. Modifier la signature de fonction
    $content = $content -replace "export default function (\w+)\(\{ onBack[^}]*\}\)", "export default function `$1() {`n  const navigate = useNavigate();"

    # 4. Remplacer onClick={onBack}
    $content = $content -replace "onClick=\{onBack\}", "onClick={() => navigate('/')}"

    # Écrire le contenu modifié
    Set-Content $path $content
}

Write-Host "Done processing all files."