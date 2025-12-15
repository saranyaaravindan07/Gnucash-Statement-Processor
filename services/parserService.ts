import { Transaction } from '../types';
import { INITIAL_RULES } from '../constants';

// We declare the global variable for PDF.js as it is loaded via CDN in index.html
declare const pdfjsLib: any;

export const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // Join with space to keep lines but not strict breaks
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
};

// Helper to determine category based on rules
export const getAutoCategory = (description: string, rules: Record<string, string> = INITIAL_RULES): string => {
  const descUpper = description.toUpperCase();
  
  // 1. Check for exact match first (prioritize user specific overrides)
  if (rules[description]) return rules[description];
  
  // 2. Check for keyword inclusion (case insensitive)
  for (const [key, category] of Object.entries(rules)) {
    if (descUpper.includes(key.toUpperCase())) return category;
  }
  
  return "Expenses:Uncategorized";
};

export const parseTransactions = (text: string, filename: string, rules: Record<string, string>): Transaction[] => {
  const transactions: Transaction[] = [];
  
  // Pattern 1: DD Mon YY Description Amount Type
  const pattern1 = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2})\s+([A-Z0-9\s,./*-]{5,80}?)\s+([\d,]+\.?\d{0,2})\s+(DR|D|CR|C)/gi;
  
  // Pattern 2: DD-MM-YYYY Description Amount
  const pattern2 = /(\d{2}-\d{2}-\d{4})\s+.*?([A-Z0-9\s/.-]{5,80})\s+([\d,]+\.?\d{0,2})(?:\s+(DR|CR))?/gi;
  
  // Pattern 3: DD/MM/YYYY Description Amount
  const pattern3 = /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+([A-Z0-9\s*.,/-]{5,80})\s+([\d,]+\.?\d{0,2})(?:\s+(DR|CR))?/gi;

  const patterns = [pattern1, pattern2, pattern3];
  const uniqueKeys = new Set<string>();

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      try {
        let date = match[1];
        let desc = match[2].trim();
        let amountStr = match[3];
        let typeStr = match[4]; 

        const amount = parseFloat(amountStr.replace(/,/g, ''));
        
        let type: 'DEBIT' | 'CREDIT' = 'DEBIT';
        if (typeStr) {
            if (typeStr.match(/CR|C/i)) type = 'CREDIT';
        }

        const id = `${date}-${amount}-${desc.substring(0, 10)}`;
        
        if (!uniqueKeys.has(id)) {
            uniqueKeys.add(id);
            transactions.push({
                id: Math.random().toString(36).substr(2, 9),
                date,
                description: desc,
                originalDescription: desc,
                amount,
                type,
                category: getAutoCategory(desc, rules),
                sourceFile: filename,
                isEdited: false
            });
        }
      } catch (e) {
        console.error("Skipping malformed row", e);
      }
    }
  });

  return transactions;
};