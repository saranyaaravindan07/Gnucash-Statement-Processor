export interface Transaction {
  id: string;
  date: string; // ISO or display format
  description: string;
  originalDescription: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  category: string;
  sourceFile: string;
  isEdited: boolean;
  isSelected?: boolean;
}

export interface ProcessingStats {
  totalFiles: number;
  totalTransactions: number;
  totalDebits: number;
  totalCredits: number;
  netAmount: number;
  editedCount: number;
}

export enum ParseStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}