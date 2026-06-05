import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const dashboardPath = path.join(rootDir, 'src', 'Dashboard.tsx');
const isCheckMode = process.argv.includes('--check');

const extractedImports = `// ── Modèle Dashboard extrait (types, colonnes, configuration statique) ────────
import type {
  CaisseImportPreview,
  DashboardColumn,
  DashboardRow,
  InvoiceImportPreview,
  ParsedCaisseImport,
  VisibleDashboardColumn,
} from '@/features/dashboard/dashboardTypes';
import { dashboardColumns as C } from '@/features/dashboard/dashboardColumns';
import {
  contextColumns,
  dailyPersonnelRows,
  dailyPersonnelTotals,
  days,
  editableCols,
  monthNames,
  tabs,
  viewModes,
} from '@/features/dashboard/dashboardStaticConfig';
import type { TableViewMode } from '@/features/dashboard/dashboardStaticConfig';
`;

const startMarker = '// ── Constantes Dashboard inline (dashboardConstants.ts intégré) ─────────────';
const endMarker = '// ─────────────────────────────────────────────────────────────────────────────';

const readDashboard = (): string => {
  if (!fs.existsSync(dashboardPath)) {
    throw new Error(`Fichier introuvable: ${dashboardPath}`);
  }
  return fs.readFileSync(dashboardPath, 'utf8');
};

const migrateDashboard = (source: string): string => {
  if (source.includes("from '@/features/dashboard/dashboardTypes'")) {
    return source;
  }

  const start = source.indexOf(startMarker);
  if (start === -1) {
    throw new Error(`Marqueur de début introuvable: ${startMarker}`);
  }

  const end = source.indexOf(endMarker, start);
  if (end === -1) {
    throw new Error(`Marqueur de fin introuvable après le bloc Dashboard inline: ${endMarker}`);
  }

  return `${source.slice(0, start)}${extractedImports}${source.slice(end)}`;
};

const main = () => {
  const source = readDashboard();
  const migrated = migrateDashboard(source);

  if (migrated === source) {
    console.log('Dashboard.tsx est déjà branché sur les modules extraits.');
    return;
  }

  if (isCheckMode) {
    console.log('Dashboard.tsx doit encore être branché sur les modules extraits.');
    process.exitCode = 1;
    return;
  }

  fs.writeFileSync(dashboardPath, migrated, 'utf8');
  console.log('Dashboard.tsx branché sur les modules extraits : types, colonnes et configuration statique.');
};

main();
