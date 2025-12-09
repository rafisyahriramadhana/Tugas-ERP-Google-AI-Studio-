export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  reorderPoint: number;
  sku: string;
  unit: string; // Unit of Measurement (e.g., Pcs, Kg, Box)
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Transaction {
  id: string;
  date: string; // ISO string
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'CASH' | 'QRIS' | 'DEBIT';
}

export interface FinancialSummary {
  revenue: number;
  cogs: number; // Cost of Goods Sold
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  POS = 'POS',
  INVENTORY = 'INVENTORY',
  AI_ANALYST = 'AI_ANALYST',
  DATA_MANAGEMENT = 'DATA_MANAGEMENT'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// Data Import Types
export interface StagedTransaction {
  id: string;
  source: 'CSV_IMPORT' | 'AI_OCR';
  date: string;
  supplierOrCustomer: string;
  totalAmount: number;
  itemsSummary: string;
  status: 'PENDING' | 'VALID' | 'ERROR';
  validationError?: string; // Reason for ERROR status
  rawParams: any; // To hold the data needed to construct the actual Transaction object upon commit
}