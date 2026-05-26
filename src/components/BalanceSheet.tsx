import React, { useState } from 'react';
import { LedgerItem, AssetCategory, LiabilityCategory } from '../types';
import { 
  Plus, 
  Trash2, 
  BadgeDollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  X, 
  RefreshCw 
} from 'lucide-react';

interface BalanceSheetProps {
  assets: LedgerItem[];
  liabilities: LedgerItem[];
  onChange: (assets: LedgerItem[], liabilities: LedgerItem[]) => void;
  onResetToBlank: () => void;
  onResetToDemo: () => void;
}

export default function BalanceSheetComponent({ 
  assets, 
  liabilities, 
  onChange,
  onResetToBlank,
  onResetToDemo
}: BalanceSheetProps) {
  // New Item entry state
  const [assetName, setAssetName] = useState('');
  const [assetVal, setAssetVal] = useState('');
  const [assetCat, setAssetCat] = useState<AssetCategory>('Cash');

  const [liabName, setLiabName] = useState('');
  const [liabVal, setLiabVal] = useState('');
  const [liabCat, setLiabCat] = useState<LiabilityCategory>('Debt');

  // Interactive tooltip hover key
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Math aggregates
  const totalAssets = assets.reduce((sum, item) => sum + item.value, 0);
  const totalLiabilities = liabilities.reduce((sum, item) => sum + item.value, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Asset breakdown
  const cashSum = assets.filter(a => a.category === 'Cash').reduce((s, i) => s + i.value, 0);
  const investSum = assets.filter(a => a.category === 'Investments').reduce((s, i) => s + i.value, 0);
  const reSum = assets.filter(a => a.category === 'Real Estate').reduce((s, i) => s + i.value, 0);
  const otherAssetSum = assets.filter(a => a.category === 'Other').reduce((s, i) => s + i.value, 0);

  // Debt breakdown
  const debtSum = liabilities.filter(l => l.category === 'Debt').reduce((s, i) => s + i.value, 0);
  const mortgageSum = liabilities.filter(l => l.category === 'Mortgage').reduce((s, i) => s + i.value, 0);
  const cardSum = liabilities.filter(l => l.category === 'Credit Card').reduce((s, i) => s + i.value, 0);
  const otherLiabSum = liabilities.filter(l => l.category === 'Other').reduce((s, i) => s + i.value, 0);

  const assetCategories = [
    { key: 'Cash', value: cashSum, color: 'bg-emerald-500 text-emerald-500 border-emerald-500' },
    { key: 'Investments', value: investSum, color: 'bg-blue-500 text-blue-500 border-blue-500' },
    { key: 'Real Estate', value: reSum, color: 'bg-indigo-500 text-indigo-500 border-indigo-500' },
    { key: 'Other Assets', value: otherAssetSum, color: 'bg-amber-500 text-amber-500 border-amber-500' }
  ].filter(c => c.value > 0);

  const liabilityCategories = [
    { key: 'Car / Personal Debt', value: debtSum, color: 'bg-rose-500' },
    { key: 'Mortgages', value: mortgageSum, color: 'bg-red-600' },
    { key: 'Credit Cards', value: cardSum, color: 'bg-orange-500' },
    { key: 'Other Debts', value: otherLiabSum, color: 'bg-neutral-500' }
  ].filter(c => c.value > 0);

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim() || !assetVal) return;
    const value = parseFloat(assetVal);
    if (isNaN(value) || value <= 0) return;

    const newItem: LedgerItem = {
      id: `a-${Date.now()}`,
      name: assetName,
      category: assetCat,
      value
    };
    onChange([...assets, newItem], liabilities);
    setAssetName('');
    setAssetVal('');
  };

  const handleAddLiability = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liabName.trim() || !liabVal) return;
    const value = parseFloat(liabVal);
    if (isNaN(value) || value <= 0) return;

    const newItem: LedgerItem = {
      id: `l-${Date.now()}`,
      name: liabName,
      category: liabCat,
      value
    };
    onChange(assets, [...liabilities, newItem]);
    setLiabName('');
    setLiabVal('');
  };

  const handleDeleteAsset = (id: string) => {
    onChange(assets.filter(a => a.id !== id), liabilities);
  };

  const handleDeleteLiability = (id: string) => {
    onChange(assets, liabilities.filter(l => l.id !== id));
  };

  return (
    <div className="space-y-8" id="balance-sheet-panel">
      {/* KPI Overviews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-4 bottom-4 opacity-10">
            <BadgeDollarSign className="w-24 h-24 text-emerald-400" />
          </div>
          <span className="text-xs font-mono tracking-wider text-neutral-400 uppercase">Aggregated Net Worth</span>
          <div className="text-4xl font-sans font-bold mt-2 tracking-tight">
            ${netWorth.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </div>
          <div className="flex items-center gap-1 text-emerald-400 text-xs mt-3 font-mono">
            <TrendingUp className="w-4 h-4" />
            <span>Liquid Equity: {totalAssets > 0 ? Math.round((netWorth / totalAssets) * 100) : 0}%</span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs">
          <span className="text-xs font-mono tracking-wider text-neutral-500 uppercase">Gross Assets Ledger</span>
          <div className="text-3xl font-sans font-semibold mt-2 tracking-tight text-neutral-900">
            ${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </div>
          <div className="flex items-center gap-1 text-emerald-600 text-xs mt-3 font-mono">
            <ArrowUpRight className="w-4 h-4" />
            <span>{assets.length} Assets Logged</span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs">
          <span className="text-xs font-mono tracking-wider text-neutral-500 uppercase">Total Debt & Liabilities</span>
          <div className="text-3xl font-sans font-semibold mt-2 tracking-tight text-rose-600">
            ${totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </div>
          <div className="flex items-center gap-1 text-rose-600 text-xs mt-3 font-mono">
            <ArrowDownRight className="w-4 h-4" />
            <span>Debt Ratio: {totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* Balance Sheet Visualizer Chart */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-sans font-semibold text-neutral-900">Net Worth & Allocation Visualizer</h3>
          <p className="text-xs text-neutral-400 mt-1 font-light">Interactive breakdown of asset ownership versus outstanding debts.</p>
        </div>

        {totalAssets === 0 ? (
          <div className="h-24 flex items-center justify-center bg-neutral-50 rounded-2xl border border-dashed text-sm text-neutral-400 font-light">
            Sufficient balance items needed to render allocation visualization.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Visual Stack Banner */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Asset Distribution Stack</span>
              <div className="h-8 w-full rounded-xl overflow-hidden flex shadow-inner bg-neutral-100">
                {assetCategories.map((cat) => {
                  const pct = (cat.value / totalAssets) * 100;
                  return (
                    <div
                      key={cat.key}
                      style={{ width: `${pct}%` }}
                      className={`${cat.color.split(' ')[0]} transition-all duration-300 relative cursor-pointer group`}
                      onMouseEnter={() => setHoveredCategory(`${cat.key}: $${cat.value.toLocaleString()}`)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    >
                      <div className="absolute hidden group-hover:flex bottom-full mb-2 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] py-1 px-2 rounded-md font-mono whitespace-nowrap z-30 shadow-lg">
                        {cat.key}: {Math.round(pct)}% (${cat.value.toLocaleString()})
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Debts Stack */}
            {totalLiabilities > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Liability Distribution Offset</span>
                <div className="h-6 w-full rounded-xl overflow-hidden flex shadow-inner bg-neutral-100">
                  {liabilityCategories.map((cat) => {
                    const pct = (cat.value / totalLiabilities) * 100;
                    return (
                      <div
                        key={cat.key}
                        style={{ width: `${pct}%` }}
                        className={`${cat.color} transition-all duration-300 relative cursor-pointer group`}
                        onMouseEnter={() => setHoveredCategory(`${cat.key}: $${cat.value.toLocaleString()}`)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      >
                        <div className="absolute hidden group-hover:flex bottom-full mb-2 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] py-1 px-2 rounded-md font-mono whitespace-nowrap z-30 shadow-lg">
                          {cat.key}: {Math.round(pct)}% (${cat.value.toLocaleString()})
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hover Tooltip or Guide Details */}
            <div className="h-5 flex items-center justify-between text-xs text-neutral-500 font-mono transition-all">
              {hoveredCategory ? (
                <span className="text-neutral-900 font-medium">↳ {hoveredCategory}</span>
              ) : (
                <span className="text-neutral-400">Hover sectors above to inspect individual asset weighting</span>
              )}

              {/* Stack Legend */}
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
                  <span>Cash</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" />
                  <span>Investments</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block" />
                  <span>Real Estate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
                  <span>Other Assets</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ledger Forms & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ASSETS PORTION */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-neutral-100">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Assets Ledger</h3>
              <p className="text-xs text-neutral-400 font-light">Things you own with real market value.</p>
            </div>
            <span className="bg-emerald-50 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-mono font-medium">
              ${totalAssets.toLocaleString()}
            </span>
          </div>

          {/* Asset Entry Form */}
          <form onSubmit={handleAddAsset} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-neutral-50 p-4 rounded-2xl border">
            <div className="md:col-span-5 space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Item Name</span>
              <input
                type="text"
                value={assetName}
                onChange={e => setAssetName(e.target.value)}
                placeholder="Checking, Brokerage, House..."
                className="w-full bg-white border rounded-lg text-sm px-2.5 py-1.5 focus:outline-hidden"
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Category</span>
              <select
                value={assetCat}
                onChange={e => setAssetCat(e.target.value as AssetCategory)}
                className="w-full bg-white border rounded-lg text-sm px-2.5 py-1.5 focus:outline-hidden"
              >
                <option value="Cash">Cash</option>
                <option value="Investments">Investments</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="md:col-span-3 space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Value ($)</span>
              <input
                type="number"
                value={assetVal}
                onChange={e => setAssetVal(e.target.value)}
                placeholder="1000"
                className="w-full bg-white border rounded-lg text-sm px-2.5 py-1.5 focus:outline-hidden text-right font-mono"
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <button type="submit" className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg flex items-center justify-center cursor-pointer">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Assets Items List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {assets.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-6 font-light">No cash or asset ledger nodes created.</p>
            ) : (
              assets.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-neutral-50 transition-all">
                  <div>
                    <span className="text-sm font-medium text-neutral-900">{item.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono block uppercase">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-semibold text-neutral-900">${item.value.toLocaleString()}</span>
                    <button
                      onClick={() => handleDeleteAsset(item.id)}
                      className="p-1 hover:text-rose-600 text-neutral-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* LIABILITIES PORTION */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-neutral-100">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Liabilities Ledger</h3>
              <p className="text-xs text-neutral-400 font-light">Outstanding debts and credit obligations.</p>
            </div>
            <span className="bg-rose-50 text-rose-800 text-xs px-2.5 py-1 rounded-full font-mono font-medium">
              ${totalLiabilities.toLocaleString()}
            </span>
          </div>

          {/* Liability Entry Form */}
          <form onSubmit={handleAddLiability} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-neutral-50 p-4 rounded-2xl border">
            <div className="md:col-span-5 space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Debt Name</span>
              <input
                type="text"
                value={liabName}
                onChange={e => setLiabName(e.target.value)}
                placeholder="Car Loan, Amex, Mortgage..."
                className="w-full bg-white border rounded-lg text-sm px-2.5 py-1.5 focus:outline-hidden"
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Category</span>
              <select
                value={liabCat}
                onChange={e => setLiabCat(e.target.value as LiabilityCategory)}
                className="w-full bg-white border rounded-lg text-sm px-2.5 py-1.5 focus:outline-hidden"
              >
                <option value="Debt">Debt</option>
                <option value="Mortgage">Mortgage</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="md:col-span-3 space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Owed ($)</span>
              <input
                type="number"
                value={liabVal}
                onChange={e => setLiabVal(e.target.value)}
                placeholder="1000"
                className="w-full bg-white border rounded-lg text-sm px-2.5 py-1.5 focus:outline-hidden text-right font-mono"
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <button type="submit" className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg flex items-center justify-center cursor-pointer">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Liabilities List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {liabilities.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-6 font-light">No credit checkouts or debt items logged.</p>
            ) : (
              liabilities.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-neutral-50 transition-all">
                  <div>
                    <span className="text-sm font-medium text-neutral-900">{item.name}</span>
                    <span className="text-[10px] text-rose-500 font-mono block uppercase">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-semibold text-rose-600">${item.value.toLocaleString()}</span>
                    <button
                      onClick={() => handleDeleteLiability(item.id)}
                      className="p-1 hover:text-rose-600 text-neutral-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dangerous Operations Accordion */}
      <div className="pt-4 border-t border-neutral-200">
        <div className="p-5 bg-neutral-50 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-sm font-semibold text-neutral-900">Absolute Privacy & Data Management</h4>
            <p className="text-xs text-neutral-500 font-light">All data is kept strictly inside your browser. Toggle between starting fresh or loading demo data.</p>
          </div>
          <div className="flex flex-wrap gap-2.5 justify-center md:justify-end">
            <button
              onClick={() => {
                if (window.confirm('Delete all ledger items, budgets, portfolios, and transaction logs to start from absolute scratch? This cannot be undone.')) {
                  onResetToBlank();
                }
              }}
              className="px-4 py-2 border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-xs font-mono font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Reset to Blank Slate
            </button>
            <button
              onClick={() => {
                if (window.confirm('This will overwrite current edits and reload the default Sandbox practice dataset. Continue?')) {
                  onResetToDemo();
                }
              }}
              className="px-4 py-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 text-xs font-mono font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Reload Sandbox Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
