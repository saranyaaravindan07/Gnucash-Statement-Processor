import React from 'react';
import { Transaction } from '../types';
import { GNUCASH_ACCOUNTS } from '../constants';
import { RefreshCcw, Trash2 } from 'lucide-react';

interface TransactionRowProps {
  transaction: Transaction;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({ transaction, onUpdate, onDelete }) => {
  
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(transaction.id, { description: e.target.value, isEdited: true });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(transaction.id, { category: e.target.value, isEdited: true });
  };

  const handleReset = () => {
    onUpdate(transaction.id, { 
      description: transaction.originalDescription, 
      category: transaction.originalCategory,
      isEdited: false 
    });
  };

  return (
    <div className={`group p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
      transaction.isEdited 
        ? 'bg-blue-50/40 border-blue-200' 
        : 'bg-white border-slate-200 hover:border-blue-300'
    }`}>
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        
        {/* Date & Amount */}
        <div className="flex-shrink-0 w-full lg:w-32 flex flex-row lg:flex-col justify-between lg:justify-center border-b lg:border-b-0 border-slate-100 pb-2 lg:pb-0">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{transaction.date}</div>
          <div className={`text-lg font-bold font-mono ${transaction.type === 'DEBIT' ? 'text-slate-900' : 'text-green-600'}`}>
            {transaction.type === 'DEBIT' ? '-' : '+'}₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Description Input */}
        <div className="flex-grow w-full">
          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold ml-1 mb-1 block">Transaction Details</label>
          <textarea 
            rows={2}
            value={transaction.description}
            onChange={handleDescriptionChange}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm font-medium resize-none"
            placeholder="Merchant name..."
          />
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2 ml-1">
            <span className="font-semibold uppercase">Source:</span> 
            <span className="truncate">{transaction.sourceFile}</span>
          </div>
        </div>

        {/* Category Dropdown */}
        <div className="flex-shrink-0 w-full lg:w-72">
          <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold ml-1 mb-1 block">GnuCash Account</label>
          <div className="relative">
             <select
              value={transaction.category}
              onChange={handleCategoryChange}
              className={`w-full appearance-none px-3 py-2.5 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer ${
                transaction.category.includes('Uncategorized') 
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {GNUCASH_ACCOUNTS.map(acc => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 self-end lg:self-center mt-2 lg:mt-4">
           {transaction.isEdited && (
             <button 
               onClick={handleReset}
               className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
               title="Reset to original"
             >
               <RefreshCcw className="w-4 h-4" />
             </button>
           )}
           <button 
             onClick={() => onDelete(transaction.id)}
             className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
             title="Delete transaction"
           >
             <Trash2 className="w-4 h-4" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionRow;