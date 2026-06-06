export type DashboardColumn = [string, string, string, string];

export type VisibleDashboardColumn = DashboardColumn & {
  originalIndex: number;
};

export type DashboardRow = {
  type: 'day' | 'total' | 'month_total' | 'fg_box4_total';
  label: string;
  isWeekend?: boolean;
  isSchoolHoliday?: boolean;
  isPublicHoliday?: boolean;
  isCustomEvent?: boolean;
  dateObj?: Date;
  dayIndex?: number;
  weekIndex?: number;
};

export type InvoiceImportPreview = {
  id: string;
  fileName: string;
  supplier: string;
  amountHt: string;
  invoiceDate: string;
  targetCol: number;
  status: string;
  confidence: 'verified' | 'review';
};

export type ParsedCaisseImport = {
  pdfDay: number | null;
  pdfMonth: number | null;
  pdfYear: number | null;
  values: Record<number, number>;
  theoriqueValues: {
    total_ca: number;
    cb: number;
    amex: number;
    tr_papier: number;
    tr_carte: number;
    ancv: number;
    especes: number;
    click_collect: number;
    uber: number;
    deliveroo: number;
    sunday: number;
  };
  realValues: {
    cb: number;
    pourboires: number;
    especes: number;
    pieces: number;
    amexAncvCarte: number;
    trCarte: number;
    ancvPapier: number;
    trPapier: number;
    sunday: number;
    uber: number;
    deliveroo: number;
    clickCollect: number;
  };
};

export type CaisseImportPreview = {
  id: string;
  fileName: string;
  businessDate: string;
  confidence: 'verified' | 'review';
  status: string;
  parsed: ParsedCaisseImport;
};

export type HistoricalBudgetPreview = {
  id: string;
  sheetName: string;
  month: number;
  day: number;
  rowIndex: number;
  caMidi: number;
  caSoir: number;
  caTotal: number;
  couvertsMidi: number;
  tmMidi: number;
  couvertsSoir: number;
  tmSoir: number;
  couvertsTotal: number;
  realiseVae: number;
  realiseMidi: number;
  realiseSoir: number;
  realiseLimo: number;
  realiseCouvertsMidi: number;
  realiseCouvertsSoir: number;
  realiseCouvertsLimo: number;
  costMatterValues: Record<number, number>;
  costMatterTotal: number;
  payrollValues: Record<number, string>;
  payrollTotalHours: number;
  status: string;
};
