import React, { useState, useRef } from 'react';
import { Transaction, BudgetCategoryGroup } from '../types';
import { parseCSVData, mapRowToTransaction, autoClassifyDescription } from '../utils/csvParser';
import { aggregateBudget } from '../utils/calculators';
import { 
  Plus, 
  Trash2, 
  FileSpreadsheet, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  TrendingDown, 
  TrendingUp, 
  ArrowRight,
  Info
} from 'lucide-react';

interface BudgetPlannerProps {
  transactions: Transaction[];
  monthlyIncome: number;
  onIncomeChange: (income: number) => void;
  onTransactionsChange: (transactions: Transaction[]) => void;
}

export default function BudgetPlanner({
  transactions,
  monthlyIncome,
  onIncomeChange,
  onTransactionsChange
}: BudgetPlannerProps) {
  // Manual transaction inputs
  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState('');
  const [group, setGroup] = useState<BudgetCategoryGroup>('Needs');
  const [category, setCategory] = useState('');

  // CSV Drag-and-drop states
  const [isDragging, setIsDragging] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState({
    date: '',
    description: '',
    amount: ''
  });
  const [parsedPreview, setParsedPreview] = useState<Transaction[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Aggregated math
  const budgetSum = aggregateBudget(transactions, monthlyIncome);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || !amt) return;
    const value = parseFloat(amt);
    if (isNaN(value) || value <= 0) return;

    const newTx: Transaction = {
      id: `t-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: desc,
      amount: value,
      group,
      category: category.trim() || 'General'
    };

    onTransactionsChange([newTx, ...transactions]);
    setDesc('');
    setAmt('');
    setCategory('');
  };

  const handleDeleteTransaction = (id: string) => {
    onTransactionsChange(transactions.filter(t => t.id !== id));
  };

  // Drag and drop mechanics
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processCSVText = (text: string) => {
    try {
      const { headers, rows } = parseCSVData(text);
      if (headers.length < 2) {
        setCsvError('Insufficient columns found in CSV file.');
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);
      setCsvError(null);

      // Simple heuristic auto-inference of column layouts
      const inferredMapping = { date: '', description: '', amount: '' };
      headers.forEach(h => {
        const lower = h.toLowerCase();
        if (lower.includes('date') || lower.includes('day') || lower.includes('time')) {
          inferredMapping.date = h;
        } else if (lower.includes('desc') || lower.includes('detail') || lower.includes('payee') || lower.includes('vendor') || lower.includes('memo')) {
          inferredMapping.description = h;
        } else if (lower.includes('amount') || lower.includes('price') || lower.includes('cost') || lower.includes('value') || lower.includes('sum') || lower.includes('charge')) {
          inferredMapping.amount = h;
        }
      });

      // Fallbacks
      if (!inferredMapping.date) inferredMapping.date = headers[0];
      if (!inferredMapping.description) inferredMapping.description = headers[1] || headers[0];
      if (!inferredMapping.amount) inferredMapping.amount = headers[2] || headers[0];

      setColumnMapping(inferredMapping);
      regeneratePreview(rows, headers, inferredMapping);
    } catch (e) {
      setCsvError('Parsing failed. Ensure the file contains a standard CSV format.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          processCSVText(event.target.result as string);
        }
      };
      reader.readAsText(file);
    } else {
      setCsvError('Invalid file type. Please drag in a valid bank spreadsheet .csv file.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          processCSVText(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const regeneratePreview = (
    rows: string[][],
    headers: string[],
    mapping: typeof columnMapping
  ) => {
    const list: Transaction[] = [];
    rows.slice(0, 8).forEach(row => {
      const tx = mapRowToTransaction(row, headers, mapping, autoClassifyDescription);
      if (tx) {
        list.push(tx as Transaction);
      }
    });
    setParsedPreview(list);
  };

  const handleMappingChange = (field: 'date' | 'description' | 'amount', headerVal: string) => {
    const nextMapping = { ...columnMapping, [field]: headerVal };
    setColumnMapping(nextMapping);
    regeneratePreview(csvRows, csvHeaders, nextMapping);
  };

  const handleImportCSVAll = () => {
    const allParsed: Transaction[] = [];
    csvRows.forEach(row => {
      const tx = mapRowToTransaction(row, csvHeaders, columnMapping, autoClassifyDescription);
      if (tx) {
        allParsed.push(tx as Transaction);
      }
    });

    onTransactionsChange([...allParsed, ...transactions]);
    // Clear CSV state
    setCsvHeaders([]);
    setCsvRows([]);
    setParsedPreview([]);
    setCsvError(null);
  };

  return (
    <div className="space-y-8" id="budget-planner-panel">
      {/* Target Setup Column & Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Income & Control Segment */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-mono text-neutral-400 block uppercase tracking-wider">Dynamic Rule Setup</span>
            <h3 className="text-lg font-semibold text-neutral-900 mt-1">Monthly Flow Engine</h3>
            <p className="text-xs text-neutral-400 mt-1 font-light">Input net monthly cash receipts. The planner establishes standard 50/30/20 target thresholds.</p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-mono font-medium text-neutral-500 uppercase">Monthly Net Income Receipts</span>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm">$</span>
              <input
                type="number"
                value={monthlyIncome || ''}
                onChange={e => onIncomeChange(parseFloat(e.target.value) || 0)}
                placeholder="6000"
                className="w-full bg-neutral-50 border rounded-xl text-sm pl-8 pr-4 py-3 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-neutral-400 font-mono text-right"
              />
            </div>
          </div>

          <div className="bg-neutral-50 p-4 rounded-2xl space-y-2 text-xs font-light text-neutral-600">
            <div className="flex justify-between">
              <span>Dynamic Spent Total:</span>
              <span className="font-semibold text-neutral-900">${budgetSum.totalSpent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Unallocated Remaining:</span>
              <span className={`font-semibold ${budgetSum.totalRemaining > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                ${budgetSum.totalRemaining.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 50/30/20 Rules Display Blocks */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">50/30/20 Spending Allocation</h3>
            <p className="text-xs text-neutral-400 mt-1 font-light">Target Allocations: 50% Needs, 30% Wants, 20% Savings. Dynamic indicators signal structural drift.</p>
          </div>

          <div className="space-y-6">
            
            {/* NEEDS BAR */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-neutral-700">Needs (Target 50%): Housing, Utilities, Insurance</span>
                <span className={`font-mono font-semibold ${budgetSum.needs.status === 'overextended' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ${budgetSum.needs.spent.toLocaleString()} ({budgetSum.needs.percent}%)
                </span>
              </div>
              <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${budgetSum.needs.status === 'overextended' ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                  style={{ width: `${Math.min(100, budgetSum.needs.percent)}%` }} 
                />
              </div>
              {budgetSum.needs.status === 'overextended' && (
                <div className="flex items-center gap-1.5 text-[10px] text-rose-500 font-mono">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Category limits overextended. Minimize fixed recurring obligations.</span>
                </div>
              )}
            </div>

            {/* WANTS BAR */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-neutral-700">Wants (Target 30%): Subscriptions, Dining Cafe, Retail</span>
                <span className={`font-mono font-semibold ${budgetSum.wants.status === 'overextended' ? 'text-rose-600' : 'text-emerald-500'}`}>
                  ${budgetSum.wants.spent.toLocaleString()} ({budgetSum.wants.percent}%)
                </span>
              </div>
              <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${budgetSum.wants.status === 'overextended' ? 'bg-rose-500' : 'bg-blue-500'}`} 
                  style={{ width: `${Math.min(100, budgetSum.wants.percent)}%` }} 
                />
              </div>
              {budgetSum.wants.status === 'overextended' && (
                <div className="flex items-center gap-1.5 text-[10px] text-rose-500 font-mono">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Discretionary shopping warning. Trim premium memberships or lifestyle items.</span>
                </div>
              )}
            </div>

            {/* SAVINGS BAR */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-neutral-700">Savings & Investments Goal (Target 20%): Stock buy, IRA Deposits</span>
                <span className={`font-mono font-semibold ${budgetSum.savings.status === 'lagging' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  ${budgetSum.savings.spent.toLocaleString()} ({budgetSum.savings.percent}%)
                </span>
              </div>
              <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${budgetSum.savings.status === 'lagging' ? 'bg-amber-500' : 'bg-indigo-500'}`} 
                  style={{ width: `${Math.min(100, budgetSum.savings.percent)}%` }} 
                />
              </div>
              {budgetSum.savings.status === 'lagging' && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-mono">
                  <Info className="w-3.5 h-3.5" />
                  <span>Target savings lag. Bolster automatic transfers to assets account.</span>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* CSV Bank Statements Data Parser */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Client-Side Bank Statement CSV Parser</h3>
          <p className="text-xs text-neutral-400 mt-1 font-light">Eliminate server syncing. Drop standard banking export spreadsheets to classify items recursively.</p>
        </div>

        {/* Drag Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl h-36 flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragging ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400 bg-neutral-50/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".csv"
            className="hidden"
          />
          <FileSpreadsheet className="w-8 h-8 text-neutral-400 mb-2" />
          <p className="text-xs text-neutral-600 font-medium">Drag bank exports (.csv) here or click to browse</p>
          <span className="text-[10px] text-neutral-400 font-light mt-1">Files are parsed strictly local, never leaving your sandbox.</span>
        </div>

        {csvError && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{csvError}</span>
          </div>
        )}

        {/* Column Interactive Mappings Row */}
        {csvHeaders.length > 0 && (
          <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Map CSV Headers to Transaction Schema</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-neutral-500 uppercase block">Transaction Date</span>
                <select
                  value={columnMapping.date || ''}
                  onChange={e => handleMappingChange('date', e.target.value)}
                  className="w-full bg-white border rounded-xl text-xs px-2.5 py-1.5 focus:outline-hidden"
                >
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-neutral-500 uppercase block">Payee / Description</span>
                <select
                  value={columnMapping.description || ''}
                  onChange={e => handleMappingChange('description', e.target.value)}
                  className="w-full bg-white border rounded-xl text-xs px-2.5 py-1.5 focus:outline-hidden"
                >
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-neutral-500 uppercase block">Monetary Amount</span>
                <select
                  value={columnMapping.amount || ''}
                  onChange={e => handleMappingChange('amount', e.target.value)}
                  className="w-full bg-white border rounded-xl text-xs px-2.5 py-1.5 focus:outline-hidden"
                >
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            {/* Micro visual rows feedback */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-neutral-400 uppercase block">Mapper Preview (Auto-Classifying)</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto border bg-white rounded-xl divide-y">
                {parsedPreview.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-neutral-50">
                    <div className="truncate pr-4">
                      <span className="font-semibold text-neutral-800">{item.description}</span>
                      <span className="text-[10px] text-neutral-400 font-mono block">{item.date}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="bg-neutral-100 text-neutral-700 text-[9px] px-2 py-0.5 rounded-full font-mono">
                        {item.group}: {item.category}
                      </span>
                      <span className="font-mono font-bold text-neutral-900">${item.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleImportCSVAll}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                Import All Parsed Transactions ({csvRows.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Transactions Entry & Logging Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Entry Panel - Span 4 */}
        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6 self-start">
          <h3 className="text-base font-semibold text-neutral-900 border-b pb-3 border-neutral-100">Add Transaction</h3>
          
          <form onSubmit={handleAddTransaction} className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase">Vendor / Payee</span>
              <input
                type="text"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Starbucks, Landlord Rent, Wal-Mart..."
                className="w-full bg-neutral-50 border rounded-xl text-sm px-3 py-2 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-neutral-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Allocation Group</span>
                <select
                  value={group}
                  onChange={e => setGroup(e.target.value as BudgetCategoryGroup)}
                  className="w-full bg-neutral-50 border rounded-xl text-xs px-3 py-2.5 focus:outline-hidden"
                >
                  <option value="Needs">Needs (50%)</option>
                  <option value="Wants">Wants (30%)</option>
                  <option value="Savings">Savings (20%)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Subcategory</span>
                <input
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="Grocery, Rent"
                  className="w-full bg-neutral-50 border rounded-xl text-xs px-3 py-2 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-neutral-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-neutral-500 uppercase">Cost / expense ($)</span>
              <input
                type="number"
                value={amt}
                onChange={e => setAmt(e.target.value)}
                placeholder="25"
                className="w-full bg-neutral-50 border rounded-xl text-sm px-3 py-2 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-neutral-400 font-mono text-right"
              />
            </div>

            <button type="submit" className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-xs flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Record Transaction</span>
            </button>
          </form>
        </div>

        {/* Transactions List - Span 8 */}
        <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-neutral-100">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Budget Ledger List</h3>
              <p className="text-xs text-neutral-400 font-light">Chronological ledger of logged financial transactions.</p>
            </div>
            <span className="bg-neutral-100 text-neutral-600 text-xs px-2.5 py-1 rounded-full font-mono">
              {transactions.length} Logs
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-xs font-light space-y-1">
                <p>No transaction history logged for this budget.</p>
                <p>Import statements above or manually enter payments to inspect.</p>
              </div>
            ) : (
              transactions.map(item => (
                <div key={item.id} className="p-3.5 border rounded-2xl flex items-center justify-between hover:bg-neutral-50/55 transition-all">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      item.group === 'Needs' ? 'bg-emerald-500' :
                      item.group === 'Wants' ? 'bg-blue-500' : 'bg-indigo-500'
                    }`} />
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-900">{item.description}</h4>
                      <p className="text-[10px] text-neutral-400 font-mono block">
                        {item.date} • <span className="uppercase text-neutral-500">{item.group}</span> / {item.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-neutral-900">${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    <button
                      onClick={() => handleDeleteTransaction(item.id)}
                      className="p-1 hover:text-rose-600 text-neutral-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
