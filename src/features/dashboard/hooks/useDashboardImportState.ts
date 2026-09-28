import { useState } from 'react';

import type {
  CaisseImportPreview,
  HistoricalBudgetPreview,
  InvoiceImportPreview,
} from '@/features/dashboard/dashboardTypes';
import type { SalaryImportPreview } from '@/types/dataTypes';

export function useDashboardImportState() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importPreview, setImportPreview] = useState<Array<{ label: string; value: string }>>([]);
  const [caisseImportPreviews, setCaisseImportPreviews] = useState<CaisseImportPreview[]>([]);
  const [invoiceImportStatus, setInvoiceImportStatus] = useState('');
  const [invoiceImportPreviews, setInvoiceImportPreviews] = useState<InvoiceImportPreview[]>([]);
  const [historicalBudgetStatus, setHistoricalBudgetStatus] = useState('');
  const [historicalBudgetPreviews, setHistoricalBudgetPreviews] = useState<HistoricalBudgetPreview[]>([]);
  const [historicalV25Status, setHistoricalV25Status] = useState('');
  const [historicalV25Previews, setHistoricalV25Previews] = useState<HistoricalBudgetPreview[]>([]);
  const [salaryImportStatus, setSalaryImportStatus] = useState('');
  const [salaryImportPreviews, setSalaryImportPreviews] = useState<SalaryImportPreview[]>([]);

  const resetDashboardImportState = () => {
    setInvoiceImportPreviews([]);
    setInvoiceImportStatus('');
    setSalaryImportStatus('');
    setSalaryImportPreviews([]);
    setCaisseImportPreviews([]);
  };

  return {
    isImportModalOpen,
    setIsImportModalOpen,
    importStatus,
    setImportStatus,
    importPreview,
    setImportPreview,
    caisseImportPreviews,
    setCaisseImportPreviews,
    invoiceImportStatus,
    setInvoiceImportStatus,
    invoiceImportPreviews,
    setInvoiceImportPreviews,
    historicalBudgetStatus,
    setHistoricalBudgetStatus,
    historicalBudgetPreviews,
    setHistoricalBudgetPreviews,
    historicalV25Status,
    setHistoricalV25Status,
    historicalV25Previews,
    setHistoricalV25Previews,
    salaryImportStatus,
    setSalaryImportStatus,
    salaryImportPreviews,
    setSalaryImportPreviews,
    resetDashboardImportState,
  };
}
