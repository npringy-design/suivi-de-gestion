import { useState } from 'react';

import type {
  CaisseImportPreview,
  HistoricalBudgetPreview,
  InvoiceImportPreview,
} from '@/features/dashboard/dashboardTypes';

export function useDashboardImportState() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importPreview, setImportPreview] = useState<Array<{ label: string; value: string }>>([]);
  const [caisseImportPreviews, setCaisseImportPreviews] = useState<CaisseImportPreview[]>([]);
  const [invoiceImportStatus, setInvoiceImportStatus] = useState('');
  const [invoiceImportPreviews, setInvoiceImportPreviews] = useState<InvoiceImportPreview[]>([]);
  const [historicalBudgetStatus, setHistoricalBudgetStatus] = useState('');
  const [historicalBudgetPreviews, setHistoricalBudgetPreviews] = useState<HistoricalBudgetPreview[]>([]);
  const [salaryImportStatus, setSalaryImportStatus] = useState('');

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
    salaryImportStatus,
    setSalaryImportStatus,
  };
}
