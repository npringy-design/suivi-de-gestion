/**
 * Types centralisés pour l'application
 */

// ============================================================================
// Composants Dashboard
// ============================================================================

export interface DebouncedInputProps {
  value: string | number;
  onChange: (value: string | number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  dataRow: string;
  dataCol: string;
}

export interface RowDefinition {
  type: string;
  label: string;
  key: string;
  style: string;
}

// ============================================================================
// Composants Salaires
// ============================================================================

export interface EmployeeRow {
  nom: string;
  equipe: string;
  heuresPayees: string;
  coutTotalCharge: string;
}

export interface SimulationRow {
  poste: string;
  heuresHebdo: string;
  heuresMensuels: string;
  nombre: string;
  montant: string;
}

export interface RoleData {
  h: string;
  n: string;
}

export interface DepartmentEquipe {
  cadre: RoleData;
  maitrise: RoleData;
  niv12: RoleData;
  niv3: RoleData;
  apprenti: RoleData;
}

export interface EquipeStructure {
  cuisine: DepartmentEquipe;
  salle: DepartmentEquipe;
}

export interface ConfigSalarieRow {
  [key: string]: string | number;
}

// ============================================================================
// Router et Navigation
// ============================================================================

export interface RouteWrapperProps {
  Component: React.ComponentType<any>;
  backPath: string;
}

// ============================================================================
// Événements
// ============================================================================

export interface KeyboardEvent extends React.KeyboardEvent<HTMLInputElement> {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}

// ============================================================================
// Utilitaires
// ============================================================================

export type NumericValue = string | number | undefined;

export type FormatterFunction = (value: any) => string;

export interface GroupDefinition {
  type: string;
  label: string;
  key: string;
  style: string;
  rows?: GroupDefinition[];
}
