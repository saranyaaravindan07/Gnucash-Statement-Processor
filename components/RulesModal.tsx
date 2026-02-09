import React, { useState, useEffect } from 'react';
import { X, Plus, Trash, Save, RotateCcw } from 'lucide-react';
import { GNUCASH_ACCOUNTS } from '../constants';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: Record<string, string>;
  onUpdateRules: (newRules: Record<string, string>) => void;
  onResetDefaults: () => void;
}

const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, rules, onUpdateRules, onResetDefaults }) => {
  const [localRules, setLocalRules] = useState<[string, string][]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState(GNUCASH_ACCOUNTS[0]);
  const [filter, setFilter] = useState('');

  // Sync local state with props whenever modal opens or rules update
  useEffect(() => {
    if (isOpen) {
      setLocalRules(Object.entries(rules).sort((a, b) => a[0].localeCompare(b[0])));
    }
  }, [isOpen, rules]);

  if (!isOpen) return null;

  const handleSave = () => {
    const rulesObject = Object.fromEntries(localRules);
    onUpdateRules(rulesObject);
    onClose();
  };

  const deleteRule = (index: number) => {
    const updated = [...localRules];
    updated.splice(index, 1);
    setLocalRules(updated);
  };

  const addRule = () => {
    if (!newKeyword) return;
    setLocalRules([[newKeyword.toUpperCase(), newCategory], ...localRules]);
    setNewKeyword('');
  };

  const updateRuleKeyword = (index: number, val: string) => {
    const updated = [...localRules];
    updated[index][0] = val.toUpperCase();
    setLocalRules(updated);
  };

  const updateRuleCategory = (index: number, val: string) => {
    const updated = [...localRules];
    updated[index][1] = val;
    setLocalRules(updated);
  };

  const handleReset = () => {
      onResetDefaults();
      onClose();
  }

  const filteredRules = localRules.filter(([key]) => key.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Manage Categorization Rules</h2>
            <p className="text-sm text-slate-500">Define keywords to automatically categorize transactions.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {/* Add New Rule Section */}
        <div className="p-4 bg-blue-50 border-b flex flex-col md:flex-row gap-3 items-end md:items-center">
            <div className="flex-grow w-full">
                <label className="text-xs font-semibold text-blue-600 mb-1 block">New Keyword</label>
                <input 
                    type="text" 
                    placeholder="e.g. SWIGGY"
                    className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={newKeyword}
                    onChange={e => setNewKeyword(e.target.value)}
                />
            </div>
            <div className="w-full md:w-1/3">
                 <label className="text-xs font-semibold text-blue-600 mb-1 block">Category</label>
                 <select 
                    className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                 >
                    {GNUCASH_ACCOUNTS.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                 </select>
            </div>
            <button 
                onClick={addRule}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors w-full md:w-auto justify-center"
            >
                <Plus className="w-4 h-4" /> Add
            </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b">
            <input 
                type="text" 
                placeholder="Search rules..." 
                className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm border-none focus:ring-0"
                value={filter}
                onChange={e => setFilter(e.target.value)}
            />
        </div>

        {/* List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-2">
            {filteredRules.length === 0 ? (
                <div className="text-center text-slate-400 py-10">No rules found. Add one above!</div>
            ) : (
                filteredRules.map((rule, index) => (
                    <div key={index} className="flex flex-col md:flex-row gap-2 items-center p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 group">
                        <input 
                            type="text" 
                            value={rule[0]}
                            onChange={(e) => updateRuleKeyword(index, e.target.value)}
                            className="flex-grow font-mono text-sm bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none px-1 py-1"
                        />
                        <select 
                            value={rule[1]}
                            onChange={(e) => updateRuleCategory(index, e.target.value)}
                            className="w-full md:w-1/2 text-sm bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none px-1 py-1"
                        >
                            {GNUCASH_ACCOUNTS.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                        </select>
                        <button 
                            onClick={() => deleteRule(index)}
                            className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash className="w-4 h-4" />
                        </button>
                    </div>
                ))
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
            <button 
                onClick={handleReset} 
                className="text-xs text-red-500 hover:text-red-700 hover:underline flex items-center gap-1"
            >
                <RotateCcw className="w-3 h-3" /> Reset Defaults
            </button>
            <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors shadow-lg">
                    <Save className="w-4 h-4" /> Save Changes
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default RulesModal;