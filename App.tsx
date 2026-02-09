import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Transaction, ProcessingStats, ParseStatus } from './types';
import { extractTextFromPDF, parseTransactions } from './services/parserService';
import { generateCSV, downloadCSV } from './services/csvService';
import { INITIAL_RULES } from './constants';
import StatsSidebar from './components/StatsSidebar';
import TransactionRow from './components/TransactionRow';
import RulesModal from './components/RulesModal';
import { UploadCloud, Download, FileText, Search, Trash2, Settings } from 'lucide-react';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('gnucash_transactions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const [status, setStatus] = useState<ParseStatus>(ParseStatus.IDLE);
  const [fileCount, setFileCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gnucash_file_count');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) { return 0; }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  const [rules, setRules] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('gnucash_rules');
      return saved ? JSON.parse(saved) : INITIAL_RULES;
    } catch (e) { return INITIAL_RULES; }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gnucash_rules', JSON.stringify(rules));
      localStorage.setItem('gnucash_transactions', JSON.stringify(transactions));
      localStorage.setItem('gnucash_file_count', fileCount.toString());
    } catch (e) { console.warn("Storage restricted"); }
  }, [rules, transactions, fileCount]);

  const stats: ProcessingStats = useMemo(() => {
    const debits = transactions.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + t.amount, 0);
    const credits = transactions.filter(t => t.type === 'CREDIT').reduce((acc, t) => acc + t.amount, 0);
    return {
      totalFiles: fileCount,
      totalTransactions: transactions.length,
      totalDebits: debits,
      totalCredits: credits,
      netAmount: credits - debits,
      editedCount: transactions.filter(t => t.isEdited).length
    };
  }, [transactions, fileCount]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setStatus(ParseStatus.PROCESSING);
    
    try {
      let combined: Transaction[] = [];
      let successfulFiles = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.toLowerCase().endsWith('.pdf')) {
          try {
            const raw = await extractTextFromPDF(file);
            const parsed = parseTransactions(raw, file.name, rules);
            if (parsed.length > 0) {
              combined = [...combined, ...parsed];
              successfulFiles++;
            } else {
              console.warn(`No transactions found in ${file.name}`);
            }
          } catch (err: any) {
            alert(`Error reading ${file.name}: ${err.message}`);
          }
        }
      }

      if (combined.length > 0) {
        setTransactions(prev => [...prev, ...combined]);
        setFileCount(prev => prev + successfulFiles);
        setStatus(ParseStatus.SUCCESS);
      } else {
        alert("Failed to find any transactions. Please ensure the PDF contains text (not just an image).");
        setStatus(ParseStatus.IDLE);
      }
    } catch (error) {
      console.error(error);
      setStatus(ParseStatus.ERROR);
    } finally {
      if (event.target) event.target.value = '';
      setTimeout(() => setStatus(ParseStatus.IDLE), 1500);
    }
  };

  const clearAllData = () => {
    if (window.confirm("This will permanently delete all processed transactions. Continue?")) {
      setTransactions([]);
      setFileCount(0);
      setSearchQuery('');
      localStorage.removeItem('gnucash_transactions');
      localStorage.removeItem('gnucash_file_count');
      setStatus(ParseStatus.IDLE);
    }
  };

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return transactions.filter(t => 
      t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    ).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <RulesModal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} rules={rules} onUpdateRules={setRules} onResetDefaults={() => setRules(INITIAL_RULES)} />

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white">
            <FileText size={20} />
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">GnuCash Processor</h1>
        </div>
        <button onClick={() => setIsRulesModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all font-bold border border-slate-200">
          <Settings size={18} /> Rules
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {status === ParseStatus.PROCESSING ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="font-black text-2xl text-slate-800">Processing PDF...</p>
            <p className="text-slate-500 mt-2">Extracting transactions and applying rules.</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="max-w-xl mx-auto mt-20">
            <label htmlFor="initial-upload" className="block border-4 border-dashed border-slate-200 rounded-[2.5rem] p-20 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group shadow-sm bg-white text-center">
              <input id="initial-upload" type="file" multiple accept=".pdf" onChange={handleFileUpload} className="hidden" />
              <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform shadow-inner">
                <UploadCloud size={48} />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-3">Upload Statements</h2>
              <p className="text-slate-500 mb-8 text-lg font-medium">Drop your PDF bank statements here</p>
              <div className="inline-block px-10 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:shadow-blue-200 transition-all">Browse Files</div>
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1"><StatsSidebar stats={stats} /></div>
            <div className="lg:col-span-3 space-y-6">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input type="text" placeholder="Search anything..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                   <label htmlFor="add-more-upload" className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer font-black transition-all shadow-lg active:scale-95">
                      <UploadCloud size={20} /> Add More
                      <input id="add-more-upload" type="file" multiple accept=".pdf" onChange={handleFileUpload} className="hidden" />
                   </label>
                   <button onClick={clearAllData} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white text-red-500 border border-red-100 rounded-xl hover:bg-red-50 transition-all font-black shadow-sm">
                     <Trash2 size={20} /> Clear
                   </button>
                </div>
              </div>
              <div className="space-y-4">
                {filteredTransactions.map(tx => (
                  <TransactionRow key={tx.id} transaction={tx} onUpdate={(id, up) => setTransactions(prev => prev.map(t => t.id === id ? {...t, ...up, isEdited: true} : t))} onDelete={id => setTransactions(prev => prev.filter(t => t.id !== id))} />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {transactions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-6 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-slate-800 font-bold text-lg">
              <span className="text-blue-600">{transactions.length}</span> transactions identified
            </div>
            <button onClick={() => downloadCSV(generateCSV(transactions), `gnucash_export_${new Date().toISOString().slice(0,10)}.csv`)} className="flex items-center gap-2 px-12 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-2xl active:scale-95">
              <Download size={24} /> Export to GnuCash
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
