import { Transaction } from '../types';
import { INITIAL_RULES } from '../constants';

// Declare global PDF.js variable
declare const pdfjsLib: any;

interface TextItem {
  str: string;
  x: number;
  y: number;
}

/**
 * Robust PDF text extraction.
 * Groups text by lines and preserves horizontal order.
 */
export const extractTextFromPDF = async (file: File): Promise<string> => {
  if (typeof pdfjsLib === 'undefined') {
    throw new Error("PDF library not loaded. Please ensure you have an internet connection.");
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Safety check for worker
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const loadingTask = pdfjsLib.getDocument({ 
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      isEvalSupported: false
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const items: TextItem[] = textContent.items.map((item: any) => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5]
      }));

      // Sort items: Top to bottom, then Left to right
      const sorted = items.sort((a, b) => b.y - a.y || a.x - b.x);

      let lastY = -1;
      let pageLines: string[] = [];
      let currentLine: string[] = [];

      for (const item of sorted) {
        if (lastY === -1 || Math.abs(item.y - lastY) < 4) {
          currentLine.push(item.str);
        } else {
          pageLines.push(currentLine.join(' '));
          currentLine = [item.str];
        }
        lastY = item.y;
      }
      if (currentLine.length > 0) pageLines.push(currentLine.join(' '));
      
      fullText += pageLines.join('\n') + '\n';
    }

    return fullText;
  } catch (err: any) {
    console.error("PDF Read Error:", err);
    throw new Error(err.message || "Failed to parse PDF content.");
  }
};

const normalizeDate = (rawDate: string): string => {
  try {
    const clean = rawDate.trim().replace(/[-.\s]+/g, '/');
    const parts = clean.split('/');
    const monthMap: Record<string, string> = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
      'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    
    if (parts.length >= 3) {
      let [day, month, year] = parts;
      if (isNaN(parseInt(month))) {
        const monthKey = month.substring(0, 3).toUpperCase();
        if (monthMap[monthKey]) month = monthMap[monthKey];
      }
      day = day.padStart(2, '0');
      month = month.padStart(2, '0');
      if (year.length === 2) year = '20' + year;
      if (year.length === 4) return `${day}/${month}/${year}`;
    }
    return rawDate;
  } catch (e) { return rawDate; }
};

export const getAutoCategory = (description: string, rules: Record<string, string>): string => {
  const descUpper = description.toUpperCase();
  const sortedKeys = Object.keys(rules).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (descUpper.includes(key.toUpperCase())) return rules[key];
  }
  return "EXPENSE:Expenses:Uncategorized";
};

export const parseTransactions = (text: string, filename: string, rules: Record<string, string>): Transaction[] => {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');
  
  // Date pattern for sliding window: 06 Aug 24, 06-08-2024, etc.
  const dateRegex = /\b\d{1,2}[-/ \s](?:[A-Za-z]{3}|\d{1,2})[-/ \s]\d{2,4}\b/i;
  // SBI Suffixes: C (Credit), D (Debit), M (EMI)
  const suffixRegex = /\b\d+[\d,.]*\s*([CDMT])\b/i;

  let lastKnownDate = "";

  for (let line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.length < 5) continue;

    // 1. Sliding Window Date Detection
    // PDFs often split "06 Aug 24" into ["06", "Aug", "24"]. Joining line handles this.
    const dateMatch = cleanLine.match(dateRegex);
    if (dateMatch) {
      lastKnownDate = normalizeDate(dateMatch[0]);
    }

    // 2. Identify Amount and Type
    const tokens = cleanLine.split(/\s+/);
    let amount = 0;
    let type: 'DEBIT' | 'CREDIT' = 'DEBIT';
    let amountIdx = -1;

    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i].replace(/,/g, '');
      
      // Case: Amount with suffix (e.g. 499.00C)
      const suffixMatch = token.match(/^(\d+\.?\d*)([CDMT])$/i);
      if (suffixMatch) {
        amount = parseFloat(suffixMatch[1]);
        type = suffixMatch[2].toUpperCase() === 'C' ? 'CREDIT' : 'DEBIT';
        amountIdx = i;
        break;
      }

      // Case: Suffix is in NEXT token (e.g. 499.00 C)
      const nextToken = tokens[i+1]?.toUpperCase();
      if (nextToken && ['C', 'D', 'M', 'T'].includes(nextToken)) {
        if (!isNaN(parseFloat(token))) {
          amount = parseFloat(token);
          type = nextToken === 'C' ? 'CREDIT' : 'DEBIT';
          amountIdx = i;
          break;
        }
      }
    }

    // 3. Construct Transaction Row
    if (amount > 0 && lastKnownDate) {
      // Description is text between Date and Amount
      const description = tokens
        .slice(0, amountIdx)
        .join(' ')
        .replace(dateRegex, '') // Remove date if it's in the desc
        .trim();

      if (description.length > 2 && !description.toUpperCase().includes("STATEMENT")) {
        const autoCat = getAutoCategory(description, rules);
        transactions.push({
          id: `${lastKnownDate}-${amount}-${Math.random().toString(36).substr(2, 4)}`,
          date: lastKnownDate,
          description,
          originalDescription: description,
          amount,
          type,
          category: autoCat,
          originalCategory: autoCat,
          sourceFile: filename,
          isEdited: false
        });
      }
    } else if (transactions.length > 0 && cleanLine.length > 10) {
      // Handle multi-line description stitching
      const lastTx = transactions[transactions.length - 1];
      if (!cleanLine.match(dateRegex) && !cleanLine.toUpperCase().includes("PAGE")) {
         lastTx.description = `${lastTx.description} ${cleanLine}`.replace(/\s+/g, ' ').trim();
         lastTx.category = getAutoCategory(lastTx.description, rules);
      }
    }
  }

  return transactions.filter(t => t.amount > 0);
};
