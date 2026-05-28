import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Portfolio, PortfolioAllocation } from '../types';
import { 
  calculateRebalancing, 
  getTickerStats, 
  TICKER_DETAILS, 
  registerDynamicTicker, 
  DYNAMIC_TICKER_REGISTRY 
} from '../utils/calculators';
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  ArrowRightLeft, 
  HelpCircle, 
  TrendingUp, 
  Layers,
  Search,
  Globe,
  Loader2
} from 'lucide-react';

interface TickerSearchComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TickerSearchCombobox({
  value,
  onChange,
  placeholder = 'Search tickers (e.g., AAPL)...',
  className = ''
}: TickerSearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [apiResults, setApiResults] = useState<{ symbol: string; name: string; type: string }[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside with non-blocking delay when hitting external active components
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (target && (target.closest('button') || target.closest('input') || target.tagName === 'BUTTON' || target.closest('form'))) {
          // If they clicked a button or form element outside the combobox, close with a slight delay
          // so that the button's action triggers fully before the dropdown disappears and re-renders the DOM.
          setTimeout(() => {
            setIsOpen(false);
          }, 180);
          return;
        }
        setIsOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Sync text input with parent state when dropdown is NOT open
  useEffect(() => {
    if (!isOpen) {
      if (value) {
        const stats = getTickerStats(value);
        setQuery(value ? `${value} - ${stats.name}` : '');
      } else {
        setQuery('');
      }
    }
  }, [value, isOpen]);

  // Filter local & registered tickers based on query
  const localMatchResults = useMemo(() => {
    const term = query.trim().toUpperCase();
    const matches: { symbol: string; name: string; class: string; isLocal: boolean }[] = [];

    // Check pre-coded TICKER_DETAILS
    Object.keys(TICKER_DETAILS).forEach(sym => {
      const details = TICKER_DETAILS[sym];
      if (!term || sym.includes(term) || details.name.toUpperCase().includes(term)) {
        matches.push({
          symbol: sym,
          name: details.name,
          class: details.class,
          isLocal: true
        });
      }
    });

    // Check dynamically registered tickers
    Object.keys(DYNAMIC_TICKER_REGISTRY).forEach(sym => {
      const details = DYNAMIC_TICKER_REGISTRY[sym];
      if (!term || sym.includes(term) || details.name.toUpperCase().includes(term)) {
        if (!TICKER_DETAILS[sym]) {
          matches.push({
            symbol: sym,
            name: details.name,
            class: details.class,
            isLocal: false
          });
        }
      }
    });

    return matches;
  }, [query]);

  // Handle Debounced public API Search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.includes(' - ')) {
      setApiResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingApi(true);
      try {
        const encoded = encodeURIComponent(trimmed.toUpperCase());
        let quotes: any[] = [];
        
        // Server-side robust Finance search route
        try {
          const res = await fetch(`/api/search?q=${encoded}`);
          if (res.ok) {
            const data = await res.json();
            quotes = data.quotes || [];
          } else {
            console.warn(`Local server search API returned non-ok status: ${res.status}`);
          }
        } catch (e) {
          console.error("Local server search API connection failed:", e);
        }

        // Standardize output & proactively register incoming symbols
        const results = quotes
          .filter((q: any) => q && q.symbol)
          .map((q: any) => {
            const symbol = q.symbol.toUpperCase().trim();
            const name = q.shortname || q.longname || q.symbol;
            const type = q.quoteType || 'EQUITY';
            
            // Register immediately in registry so stats are available for direct clicking
            registerDynamicTicker(symbol, name, type);
            
            return { symbol, name, type };
          });

        setApiResults(results);
      } catch (err) {
        console.error("Failed to query public ticker autosuggest indexes:", err);
      } finally {
        setIsLoadingApi(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [query]);

  const stats = useMemo(() => {
    return getTickerStats(value);
  }, [value]);

  const handleSelect = (symbol: string, name: string, type?: string) => {
    const cleanSym = symbol.toUpperCase().trim();
    if (!TICKER_DETAILS[cleanSym] && !DYNAMIC_TICKER_REGISTRY[cleanSym]) {
      registerDynamicTicker(cleanSym, name, type);
    }
    onChange(cleanSym);
    setQuery(`${cleanSym} - ${name}`);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input container */}
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder={placeholder}
            value={isOpen ? query : (value ? `${value} - ${stats.name}` : '')}
            onFocus={() => {
              setIsOpen(true);
              setQuery(value);
            }}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              setIsOpen(true);
              // Update parent in real-time as they type to make certain clicking Assign holds what was typed!
              onChange(val.toUpperCase().trim());
            }}
            className="w-full bg-white border border-neutral-200 rounded-xl text-xs pl-8 pr-12 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-neutral-400 text-neutral-800"
          />
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          
          {isOpen && isLoadingApi && (
            <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          )}
        </div>
        {isOpen && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setQuery('');
              setIsOpen(false);
            }}
            className="text-[10px] text-neutral-500 hover:text-neutral-900 border px-1.5 py-1 rounded bg-neutral-50 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Dropdown Floating list */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border rounded-2xl shadow-xl max-h-72 overflow-y-auto p-2 scrollbar-thin">
          
          {/* Section: Local / Presets */}
          {localMatchResults.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest px-2.5 py-1 block">Local Ticker Index</span>
              {localMatchResults.slice(0, 8).map((match) => (
                <button
                  key={match.symbol}
                  type="button"
                  onMouseDown={() => handleSelect(match.symbol, match.name)}
                  className="w-full flex items-center justify-between text-left px-2.5 py-1.5 hover:bg-neutral-50 rounded-lg text-xs cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-neutral-800">{match.symbol}</span>
                    <span className="text-[10px] text-neutral-400 line-clamp-1">{match.name}</span>
                  </div>
                  <span className="text-[9px] font-mono text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-sm">
                    {match.class}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Section: Public Search Results */}
          {query.trim().length > 0 && (
            <div className="mt-3 border-t pt-2 space-y-1">
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest px-2.5 py-1 block">Yahoo Public Index</span>
              
              {apiResults.length === 0 && !isLoadingApi && (
                <p className="text-[10px] text-neutral-400 italic px-2.5 py-1 font-light">No public tickers found matching search query.</p>
              )}

              {apiResults.slice(0, 10).map((apiItem) => {
                // Skip duplicate rendering
                if (localMatchResults.some((m) => m.symbol === apiItem.symbol)) return null;

                return (
                  <button
                    key={apiItem.symbol}
                    type="button"
                    onMouseDown={() => handleSelect(apiItem.symbol, apiItem.name, apiItem.type)}
                    className="w-full flex items-center justify-between text-left px-2.5 py-1.5 hover:bg-neutral-50 rounded-lg text-xs cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-neutral-800 flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5 text-indigo-500 animate-pulse" />
                        {apiItem.symbol}
                      </span>
                      <span className="text-[10px] text-neutral-400 line-clamp-1">{apiItem.name}</span>
                    </div>
                    <span className="text-[9px] font-mono text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-sm uppercase">
                      {apiItem.type.substring(0, 12)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* If everything is empty */}
          {localMatchResults.length === 0 && query.trim().length === 0 && (
            <div className="p-4 text-center text-[11px] text-neutral-400 font-light">
              Type or search top stock or bond tickers (e.g., AAPL, SPY, QQQ, BTC)...
            </div>
          )}

        </div>
      )}
    </div>
  );
}

interface PortfolioCustomizerProps {
  portfolios: Portfolio[];
  onPortfoliosChange: (portfolios: Portfolio[]) => void;
  investmentsTotal: number;
}

export default function PortfolioCustomizer({
  portfolios,
  onPortfoliosChange,
  investmentsTotal
}: PortfolioCustomizerProps) {
  // Local iframe-safe state-based error system
  const [actionError, setActionError] = useState<string | null>(null);

  const showError = (message: string) => {
    setActionError(message);
    setTimeout(() => {
      setActionError(null);
    }, 4500);
  };

  // Holdings log state for rebalancing math
  const [tickerHoldings, setTickerHoldings] = useState<{ ticker: string; value: number }[]>([
    { ticker: 'VTI', value: 75000 },
    { ticker: 'VXUS', value: 15000 },
    { ticker: 'BTC', value: 8000 }
  ]);

  const [newHoldTicker, setNewHoldTicker] = useState('');
  const [newHoldVal, setNewHoldVal] = useState('');

  // Active Portfolio select
  const [activePortfolioName, setActivePortfolioName] = useState(portfolios[0]?.portfolio_name || 'Aggressive Growth');

  // Custom portfolio editing states
  const [newPortName, setNewPortName] = useState('');
  const [newTicker, setNewTicker] = useState('');
  const [newPct, setNewPct] = useState('10');

  const activePortfolio = useMemo(() => {
    return portfolios.find(p => p.portfolio_name === activePortfolioName) || portfolios[0];
  }, [portfolios, activePortfolioName]);

  const activeAllocationSum = useMemo(() => {
    if (!activePortfolio) return 0;
    return activePortfolio.allocation.reduce((sum, item) => sum + item.percentage, 0);
  }, [activePortfolio]);

  // Rebalancing details
  const rebalanceData = useMemo(() => {
    if (!activePortfolio) return { recommendations: [], trackingError: 0 };
    return calculateRebalancing(activePortfolio.allocation, tickerHoldings);
  }, [activePortfolio, tickerHoldings]);

  // Add allocation item
  const handleAddAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePortfolio || !newPct) return;
    const pct = parseInt(newPct);
    if (isNaN(pct) || pct <= 0) return;

    if (!newTicker.trim()) {
      showError('Please search or enter a valid ticker first.');
      return;
    }

    // Capture first segment if input contains a descriptive suffix (e.g. "AABXX - Name")
    let cleanTicker = newTicker.trim().toUpperCase();
    if (cleanTicker.includes(' - ')) {
      cleanTicker = cleanTicker.split(' - ')[0].trim().toUpperCase();
    }

    if (!cleanTicker) {
      showError('Please enter or select a valid ticker symbol.');
      return;
    }

    const exists = activePortfolio.allocation.find(a => a.ticker.toUpperCase() === cleanTicker);
    if (exists) {
      showError(`${cleanTicker} already exists in allocation. Edit or remove it first.`);
      return;
    }

    const stats = getTickerStats(cleanTicker);
    const item: PortfolioAllocation = {
      ticker: cleanTicker,
      percentage: pct,
      asset_class: stats.class
    };

    const nextPortfolios = portfolios.map(p => {
      if (p.portfolio_name === activePortfolio.portfolio_name) {
        return {
          ...p,
          allocation: [...p.allocation, item]
        };
      }
      return p;
    });

    onPortfoliosChange(nextPortfolios);
    
    // Clear the input fields for a highly responsive visual confirmation
    setNewTicker('');
    setNewPct('10');
  };

  const handleRemoveAllocation = (ticker: string) => {
    const nextPortfolios = portfolios.map(p => {
      if (p.portfolio_name === activePortfolio.portfolio_name) {
        return {
          ...p,
          allocation: p.allocation.filter(a => a.ticker !== ticker)
        };
      }
      return p;
    });
    onPortfoliosChange(nextPortfolios);
  };

  const handleCreatePortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortName.trim()) return;

    const exists = portfolios.find(p => p.portfolio_name.toLowerCase() === newPortName.toLowerCase());
    if (exists) {
      showError('Portfolio name already exists.');
      return;
    }

    const fresh: Portfolio = {
      portfolio_name: newPortName.trim(),
      allocation: [
        { ticker: 'VTI', percentage: 100, asset_class: 'US Equity' }
      ]
    };
    onPortfoliosChange([...portfolios, fresh]);
    setActivePortfolioName(fresh.portfolio_name);
    setNewPortName('');
  };

  const handleDeletePortfolio = (name: string) => {
    if (portfolios.length <= 1) {
      showError('You must maintain at least one portfolio design.');
      return;
    }
    const nextList = portfolios.filter(p => p.portfolio_name !== name);
    onPortfoliosChange(nextList);
    setActivePortfolioName(nextList[0].portfolio_name);
  };

  // Holdings manipulation
  const handleAddHolding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoldTicker.trim()) {
      showError('Please search or type a ticker model first.');
      return;
    }
    if (!newHoldVal) return;
    const value = parseFloat(newHoldVal);
    if (isNaN(value) || value < 0) return;

    let upperClass = newHoldTicker.toUpperCase().trim();
    if (upperClass.includes(' - ')) {
      upperClass = upperClass.split(' - ')[0].trim().toUpperCase();
    }

    if (!upperClass) {
      showError('Please enter a valid ticker symbol.');
      return;
    }

    const exists = tickerHoldings.find(h => h.ticker === upperClass);
    if (exists) {
      setTickerHoldings(tickerHoldings.map(h => h.ticker === upperClass ? { ...h, value } : h));
    } else {
      setTickerHoldings([...tickerHoldings, { ticker: upperClass, value }]);
    }
    
    // Clear holds input on success
    setNewHoldTicker('');
    setNewHoldVal('');
  };

  const handleDeleteHolding = (ticker: string) => {
    setTickerHoldings(tickerHoldings.filter(h => h.ticker !== ticker));
  };


  // Custom Pie Chart SVG coordinates generator
  const pieSectors = useMemo(() => {
    if (!activePortfolio || activePortfolio.allocation.length === 0) return [];
    
    // Normalize percentages to total value if not summing exactly to 100
    const sum = activePortfolio.allocation.reduce((s, i) => s + i.percentage, 0) || 100;
    
    let cumulativeAngle = 0;
    const r = 70; // radius
    const cx = 100; // center X
    const cy = 100; // center Y

    const colors = [
      '#10b981', // emerald-500
      '#3b82f6', // blue-500
      '#6366f1', // indigo-500
      '#f59e0b', // amber-500
      '#ec4899', // pink-500
      '#8b5cf6', // violet-500
      '#14b8a6', // teal-500
    ];

    return activePortfolio.allocation.map((alloc, idx) => {
      const percentage = (alloc.percentage / sum) * 100;
      const angle = (alloc.percentage / sum) * 360;
      
      // Calculate start and end SVG points
      const radStart = (cumulativeAngle - 90) * Math.PI / 180;
      const xStart = cx + r * Math.cos(radStart);
      const yStart = cy + r * Math.sin(radStart);

      cumulativeAngle += angle;

      const radEnd = (cumulativeAngle - 90) * Math.PI / 180;
      const xEnd = cx + r * Math.cos(radEnd);
      const yEnd = cy + r * Math.sin(radEnd);

      const largeArc = angle > 180 ? 1 : 0;

      // SVG path definition
      const pathData = `
        M ${cx} ${cy}
        L ${xStart} ${yStart}
        A ${r} ${r} 0 ${largeArc} 1 ${xEnd} ${yEnd}
        Z
      `;

      return {
        ticker: alloc.ticker,
        percent: Math.round(percentage),
        path: pathData,
        color: colors[idx % colors.length]
      };
    });
  }, [activePortfolio]);

  return (
    <div className="space-y-8" id="portfolio-allocator-panel">
      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-3 rounded-2xl flex items-start gap-2 animate-fade-in shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span className="font-medium">{actionError}</span>
        </div>
      )}

      {/* Portfolio Navigator */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-mono font-medium text-neutral-400 uppercase tracking-wider">Passive Portfolio Matching</span>
          <h2 className="text-xl font-bold font-sans text-neutral-900">Custom Target Portfolio Mixes</h2>
          <p className="text-xs text-neutral-400 font-light">Structure theoretical portfolios, calculate tracking errors, and see recommendations.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {portfolios.map(p => (
            <div key={p.portfolio_name} className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl border">
              <button
                onClick={() => setActivePortfolioName(p.portfolio_name)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  activePortfolioName === p.portfolio_name 
                    ? 'bg-neutral-900 text-white shadow-md' 
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {p.portfolio_name}
              </button>
              {portfolios.length > 1 && (
                <button
                  onClick={() => handleDeletePortfolio(p.portfolio_name)}
                  className="p-1 text-neutral-400 hover:text-rose-600 font-light text-xs rounded"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Target allocation construction */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Allocator Table & SVG Mix Pie - Span 7 */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Targets Configuration</h3>
              <p className="text-xs text-neutral-400 font-light">Establish target percentage splits. Sum should ideally be 100%.</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
              activeAllocationSum === 100 
                ? 'bg-emerald-50 text-emerald-800' 
                : 'bg-amber-50 text-amber-800'
            }`}>
              Sum: {activeAllocationSum}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* SVG Pie Representation */}
            <div className="md:col-span-5 flex flex-col items-center">
              {pieSectors.length === 0 ? (
                <div className="w-40 h-40 rounded-full bg-neutral-50 border border-dashed flex items-center justify-center text-xs text-neutral-400 text-center p-4">
                  Add tickers below to output target pie allocation.
                </div>
              ) : (
                <div className="relative w-44 h-44">
                  <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                    {pieSectors.map((s, idx) => (
                      <path
                        key={idx}
                        d={s.path}
                        fill={s.color}
                        className="transition-all duration-300 hover:opacity-90 stroke-white stroke-2"
                      />
                    ))}
                    {/* Inner donut cut */}
                    <circle cx="100" cy="100" r="40" fill="white" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-mono uppercase text-neutral-400">Class Mix</span>
                    <span className="text-xs font-mono font-bold text-neutral-800">{pieSectors.length} Assets</span>
                  </div>
                </div>
              )}
            </div>

            {/* List details */}
            <div className="md:col-span-7 space-y-3">
              <span className="text-xs font-mono text-neutral-400 block uppercase">Target Assets Grid</span>
              
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {activePortfolio?.allocation.map(alloc => {
                  const matchingSector = pieSectors.find(s => s.ticker === alloc.ticker);
                  return (
                    <div key={alloc.ticker} className="flex items-center justify-between p-2.5 border rounded-xl hover:bg-neutral-50/50">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block animate-pulse" style={{ backgroundColor: matchingSector?.color || '#eaeaea' }} />
                        <div>
                          <span className="text-sm font-semibold text-neutral-900">{alloc.ticker}</span>
                          <span className="text-[10px] text-neutral-400 block font-light">{alloc.asset_class}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono font-bold text-neutral-800">{alloc.percentage}%</span>
                        <button
                          onClick={() => handleRemoveAllocation(alloc.ticker)}
                          className="text-neutral-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Quick allocate target asset form */}
          <form onSubmit={handleAddAllocation} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-neutral-50 p-4 border rounded-2xl items-end">
            <div className="md:col-span-6 space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Ticker / Asset (Local or Web Search)</span>
              <TickerSearchCombobox
                value={newTicker}
                onChange={setNewTicker}
                placeholder="Type ticker (e.g., AAPL, SPY, VOO)..."
              />
            </div>

            <div className="md:col-span-3 space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 uppercase">Target Allocation (%)</span>
              <input
                type="number"
                min="1"
                max="100"
                value={newPct}
                onChange={e => setNewPct(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded-xl text-xs px-2.5 py-1.5 text-right font-mono focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
              />
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-mono font-medium cursor-pointer transition-all flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Assign</span>
              </button>
            </div>
          </form>

          {/* Create new blank portfolio mix design */}
          <form onSubmit={handleCreatePortfolio} className="pt-4 border-t border-dashed flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-neutral-800">Design Secondary Strategy Portfolio</h4>
              <p className="text-[10px] text-neutral-400 font-light">Structure a secondary allocation to project comparative performance (e.g. Traditional Bond Index).</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Conservative Bonds..."
                value={newPortName}
                onChange={e => setNewPortName(e.target.value)}
                className="bg-white border rounded-lg text-xs px-2.5 py-1.5 focus:outline-hidden font-light"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-neutral-950 text-white rounded-lg text-xs font-mono font-medium hover:bg-neutral-800 cursor-pointer"
              >
                Create Mix
              </button>
            </div>
          </form>

        </div>

        {/* rebalancing & actual holdings comparison - Span 5 */}
        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-neutral-900">Drift & Rebalancing Math</h3>
              <p className="text-xs text-neutral-400 mt-1 font-light">
                Compares your custom holdings directly to targets. 
                <span className="font-semibold block text-neutral-800 mt-1">
                  Active Asset Tracking Error: {rebalanceData.trackingError}%
                </span>
              </p>
            </div>

            {/* Holdings Ledger Values */}
            <div className="space-y-3.5">
              <span className="text-xs font-mono text-neutral-400 block uppercase">Log Held Assets Balance</span>
              
              <form onSubmit={handleAddHolding} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6">
                  <span className="text-[10px] font-mono text-neutral-400 block mb-1 uppercase">Ticker Asset</span>
                  <TickerSearchCombobox
                    value={newHoldTicker}
                    onChange={setNewHoldTicker}
                    placeholder="Search holdings..."
                  />
                </div>
                <div className="col-span-4">
                  <span className="text-[10px] font-mono text-neutral-400 block mb-1 uppercase">Holding Value ($)</span>
                  <input
                    type="number"
                    placeholder="Value $"
                    value={newHoldVal}
                    onChange={e => setNewHoldVal(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg text-xs px-2.5 py-1 text-right font-mono focus:outline-hidden"
                  />
                </div>
                <button type="submit" className="col-span-2 py-1.5 bg-neutral-900 text-white rounded-lg text-xs flex items-center justify-center cursor-pointer hover:bg-neutral-800 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                </button>
              </form>

              {/* Editable listings */}
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {tickerHoldings.map(h => (
                  <div key={h.ticker} className="flex justify-between items-center text-xs p-2 border rounded-lg hover:bg-neutral-50">
                    <div>
                      <span className="font-semibold text-neutral-800">{h.ticker}</span>
                      <span className="text-[10px] text-neutral-400 block">Holding Value</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-neutral-900">${h.value.toLocaleString()}</span>
                      <button onClick={() => handleDeleteHolding(h.ticker)} className="text-neutral-400 hover:text-rose-600 block">
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Trade actions to hit targets! */}
          <div className="bg-neutral-50 p-4 border rounded-2xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
              <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
              <span>Recommended Trades to Hit Allocations</span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {rebalanceData.recommendations.map(rec => {
                if (rec.action === 'Hold') return null;
                return (
                  <div key={rec.ticker} className="flex justify-between items-center text-xs">
                    <span className="text-neutral-600 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${rec.action === 'Buy' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {rec.action === 'Buy' ? 'Buy' : 'Sell'} {rec.ticker}:
                    </span>
                    <span className={`font-mono font-bold ${rec.action === 'Buy' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {rec.action === 'Buy' ? '+' : '-'}${Math.abs(rec.differenceValue).toLocaleString()}
                    </span>
                  </div>
                );
              })}
              {rebalanceData.recommendations.filter(r => r.action !== 'Hold').length === 0 && (
                <p className="text-[10px] text-neutral-400 text-center font-light leading-relaxed">
                  Portfolio holding alignments are in perfect sync with target allocations. Tracking error <span className="font-medium">{"< 1%"}</span>.
                </p>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
