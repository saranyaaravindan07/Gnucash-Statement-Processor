import React from 'react';
import { ProcessingStats } from '../types';
import { FileText, CheckCircle, Activity, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsSidebarProps {
  stats: ProcessingStats;
}

const StatsSidebar: React.FC<StatsSidebarProps> = ({ stats }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit sticky top-6">
      <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-500" />
        Summary
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
        {/* Transaction Count */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <FileText className="w-4 h-4" />
            <span>Transactions</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalTransactions}</div>
          <div className="text-xs text-slate-400 mt-1">From {stats.totalFiles} file(s)</div>
        </div>

        {/* Edited Count */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <CheckCircle className="w-4 h-4" />
            <span>Reviewed</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.editedCount}</div>
          <div className="text-xs text-slate-400 mt-1">
            {stats.totalTransactions > 0 
              ? Math.round((stats.editedCount / stats.totalTransactions) * 100) 
              : 0}% Complete
          </div>
        </div>

        {/* Debits */}
        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
          <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
            <TrendingDown className="w-4 h-4" />
            <span>Total Debits</span>
          </div>
          <div className="text-xl font-bold text-red-700">
            ₹{stats.totalDebits.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* Credits */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Total Credits</span>
          </div>
          <div className="text-xl font-bold text-green-700">
            ₹{stats.totalCredits.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* Net */}
        <div className="bg-slate-900 p-4 rounded-lg text-white mt-2 shadow-lg shadow-slate-200">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <CreditCard className="w-4 h-4" />
            <span>Net Spend</span>
          </div>
          <div className={`text-2xl font-bold ${stats.netAmount < 0 ? 'text-red-300' : 'text-green-300'}`}>
            ₹{stats.netAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsSidebar;