import { useState } from 'react';

import type { TableViewMode } from '@/features/dashboard/dashboardStaticConfig';

export type DashboardDragState = {
  rIdx: number;
  cIdx: number;
  endRow: number;
  value: string;
};

export function useDashboardUiState() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('PREVISIONS');
  const [tableViewMode, setTableViewMode] = useState<TableViewMode>('SAISIE');
  const [dragState, setDragState] = useState<DashboardDragState | null>(null);

  return {
    isSidebarOpen,
    setIsSidebarOpen,
    isDatePickerOpen,
    setIsDatePickerOpen,
    focusedCell,
    setFocusedCell,
    activeTab,
    setActiveTab,
    tableViewMode,
    setTableViewMode,
    dragState,
    setDragState,
  };
}
