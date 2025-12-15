import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Transaction, ProcessingStats, ParseStatus } from './types';
import { extractTextFromPDF, parseTransactions, getAutoCategory } from './services/parserService';
import { generateCSV, downloadCSV } from './services/csvService';
import { INITIAL_RULES } from './constants';
import StatsSidebar from './components/StatsSidebar';
import TransactionRow from './components/TransactionRow';
import { UploadCloud, Download, FileText, Search, Trash2, BrainCircuit } from 'lucide-react';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [status, setStatus] = useState<ParseStatus>(ParseStatus.IDLE);
  const [fileCount, setFileCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for categorization rules, seeded from localStorage if available
  const [rules, setRules] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('gnucash_rules');
    return saved ? JSON.parse(saved) : INITIAL_RULES;
  });

  // Persist rules whenever they change
  useEffect(() => {
    localStorage.setItem('gnucash_rules', JSON.stringify(rules));
  }, [rules]);

  // --- Statistics Calculation ---
  const stats: ProcessingStats = useMemo(() => {
    const totalDebits = transactions
      .filter(t => t.type === 'DEBIT')
      .reduce((acc, t) => acc + t.amount, 0);
    const totalCredits = transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((acc, t) => acc + t.amount, 0);

    return {
      totalFiles: fileCount,
      totalTransactions: transactions.length,
      totalDebits,
      totalCredits,
      netAmount: totalCredits - totalDebits,
      editedCount: transactions.filter(t => t.isEdited).length
    };
  }, [transactions, fileCount]);

  // --- Handlers ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setStatus(ParseStatus.PROCESSING);
    
    try {
      let newTransactions: Transaction[] = [];
      let processedCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type === 'application/pdf') {
          const text = await extractTextFromPDF(file);
          const fileTrans = parseTransactions(text, file.name, rules);
          newTransactions = [...newTransactions, ...fileTrans];
          processedCount++;
        }
      }

      setTransactions(prev => [...prev, ...newTransactions]);
      setFileCount(prev => prev + processedCount);
      setStatus(ParseStatus.SUCCESS);
    } catch (error) {
      console.error(error);
      setStatus(ParseStatus.ERROR);
      alert('Failed to parse PDF. Please ensure it is a valid bank statement.');
    }
  };

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => {
      const updatedList = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      const targetTransaction = updatedList.find(t => t.id === id);

      // Rule Learning Logic
      // If the category was updated, we treat the current description as a keyword for this category.
      if (updates.category && targetTransaction && updates.category !== 'Expenses:Uncategorized') {
        const keyword = targetTransaction.description; // Use the current (possibly edited) description
        const newCategory = updates.category;

        // 1. Update Rules State
        const newRules = { ...rules, [keyword]: newCategory };
        setRules(newRules);

        // 2. Auto-apply to other similar transactions
        // We only update transactions that are NOT edited yet, or strictly match the keyword
        return updatedList.map(t => {
          if (t.id === id) return t; // Skip the one we just manually touched
          if (t.isEdited) return t; // Skip already reviewed ones to be safe

          // Check if this transaction matches the new keyword rule
          const suggestedCategory = getAutoCategory(t.description, newRules);
          
          if (suggestedCategory !== 'Expenses:Uncategorized' && suggestedCategory !== t.category) {
             // Only auto-update if we found a better match
             return { ...t, category: suggestedCategory };
          }
          return t;
        });
      }

      return updatedList;
    });
  }, [rules]);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAll = () => {
    if (confirm("Are you sure you want to clear all transactions?")) {
        setTransactions([]);
        setFileCount(0);
        setStatus(ParseStatus.IDLE);
    }
  };

  const clearRules = () => {
    if (confirm("This will reset all learned categorization rules. Continue?")) {
        setRules(INITIAL_RULES);
        localStorage.removeItem('gnucash_rules');
        alert("Rules reset to defaults.");
    }
  }

  const handleExport = () => {
    if (transactions.length === 0) return;
    const csvContent = generateCSV(transactions);
    const filename = `gnucash_import_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(csvContent, filename);
  };

  // --- Filter Logic ---
  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions;
    const query = searchQuery.toLowerCase();
    return transactions.filter(t => 
      t.description.toLowerCase().includes(query) || 
      t.category.toLowerCase().includes(query) ||
      t.amount.toString().includes(query)
    );
  }, [transactions, searchQuery]);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Statement Processor
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={clearRules} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1" title="Reset Learned Rules">
               <BrainCircuit className="w-3 h-3" /> Reset Brain
            </button>
            <div className="text-sm text-slate-500 hidden sm:block">
              GnuCash Import Helper
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Upload Hero Section - Show if empty */}
        {transactions.length === 0 && (
          <div className="max-w-2xl mx-auto mt-12 text-center">
            <div className="relative group cursor-pointer">
              <input 
                type="file" 
                multiple 
                accept=".pdf" 
                onChange={handleFileUpload} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-3 border-dashed border-blue-300 rounded-3xl p-12 bg-blue-50/50 hover:bg-blue-50 transition-all group-hover:border-blue-500 group-hover:scale-[1.01]">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {status === ParseStatus.PROCESSING ? (
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-current"></div>
                  ) : (
                    <UploadCloud className="w-10 h-10" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Drop Bank Statements PDF</h2>
                <p className="text-slate-500 text-lg">
                  Supports SBI, HDFC, ICICI, Axis & more. <br/>
                  <span className="text-sm text-slate-400 mt-2 block">Parses text, matches categories, prepares for GnuCash.</span>
                </p>
                <div className="mt-6 inline-block px-6 py-2 bg-white border border-slate-200 rounded-full text-slate-600 text-sm font-medium shadow-sm">
                  Click to Browse Files
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard - Show if data exists */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <StatsSidebar stats={stats} />
            </div>

            {/* Transaction List */}
            <div className="lg:col-span-3">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                 
                 {/* Search */}
                 <div className="relative w-full sm:max-w-md">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Search className="h-5 w-5 text-slate-400" />
                   </div>
                   <input
                     type="text"
                     className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm shadow-sm"
                     placeholder="Search transactions..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                   />
                 </div>

                 {/* Top Actions */}
                 <div className="flex gap-2">
                    <label className="flex items-center justify-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 cursor-pointer shadow-sm">
                       <UploadCloud className="w-4 h-4 mr-2" />
                       Add More
                       <input type="file" multiple accept=".pdf" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button 
                      onClick={clearAll}
                      className="flex items-center justify-center px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear
                    </button>
                 </div>
              </div>

              {/* List */}
              <div className="space-y-3">
                {filteredTransactions.map(transaction => (
                  <TransactionRow 
                    key={transaction.id} 
                    transaction={transaction} 
                    onUpdate={updateTransaction}
                    onDelete={deleteTransaction}
                  />
                ))}
                
                {filteredTransactions.length === 0 && (
                   <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <p className="text-slate-500">No transactions match your search.</p>
                   </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Persistent Footer CTA */}
      {transactions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-xl z-40">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
             <div className="text-sm text-slate-500 hidden sm:block">
               {stats.editedCount} of {stats.totalTransactions} transactions reviewed
             </div>
             <button 
              onClick={handleExport}
              className="flex items-center justify-center w-full sm:w-auto px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all transform active:scale-95"
            >
              <Download className="w-5 h-5 mr-2" />
              Export {stats.totalTransactions} Transactions to CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;