import React from 'react';
import { Transaction } from '../types';
import { GNUCASH_ACCOUNTS } from '../constants';
import { Check, RefreshCcw } from 'lucide-react';

interface TransactionRowProps {
  transaction: Transaction;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({ transaction, onUpdate, onDelete }) => {
  
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(transaction.id, { description: e.target.value, isEdited: true });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(transaction.id, { category: e.target.value, isEdited: true });
  };

  const handleReset = () => {
    onUpdate(transaction.id, { 
      description: transaction.originalDescription, 
      category: 'Expenses:Uncategorized',
      isEdited: false 
    });
  };

  return (
    <div className={`group p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
      transaction.isEdited 
        ? 'bg-blue-50/30 border-blue-200' 
        : 'bg-white border-slate-200 hover:border-blue-300'
    }`}>
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        
        {/* Date & Amount */}
        <div className="flex-shrink-0 w-full md:w-32 flex flex-row md:flex-col justify-between md:justify-center">
          <div className="text-sm font-semibold text-slate-600">{transaction.date}</div>
          <div className={`text-lg font-bold font-mono ${transaction.type === 'DEBIT' ? 'text-slate-800' : 'text-green-600'}`}>
            {transaction.type === 'DEBIT' ? '-' : '+'}₹{transaction.amount.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Description Input */}
        <div className="flex-grow w-full">
          <label className="text-xs text-slate-400 font-medium ml-1">Description</label>
          <input 
            type="text" 
            value={transaction.description}
            onChange={handleDescriptionChange}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm font-medium"
          />
          <div className="text-xs text-slate-400 mt-1 truncate max-w-md ml-1">
            Source: {transaction.sourceFile}
          </div>
        </div>

        {/* Category Dropdown */}
        <div className="flex-shrink-0 w-full md:w-64">
          <label className="text-xs text-slate-400 font-medium ml-1">GnuCash Category</label>
          <div className="relative">
             <select
              value={transaction.category}
              onChange={handleCategoryChange}
              className={`w-full appearance-none px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer ${
                transaction.category === 'Expenses:Uncategorized' 
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {GNUCASH_ACCOUNTS.map(acc => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </select>
            {/* Custom arrow for better styling */}
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 self-end md:self-center mt-2 md:mt-4">
           {transaction.isEdited && (
             <button 
               onClick={handleReset}
               className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
               title="Reset"
             >
               <RefreshCcw className="w-4 h-4" />
             </button>
           )}
           <button 
             onClick={() => onDelete(transaction.id)}
             className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors group-hover:text-slate-400"
             title="Delete"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
           </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionRow;