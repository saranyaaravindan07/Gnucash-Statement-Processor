import { Transaction } from "../types";

export const generateCSV = (transactions: Transaction[]): string => {
  const header = ['Date', 'Description', 'Notes', 'Amount', 'Category', 'Account'];
  
  const rows = transactions.map(t => {
    // GnuCash standard CSV import
    const signedAmount = t.type === 'DEBIT' ? -t.amount : t.amount;
    
    return [
      `"${t.date}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"ID: ${t.id} | Source: ${t.sourceFile}"`, // Improved tracking
      `${signedAmount.toFixed(2)}`,
      `"${t.category}"`,
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
