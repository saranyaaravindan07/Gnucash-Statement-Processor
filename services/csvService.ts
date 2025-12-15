import { Transaction } from "../types";

export const generateCSV = (transactions: Transaction[]): string => {
  const header = ['Date', 'Description', 'Notes', 'Amount', 'Category', 'Account'];
  
  const rows = transactions.map(t => {
    // GnuCash typically likes: Date, Description, Deposit, Withdrawal, etc.
    // Or a simple import format: Date, Description, Amount (neg/pos)
    
    // We will use a flexible format:
    // Date, Description, Notes, Amount (with sign), Category (Target Account)
    
    const signedAmount = t.type === 'DEBIT' ? -t.amount : t.amount;
    
    return [
      `"${t.date}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"Source: ${t.sourceFile}"`,
      `${signedAmount.toFixed(2)}`,
      `"${t.category}"`,
      // Base account is usually determined during import in GnuCash, 
      // but we can leave it empty or user maps it.
      "" 
    ].join(',');
  });

  return [header.join(','), ...rows].join('\n');
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};