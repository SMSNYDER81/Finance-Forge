import React, { useState, useMemo } from 'react';
import { Portfolio, PortfolioAllocation } from '../types';
import { 
  getTickerStats, 
  TICKER_DETAILS, 
  randomNormal, 
  calculatePortfolioStats 
} from '../utils/calculators';
import { TickerSearchCombobox } from './PortfolioCustomizer';
import { 
  LineChart as LineChartIcon, 
  TrendingUp, 
  HelpCircle, 
  PlayCircle, 
  Activity, 
  User, 
  DollarSign, 
  Calendar,
  AlertTriangle,
  FlameKindling,
  Printer,
  ChevronRight,
  Plus,
  Trash2,
  Settings2,
  Lock,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';

interface TimeHorizonEngineProps {
  portfolios: Portfolio[];
  totalEquity: number;
  annualSpendingTarget: number;
  onPortfoliosChange?: (portfolios: Portfolio[]) => void;
}

export default function TimeHorizonEngine({
  portfolios,
  totalEquity,
  annualSpendingTarget,
  onPortfoliosChange
}: TimeHorizonEngineProps) {
  // Primary Parameters State
  const [startingWealth, setStartingWealth] = useState<number>(totalEquity > 0 ? totalEquity : 85000);
  const [currentAge, setCurrentAge] = useState<number>(32);
  const [targetRetirementAge, setTargetRetirementAge] = useState<number>(60);
  const [annualContribution, setAnnualContribution] = useState<number>(15000);
  const [annualSpend, setAnnualSpend] = useState<number>(annualSpendingTarget || 75000);
  const [timelineYears, setTimelineYears] = useState<number>(35); // 5 to 50 years
  
  // Advanced variables
  const [contributionGrowthRate, setContributionGrowthRate] = useState<number>(2.5); // Wage inflation growth % for contributions

  // Mode select
  const [engineMode, setEngineMode] = useState<'deterministic' | 'montecarlo'>('montecarlo');

  // Interactive editing overrides for ticker returns and volatilities on-the-fly
  const [tickerReturnOverrides, setTickerReturnOverrides] = useState<Record<string, number>>({});
  const [tickerVolOverrides, setTickerVolOverrides] = useState<Record<string, number>>({});

  // Active Portfolio select for Monte Carlo & detailed inline adjustments
  const [activePortName, setActivePortName] = useState(portfolios[0]?.portfolio_name || 'Aggressive Growth');

  const activePortfolio = useMemo(() => {
    return portfolios.find(p => p.portfolio_name === activePortName) || portfolios[0];
  }, [portfolios, activePortName]);

  // Asset search inputs for quick allocation modification
  const [newAssetTicker, setNewAssetTicker] = useState('');
  const [newAssetPct, setNewAssetPct] = useState('10');

  // Trigger global change update
  const syncPortAllocation = (newAlloc: PortfolioAllocation[]) => {
    if (!activePortfolio) return;
    const updated = portfolios.map(p => {
      if (p.portfolio_name === activePortfolio.portfolio_name) {
        return {
          ...p,
          allocation: newAlloc
        };
      }
      return p;
    });
    if (onPortfoliosChange) {
      onPortfoliosChange(updated);
    }
  };

  // Inline allocation changes
  const handleUpdatePercentage = (ticker: string, pct: number) => {
    if (!activePortfolio) return;
    const nextAlloc = activePortfolio.allocation.map(a => {
      if (a.ticker === ticker) {
        return { ...a, percentage: pct };
      }
      return a;
    });
    syncPortAllocation(nextAlloc);
  };

  const handleRemoveAsset = (ticker: string) => {
    if (!activePortfolio) return;
    const nextAlloc = activePortfolio.allocation.filter(a => a.ticker !== ticker);
    syncPortAllocation(nextAlloc);
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetTicker.trim()) return;

    let cleanSym = newAssetTicker.trim().toUpperCase();
    if (cleanSym.includes(' - ')) {
      cleanSym = cleanSym.split(' - ')[0].trim().toUpperCase();
    }

    if (!activePortfolio) return;

    const exists = activePortfolio.allocation.find(a => a.ticker === cleanSym);
    if (exists) return;

    const stats = getTickerStats(cleanSym);
    const percentage = parseInt(newAssetPct) || 10;

    const nextAlloc = [...activePortfolio.allocation, {
      ticker: cleanSym,
      percentage,
      asset_class: stats.class
    }];

    syncPortAllocation(nextAlloc);
    setNewAssetTicker('');
    setNewAssetPct('10');
  };

  // Direct Ticker parameter overrides
  const handleOverrideReturn = (ticker: string, rateVal: string) => {
    const parsed = parseFloat(rateVal);
    const upper = ticker.toUpperCase().trim();
    if (!isNaN(parsed)) {
      setTickerReturnOverrides(prev => ({ ...prev, [upper]: parsed / 100 }));
    } else if (rateVal === '') {
      const next = { ...tickerReturnOverrides };
      delete next[upper];
      setTickerReturnOverrides(next);
    }
  };

  const handleOverrideVolatility = (ticker: string, volVal: string) => {
    const parsed = parseFloat(volVal);
    const upper = ticker.toUpperCase().trim();
    if (!isNaN(parsed)) {
      setTickerVolOverrides(prev => ({ ...prev, [upper]: parsed / 100 }));
    } else if (volVal === '') {
      const next = { ...tickerVolOverrides };
      delete next[upper];
      setTickerVolOverrides(next);
    }
  };

  // Re-run completely with overridden performance metrics
  const localCalculatePortfolioStats = (portfolio: Portfolio) => {
    if (!portfolio || !portfolio.allocation) return { expectedReturn: 0.08, volatility: 0.15 };
    
    let weightedReturn = 0;
    let weightedVolatility = 0;
    let totalPct = 0;

    portfolio.allocation.forEach(alloc => {
      const tickerUpper = alloc.ticker.toUpperCase().trim();
      const stats = getTickerStats(alloc.ticker);
      
      const rate = tickerReturnOverrides[tickerUpper] !== undefined 
        ? tickerReturnOverrides[tickerUpper] 
        : stats.return;

      const volatility = tickerVolOverrides[tickerUpper] !== undefined 
        ? tickerVolOverrides[tickerUpper] 
        : stats.volatility;

      const weight = alloc.percentage / 100;
      weightedReturn += rate * weight;
      weightedVolatility += volatility * weight;
      totalPct += alloc.percentage;
    });

    if (totalPct > 0) {
      const scale = 100 / totalPct;
      weightedReturn *= scale;
      weightedVolatility *= scale;
    }

    return {
      expectedReturn: weightedReturn,
      volatility: weightedVolatility
    };
  };

  const activeAllocationSum = useMemo(() => {
    if (!activePortfolio) return 0;
    return activePortfolio.allocation.reduce((sum, item) => sum + item.percentage, 0);
  }, [activePortfolio]);

  // Compute stats of active portfolio
  const activeStats = useMemo(() => {
    if (!activePortfolio) return { expectedReturn: 0.08, volatility: 0.15 };
    return localCalculatePortfolioStats(activePortfolio);
  }, [activePortfolio, tickerReturnOverrides, tickerVolOverrides]);

  // Handle local parameter reset triggers
  const handleSyncWithLedger = () => {
    if (totalEquity > 0) {
      setStartingWealth(totalEquity);
    }
  };

  // 1. DETERMINISTIC CALCULATIONS (Linear trajectory comparison of all portfolios)
  const deterministicResult = useMemo(() => {
    const years = Array.from({ length: timelineYears + 1 }, (_, i) => currentAge + i);
    const lines: Record<string, number[]> = {};

    portfolios.forEach(p => {
      const stats = localCalculatePortfolioStats(p);
      const r = stats.expectedReturn;
      const wealthPath: number[] = [startingWealth];
      let currentWealth = startingWealth;

      for (let y = 1; y <= timelineYears; y++) {
        const yearAge = currentAge + y - 1;
        const isRetired = yearAge >= targetRetirementAge;
        
        // Income index adjusted for contribution inflation growth
        const scaleIndex = Math.pow(1 + contributionGrowthRate / 100, Math.min(y - 1, targetRetirementAge - currentAge));
        const contribution = isRetired ? 0 : annualContribution * scaleIndex;
        const draw = isRetired ? annualSpend : 0;

        currentWealth = currentWealth * (1 + r) + contribution - draw;
        if (currentWealth < 0) currentWealth = 0;
        wealthPath.push(Math.round(currentWealth));
      }
      lines[p.portfolio_name] = wealthPath;
    });

    return { years, lines };
  }, [portfolios, startingWealth, annualContribution, targetRetirementAge, currentAge, timelineYears, contributionGrowthRate, tickerReturnOverrides, tickerVolOverrides, annualSpend]);

  // 2. MONTE CARLO CALCULATIONS (Stochastic trials on active portfolio)
  const mcResult = useMemo(() => {
    if (!activePortfolio) return null;
    
    const stats = activeStats;
    const mu = stats.expectedReturn;
    const sigma = stats.volatility;

    const yearsToPlan = Math.max(timelineYears, 95 - currentAge);
    const numTrials = 10000;
    
    // Allocate rows/cols
    const wealthGrid: Float32Array[] = Array.from({ length: numTrials }, () => new Float32Array(yearsToPlan + 1));
    for (let t = 0; t < numTrials; t++) {
      wealthGrid[t][0] = startingWealth;
    }

    for (let y = 1; y <= yearsToPlan; y++) {
      const yearAge = currentAge + y - 1;
      const isRetired = yearAge >= targetRetirementAge;
      
      const scaleIndex = Math.pow(1 + contributionGrowthRate / 100, Math.min(y - 1, targetRetirementAge - currentAge));
      const netCashFlow = isRetired ? -annualSpend : annualContribution * scaleIndex;

      for (let t = 0; t < numTrials; t++) {
        const priorWealth = wealthGrid[t][y - 1];
        if (priorWealth <= 0) {
          wealthGrid[t][y] = 0;
          continue;
        }

        const randomShock = randomNormal();
        const organicReturn = Math.exp((mu - 0.5 * sigma * sigma) + sigma * randomShock);
        let newWealth = priorWealth * organicReturn + netCashFlow;
        
        if (newWealth < 0) {
          newWealth = 0;
        }
        wealthGrid[t][y] = newWealth;
      }
    }

    const years = Array.from({ length: yearsToPlan + 1 }, (_, i) => currentAge + i);
    const p10: number[] = [];
    const p50: number[] = [];
    const p90: number[] = [];
    let successfulTrialsAtEnd = 0;

    for (let y = 0; y <= yearsToPlan; y++) {
      const yearWealths = new Float32Array(numTrials);
      for (let t = 0; t < numTrials; t++) {
        yearWealths[t] = wealthGrid[t][y];
      }
      yearWealths.sort();

      p10.push(Math.round(yearWealths[Math.floor(numTrials * 0.10)]));
      p50.push(Math.round(yearWealths[Math.floor(numTrials * 0.50)]));
      p90.push(Math.round(yearWealths[Math.floor(numTrials * 0.90)]));

      // Calculate success rate at targeted retirement plan end (Life expectancy of 95)
      if (y === (95 - currentAge) || y === yearsToPlan) {
        successfulTrialsAtEnd = 0;
        for (let t = 0; t < numTrials; t++) {
          if (wealthGrid[t][y] > 0) {
            successfulTrialsAtEnd++;
          }
        }
      }
    }

    const successRate = (successfulTrialsAtEnd / numTrials) * 100;

    return {
      years,
      percentile10: p10,
      percentile50: p50,
      percentile90: p90,
      successRate: Math.round(successRate * 10) / 10
    };
  }, [activePortfolio, activeStats, startingWealth, currentAge, targetRetirementAge, annualContribution, annualSpend, timelineYears, contributionGrowthRate]);

  // Hover tracker for interactive chart rendering
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // SVG dimensions
  const chartHeight = 220;
  const chartWidth = 560;
  const padding = { top: 20, right: 30, bottom: 30, left: 70 };

  const plotData = useMemo(() => {
    if (engineMode === 'deterministic') {
      const data = deterministicResult;
      const xLength = data.years.length;
      
      let maxVal = 150000;
      Object.keys(data.lines).forEach(name => {
        const arr = data.lines[name];
        const localMax = Math.max(...arr);
        if (localMax > maxVal) maxVal = localMax;
      });

      maxVal = maxVal * 1.1;

      const linePaths: Record<string, string> = {};
      Object.keys(data.lines).forEach(name => {
        const points = data.lines[name];
        const coordinates = points.map((val, idx) => {
          const x = padding.left + (idx / (xLength - 1)) * (chartWidth - padding.left - padding.right);
          const y = chartHeight - padding.bottom - (val / maxVal) * (chartHeight - padding.top - padding.bottom);
          return { x, y };
        });

        let pathStr = `M ${coordinates[0].x} ${coordinates[0].y}`;
        for (let i = 1; i < coordinates.length; i++) {
          pathStr += ` L ${coordinates[i].x} ${coordinates[i].y}`;
        }
        linePaths[name] = pathStr;
      });

      return { maxVal, linePaths, years: data.years, lines: data.lines, xLength };
    } else {
      if (!mcResult) return null;
      const data = mcResult;
      // Slice McResult to fit current dynamic timelineYears on screen chart
      const xLength = timelineYears + 1;
      const activeYears = data.years.slice(0, xLength);
      const activeP10 = data.percentile10.slice(0, xLength);
      const activeP50 = data.percentile50.slice(0, xLength);
      const activeP90 = data.percentile90.slice(0, xLength);

      let maxVal = Math.max(...activeP90) || 150000;
      maxVal = maxVal * 1.1;

      const path10 = activeP10.map((val, idx) => {
        const x = padding.left + (idx / (xLength - 1)) * (chartWidth - padding.left - padding.right);
        const y = chartHeight - padding.bottom - (val / maxVal) * (chartHeight - padding.top - padding.bottom);
        return { x, y };
      });

      const path50 = activeP50.map((val, idx) => {
        const x = padding.left + (idx / (xLength - 1)) * (chartWidth - padding.left - padding.right);
        const y = chartHeight - padding.bottom - (val / maxVal) * (chartHeight - padding.top - padding.bottom);
        return { x, y };
      });

      const path90 = activeP90.map((val, idx) => {
        const x = padding.left + (idx / (xLength - 1)) * (chartWidth - padding.left - padding.right);
        const y = chartHeight - padding.bottom - (val / maxVal) * (chartHeight - padding.top - padding.bottom);
        return { x, y };
      });

      let pathStr10 = `M ${path10[0].x} ${path10[0].y}`;
      let pathStr50 = `M ${path50[0].x} ${path50[0].y}`;
      let pathStr90 = `M ${path90[0].x} ${path90[0].y}`;

      for (let i = 1; i < xLength; i++) {
        pathStr10 += ` L ${path10[i].x} ${path10[i].y}`;
        pathStr50 += ` L ${path50[i].x} ${path50[i].y}`;
        pathStr90 += ` L ${path90[i].x} ${path90[i].y}`;
      }

      return {
        maxVal,
        pathStr10,
        pathStr50,
        pathStr90,
        years: activeYears,
        lines: { 'Unfavorable P10': activeP10, 'Median P50': activeP50, 'Favorable P90': activeP90 },
        xLength
      };
    }
  }, [engineMode, deterministicResult, mcResult, timelineYears]);

  // Yearly print summary breakdown table elements for key ages
  const printMilestones = useMemo(() => {
    if (!activePortfolio) return [];
    const r = activeStats.expectedReturn;
    
    const milestones = [];
    let currentWealth = startingWealth;
    let cumulativeContributions = 0;
    
    const terminalAge = 90;
    const yearsToPlan = terminalAge - currentAge;
    
    for (let y = 0; y <= yearsToPlan; y++) {
      const age = currentAge + y;
      const isRetired = age >= targetRetirementAge;
      
      const scaleIndex = Math.pow(1 + contributionGrowthRate / 105, Math.min(y, targetRetirementAge - currentAge));
      const chunkContribute = isRetired ? 0 : annualContribution * scaleIndex;
      const chunkWithdraw = isRetired ? annualSpend : 0;
      
      if (y > 0) {
        currentWealth = currentWealth * (1 + r) + chunkContribute - chunkWithdraw;
        if (currentWealth < 0) currentWealth = 0;
        cumulativeContributions += chunkContribute;
      }

      // Filter key milestone checkpoints to render on physical printout cleanly
      // Current age, every 5 years inside timeline, Retirement Target year, and Age 85/90
      const isCheckPt = y === 0 || 
                        age === targetRetirementAge || 
                        age === terminalAge ||
                        (age % 5 === 0 && age < targetRetirementAge + 15) || 
                        age === 80;

      if (isCheckPt) {
        milestones.push({
          age,
          wealth: Math.round(currentWealth),
          contributions: Math.round(cumulativeContributions),
          status: isRetired ? 'Retired (Distributing)' : 'Accumulation (Saving)'
        });
      }
    }
    return milestones;
  }, [activePortfolio, activeStats, currentAge, targetRetirementAge, startingWealth, annualContribution, annualSpend, contributionGrowthRate]);

  const handlePrintBlueprint = () => {
    window.print();
  };

  return (
    <div className="space-y-8" id="horizon-planner-panel">
      
      {/* 1. PROFESSIONAL PRINT LAYOUT SHEET Overlay - ONLY visible when printing */}
      <div className="hidden print:block bg-white text-neutral-900 p-8 max-w-4xl mx-auto space-y-8 font-sans">
        
        {/* Print prestige border top */}
        <div className="w-full h-1.5 bg-neutral-900 mb-2" />

        <div className="flex justify-between items-start border-b border-neutral-300 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 font-sans tracking-tight uppercase">Lifetime Wealth Simulation Blueprint</h1>
            <p className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 mt-1">
              Simulated Financial Performance and Strategic Projections
            </p>
          </div>
          <div className="text-right font-mono text-[10px] text-neutral-500 space-y-1">
            <div>Owner: <span className="font-semibold text-neutral-800">ssnyder1681@gmail.com</span></div>
            <div>Generated: <span className="text-neutral-800">2026-05-28</span></div>
            <div>Software: <span className="text-neutral-800">FinanceForge Lifecycle v1.1</span></div>
          </div>
        </div>

        {/* Client Profile Parameters Summary Block */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-250 text-xs">
          <div>
            <span className="text-[9px] font-mono text-neutral-400 block uppercase font-bold">Planned Initial Capital</span>
            <span className="font-semibold text-neutral-900 font-mono text-sm">${startingWealth.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[9px] font-mono text-neutral-400 block uppercase font-bold">Lifecycle Milestone</span>
            <span className="font-semibold text-neutral-900 text-sm">Age {currentAge} &rarr; Age {targetRetirementAge}</span>
          </div>
          <div>
            <span className="text-[9px] font-mono text-neutral-400 block uppercase font-bold">Savings Contribution</span>
            <span className="font-semibold text-neutral-900 font-mono text-sm">${annualContribution.toLocaleString()}/yr</span>
            <span className="text-[9px] text-neutral-500 block font-light">Growing @ +{contributionGrowthRate}% annually</span>
          </div>
          <div>
            <span className="text-[9px] font-mono text-neutral-400 block uppercase font-bold">Retirement Outflows</span>
            <span className="font-semibold text-rose-750 text-rose-700 font-mono text-sm">${annualSpend.toLocaleString()}/yr</span>
          </div>
        </div>

        {/* Selected Portfolio Allocation & Expected Returns */}
        {activePortfolio && (
          <div className="space-y-3 border border-neutral-200/80 rounded-xl p-5">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-neutral-800">
                Active Tactical Asset Strategy: {activePortfolio.portfolio_name}
              </h3>
              <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                Expected Return: {(activeStats.expectedReturn * 100).toFixed(2)}% | Volatility: {(activeStats.volatility * 100).toFixed(2)}%
              </span>
            </div>
            
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b uppercase font-mono text-[9px] text-neutral-400 font-bold">
                  <th className="py-1">Asset Code</th>
                  <th className="py-1 text-center">Weight</th>
                  <th className="py-1 text-right">Raw Expected return</th>
                  <th className="py-1 text-right">Historical Volatility</th>
                  <th className="py-1 text-right">Total Net Return Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {activePortfolio.allocation.map(alloc => {
                  const stats = getTickerStats(alloc.ticker);
                  const rate = tickerReturnOverrides[alloc.ticker.toUpperCase()] !== undefined 
                    ? tickerReturnOverrides[alloc.ticker.toUpperCase()] 
                    : stats.return;
                  const vol = tickerVolOverrides[alloc.ticker.toUpperCase()] !== undefined 
                    ? tickerVolOverrides[alloc.ticker.toUpperCase()] 
                    : stats.volatility;
                  const contribution = (rate * (alloc.percentage / 100)) * 100;
                  return (
                    <tr key={alloc.ticker}>
                      <td className="py-1.5 font-bold">{alloc.ticker} <span className="text-neutral-450 text-[9px] font-normal font-sans">({alloc.asset_class})</span></td>
                      <td className="py-1.5 text-center font-mono">{alloc.percentage}%</td>
                      <td className="py-1.5 text-right font-mono">{(rate * 100).toFixed(1)}%</td>
                      <td className="py-1.5 text-right font-mono">{(vol * 100).toFixed(1)}%</td>
                      <td className="py-1.5 text-right font-mono font-bold text-neutral-700">+{contribution.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* High Resolution Printable Plot */}
        <div className="space-y-2 border border-neutral-200 rounded-xl p-5">
          <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-neutral-800">
            Simulated Wealth Accumulation Trajectory Model ({engineMode === 'montecarlo' ? 'Stochastic' : 'Linear'})
          </h3>
          {plotData && (
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-64 overflow-visible">
              {/* Grid lines horizontal */}
              {[0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => {
                const y = chartHeight - padding.bottom - ratio * (chartHeight - padding.top - padding.bottom);
                const val = ratio * plotData.maxVal;
                return (
                  <g key={i}>
                    <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} className="stroke-neutral-200 stroke-1 stroke-dasharray-[2,2]" />
                    <text x={padding.left - 8} y={y + 3} textAnchor="end" className="font-mono text-[9px] fill-neutral-500">
                      ${Math.round(val / 1000).toLocaleString() + 'k'}
                    </text>
                  </g>
                );
              })}

              {/* Vertical grids */}
              {plotData.years.map((year, idx) => {
                if (idx % Math.ceil(plotData.xLength / 5) !== 0 && idx !== plotData.xLength - 1) return null;
                const x = padding.left + (idx / (plotData.xLength - 1)) * (chartWidth - padding.left - padding.right);
                return (
                  <g key={idx}>
                    <line x1={x} y1={chartHeight - padding.bottom} x2={x} y2={padding.top} className="stroke-neutral-100 stroke-1" />
                    <text x={x} y={chartHeight - padding.bottom + 12} textAnchor="middle" className="font-mono text-[9px] fill-neutral-500">
                      Age {year}
                    </text>
                  </g>
                );
              })}

              {/* Paths representing lines - stylized in solid black & dark greys for perfect black and white prints */}
              {engineMode === 'deterministic' ? (
                Object.keys(plotData.lines).map((name, i) => (
                  <path
                    key={name}
                    d={plotData.linePaths[name]}
                    fill="none"
                    className="stroke-neutral-900 stroke-3 stroke-linejoin-round"
                    style={{ strokeDasharray: i === 1 ? '4,4' : i === 2 ? '1,2' : undefined }}
                  />
                ))
              ) : (
                <>
                  {/* Monte Carlo paths */}
                  <path d={plotData.pathStr90} fill="none" className="stroke-neutral-800 stroke-3 stroke-linejoin-round" style={{ strokeDasharray: '3,3' }} />
                  <path d={plotData.pathStr50} fill="none" className="stroke-neutral-950 stroke-4 stroke-linejoin-round" />
                  <path d={plotData.pathStr10} fill="none" className="stroke-neutral-550 stroke-3 stroke-linejoin-round" style={{ strokeDasharray: '1,1' }} />
                </>
              )}
            </svg>
          )}
          
          <div className="text-[10px] font-mono text-neutral-500 flex justify-center gap-6 pt-1 border-t">
            {engineMode === 'deterministic' ? (
              portfolios.map((p, idx) => (
                <div key={p.portfolio_name} className="flex items-center gap-1">
                  <span className="font-bold">Line {idx + 1}:</span>
                  <span>{p.portfolio_name}</span>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-neutral-950 inline-block" />
                  <span>Median Target Path (50th percentile)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-neutral-800 stroke-dasharray-[3,3] inline-block" style={{ borderBottom: '2px dashed #404040' }} />
                  <span>Optmistic Favorable Path (90th percentile)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-neutral-600 inline-block" style={{ borderBottom: '2px dotted #737373' }} />
                  <span>Unfavorable Risk Path (10th percentile)</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Milestone ledger sheet */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-neutral-800">
            Year-by-Year Strategic Blueprint Ledger Milestones ({activePortfolio?.portfolio_name})
          </h3>
          <table className="w-full text-left text-[11px] border">
            <thead>
              <tr className="bg-neutral-100 font-mono text-[9px] uppercase font-bold text-neutral-600 border-b">
                <th className="p-2">Age Year</th>
                <th className="p-2">Phase Indicator</th>
                <th className="p-2 text-right">Cumulative Net Capital Contributions</th>
                <th className="p-2 text-right font-bold">Projected Future Capital Value</th>
              </tr>
            </thead>
            <tbody className="divide-y text-neutral-700">
              {printMilestones.map(m => (
                <tr key={m.age}>
                  <td className="p-2 font-semibold font-mono text-neutral-900">Age {m.age}</td>
                  <td className="p-2">
                    <span className="text-[10px]">
                      {m.age >= targetRetirementAge ? 'Retired (Outflows Mode)' : 'Accumulation (Savings Mode)'}
                    </span>
                  </td>
                  <td className="p-2 text-right font-mono">${m.contributions.toLocaleString()}</td>
                  <td className="p-2 text-right font-mono font-bold text-neutral-900">${m.wealth.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signature lines & compliance block */}
        <div className="pt-8 border-t border-dashed border-neutral-300">
          <div className="grid grid-cols-2 gap-8 text-[11px] font-mono leading-relaxed">
            <div className="space-y-4">
              <div>Authorized Blueprint Signature Row:</div>
              <div className="border-b border-neutral-900 w-full h-8" />
              <div className="text-[9px] text-neutral-400">Plan Owner (ssnyder1681@gmail.com)</div>
            </div>
            <div className="space-y-4">
              <div>Review Advisor Date:</div>
              <div className="border-b border-neutral-900 w-full h-8" />
              <div className="text-[9px] text-neutral-400">Execution Date & Certification</div>
            </div>
          </div>
          
          <p className="text-[8px] text-neutral-400 leading-normal text-center mt-8 font-sans max-w-2xl mx-auto">
            <strong>Disclosure Notice:</strong> Simulations and performance indices reflect statistical historical estimates only. Market volatility is unpredictable. These scenarios run deterministic mathematical algorithms and stochastic variables which are not guarantees of future outcomes. This report does not constitute fee-based professional financial advice.
          </p>
        </div>

      </div>

      {/* 2. ON-SCREEN USER INTERFACE WORKSPACE (All elements hidden under print command) */}
      <div className="space-y-8 print:hidden">

        {/* Projections top controller header card */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-neutral-900 rounded-full" />
              <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase font-semibold">Projections Blueprint Node</span>
            </div>
            <h2 className="text-xl font-bold font-sans text-neutral-900">Time Horizon & Projection Simulations</h2>
            <p className="text-xs text-neutral-400 font-light">
              Interactive timeline testing, stochastics, inflation contribution factors, and direct allocation controls.
            </p>
          </div>

          <button
            onClick={handlePrintBlueprint}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-mono font-medium transition-all shadow-md cursor-pointer shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report (Save PDF)</span>
          </button>
        </div>

        {/* Left side parameters / Right side visualization layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Controls Panel (Left Span 4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Parameters card */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b pb-2 border-neutral-100">
                <Settings2 className="w-4 h-4 text-neutral-500" />
                <span className="text-xs font-semibold text-neutral-950 font-sans">Timeline Diagnostics</span>
              </div>

              <div className="space-y-4 text-xs">
                
                {/* Initial wealth */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono font-medium text-neutral-400 uppercase tracking-widest block font-bold">Start Capital</label>
                    <button 
                      onClick={handleSyncWithLedger}
                      className="text-[9px] font-mono text-emerald-600 hover:underline cursor-pointer"
                    >
                      Sync Ledger: ${totalEquity.toLocaleString()}
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-neutral-400">$</span>
                    <input
                      type="number"
                      value={startingWealth}
                      onChange={e => setStartingWealth(parseFloat(e.target.value) || 0)}
                      className="w-full bg-neutral-50/55 border border-neutral-200 rounded-lg pl-6 pr-2.5 py-1.5 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                {/* Age settings flex */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-medium text-neutral-400 uppercase tracking-widest block font-bold">Current Age</label>
                    <input
                      type="number"
                      value={currentAge}
                      onChange={e => setCurrentAge(parseInt(e.target.value) || 30)}
                      className="w-full bg-neutral-50/55 border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden font-mono"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-medium text-neutral-400 uppercase tracking-widest block font-bold">Target Retirement</label>
                    <input
                      type="number"
                      value={targetRetirementAge}
                      onChange={e => setTargetRetirementAge(parseInt(e.target.value) || 60)}
                      className="w-full bg-neutral-50/55 border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                {/* Savings and withdrawals */}
                <div className="grid grid-cols-2 gap-3 pb-1 border-b border-neutral-100">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-medium text-neutral-400 uppercase tracking-widest block font-bold">Annual inputs</label>
                    <input
                      type="number"
                      value={annualContribution}
                      onChange={e => setAnnualContribution(parseFloat(e.target.value) || 0)}
                      className="w-full bg-neutral-50/55 border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-medium text-neutral-400 uppercase tracking-widest block font-bold">Retirement draw</label>
                    <input
                      type="number"
                      value={annualSpend}
                      onChange={e => setAnnualSpend(parseFloat(e.target.value) || 0)}
                      className="w-full bg-neutral-50/55 border border-rose-100 text-rose-700 rounded-lg px-2.5 py-1.5 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                {/* Timeline and contribution Growth Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center font-mono text-[10px] tracking-widest text-neutral-400 uppercase block font-bold">
                    <span>Year horizon timeline</span>
                    <span className="text-neutral-800">{timelineYears} years</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={timelineYears}
                    onChange={e => setTimelineYears(parseInt(e.target.value))}
                    className="w-full accent-neutral-900 cursor-pointer h-1 rounded-lg"
                  />
                </div>

                <div className="space-y-2 pt-1 border-t border-neutral-100">
                  <div className="flex justify-between items-center font-mono text-[10px] tracking-widest text-neutral-400 uppercase block font-bold">
                    <span>Input growth index</span>
                    <span className="text-neutral-800">+{contributionGrowthRate}% /yr</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={contributionGrowthRate}
                    onChange={e => setContributionGrowthRate(parseFloat(e.target.value))}
                    className="w-full accent-neutral-900 cursor-pointer h-1 rounded-lg"
                  />
                  <span className="text-[9px] text-neutral-400 block font-light">Ties annual contributions to inflation, salary growth, or dynamic compound rates.</span>
                </div>

              </div>
            </div>

            {/* Strategy Select Card */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <FlameKindling className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-neutral-950 font-sans">Primary Allocation Link</span>
              </div>
              
              <div className="space-y-2 text-xs">
                <span className="text-[10px] font-mono text-neutral-400 block uppercase font-bold">Active simulation portfolio</span>
                <select
                  value={activePortName}
                  onChange={e => setActivePortName(e.target.value)}
                  className="w-full bg-neutral-50 border rounded-lg text-xs px-2.5 py-1.5 focus:outline-hidden font-medium cursor-pointer"
                >
                  {portfolios.map(p => (
                    <option key={p.portfolio_name} value={p.portfolio_name}>
                      {p.portfolio_name}
                    </option>
                  ))}
                </select>
                <div className="p-3 bg-neutral-50 text-[10px] space-y-1.5 border border-dashed rounded-lg leading-relaxed text-neutral-500 font-light">
                  <div className="font-semibold text-neutral-700 font-mono uppercase text-[9px]">Calculated Performance Sourced:</div>
                  <div className="flex justify-between">
                    <span>Expected Return:</span>
                    <span className="font-semibold font-mono text-neutral-850">{(activeStats.expectedReturn * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Implied Volatility Rate:</span>
                    <span className="font-semibold font-mono text-neutral-850">{(activeStats.volatility * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Graphical Projection Workspace (Right Span 8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Simulation Canvas */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6">
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-neutral-900 tracking-tight">Lifetime Wealth Accumulation Model</h3>
                    <span className="text-[9px] font-mono text-neutral-400 font-semibold bg-neutral-100 rounded px-1.5 py-0.5">
                      {engineMode === 'montecarlo' ? '10k Stochastic Trials' : 'Linear Growth Paths'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 font-light">
                    {engineMode === 'montecarlo' 
                      ? 'Simulates 10,000 randomized market volatility trails showing potential real deviations.' 
                      : 'Compound interest curve comparing linear trajectories of each defined portfolio strategy.'}
                  </p>
                </div>

                {/* Selector Tabs */}
                <div className="bg-neutral-100 p-1 rounded-xl flex gap-1">
                  <button
                    onClick={() => { setEngineMode('deterministic'); setHoveredIdx(null); }}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
                      engineMode === 'deterministic' 
                        ? 'bg-neutral-900 text-white shadow-xs' 
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    All Strategies
                  </button>
                  <button
                    onClick={() => { setEngineMode('montecarlo'); setHoveredIdx(null); }}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
                      engineMode === 'montecarlo' 
                        ? 'bg-neutral-900 text-white shadow-xs' 
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    Stochastic Probability (95)
                  </button>
                </div>
              </div>

              {plotData && (
                <div className="space-y-4">
                  
                  {/* SVG Chart */}
                  <div className="relative w-full overflow-x-auto">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[500px] h-64 overflow-visible">
                      {/* Grid lines horizontal */}
                      {[0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => {
                        const y = chartHeight - padding.bottom - ratio * (chartHeight - padding.top - padding.bottom);
                        const val = ratio * plotData.maxVal;
                        return (
                          <g key={i} className="opacity-45">
                            <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} className="stroke-neutral-200 stroke-1 stroke-dasharray-[3,3]" />
                            <text x={padding.left - 8} y={y + 4} textAnchor="end" className="font-mono text-[9px] fill-neutral-400">
                              ${(Math.round(val / 1000) * 1000).toLocaleString('en-US', { notation: 'compact' })}
                            </text>
                          </g>
                        );
                      })}

                      {/* Vertical Grid Lines */}
                      {plotData.years.map((year, idx) => {
                        if (idx % Math.ceil(plotData.xLength / 5) !== 0 && idx !== plotData.xLength - 1) return null;
                        const x = padding.left + (idx / (plotData.xLength - 1)) * (chartWidth - padding.left - padding.right);
                        return (
                          <g key={idx}>
                            <line x1={x} y1={chartHeight - padding.bottom} x2={x} y2={padding.top} className="stroke-neutral-100 stroke-1" />
                            <text x={x} y={chartHeight - padding.bottom + 15} textAnchor="middle" className="font-mono text-[10px] fill-neutral-400">
                              Age {year}
                            </text>
                          </g>
                        );
                      })}

                      {/* Line Paths */}
                      {engineMode === 'deterministic' ? (
                        Object.keys(plotData.linePaths || {}).map((name, idx) => {
                          const strokeColors = ['stroke-emerald-500', 'stroke-blue-500', 'stroke-amber-500', 'stroke-indigo-500'];
                          return (
                            <path
                              key={name}
                              d={plotData.linePaths[name]}
                              fill="none"
                              className={`${strokeColors[idx % strokeColors.length]} stroke-[2.5] stroke-linejoin-round transition-all duration-300`}
                            />
                          );
                        })
                      ) : (
                        <>
                          {/* P90 */}
                          <path d={plotData.pathStr90} fill="none" className="stroke-emerald-400 stroke-2 stroke-linejoin-round" />
                          {/* P50 */}
                          <path d={plotData.pathStr50} fill="none" className="stroke-blue-500 stroke-[2.5] stroke-linejoin-round" />
                          {/* P10 */}
                          <path d={plotData.pathStr10} fill="none" className="stroke-rose-400 stroke-2 stroke-linejoin-round" />
                        </>
                      )}

                      {/* Hover tracker cursor */}
                      {hoveredIdx !== null && (
                        <g>
                          <line
                            x1={padding.left + (hoveredIdx / (plotData.xLength - 1)) * (chartWidth - padding.left - padding.right)}
                            y1={padding.top}
                            x2={padding.left + (hoveredIdx / (plotData.xLength - 1)) * (chartWidth - padding.left - padding.right)}
                            y2={chartHeight - padding.bottom}
                            className="stroke-neutral-400 stroke-1 stroke-dasharray-[2,2]"
                          />
                        </g>
                      )}

                      {/* Invisible rect bars for touch-move tracking */}
                      {plotData.years.map((_, idx) => {
                        const x = padding.left + (idx / (plotData.xLength - 1)) * (chartWidth - padding.left - padding.right);
                        const cellWidth = (chartWidth - padding.left - padding.right) / (plotData.xLength - 1);
                        return (
                          <rect
                            key={idx}
                            x={x - cellWidth / 2}
                            y={padding.top}
                            width={cellWidth}
                            height={chartHeight - padding.top - padding.bottom}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredIdx(idx)}
                            onMouseLeave={() => setHoveredIdx(null)}
                          />
                        );
                      })}
                    </svg>
                  </div>

                  {/* Legends HUD */}
                  <div className="p-4 bg-neutral-50 border rounded-2xl text-xs">
                    {hoveredIdx !== null ? (
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                        <span className="font-semibold font-mono text-neutral-800">
                          ↳ Age {plotData.years[hoveredIdx]} Metrics:
                        </span>

                        {engineMode === 'deterministic' ? (
                          <div className="flex flex-wrap gap-4 font-mono select-none">
                            {Object.keys(plotData.lines || {}).map((name, idx) => {
                              const dotColors = ['bg-emerald-550', 'bg-blue-550', 'bg-amber-550', 'bg-indigo-550'];
                              return (
                                <div key={name} className="flex items-center gap-1.5">
                                  <span className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]}`} />
                                  <span className="text-neutral-500 font-sans">{name}:</span>
                                  <span className="font-bold text-neutral-900">${plotData.lines[name][hoveredIdx].toLocaleString()}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-4 font-mono select-none">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                              <span className="text-neutral-500 font-sans">Favorable P90:</span>
                              <span className="font-bold text-emerald-700">${plotData.lines['Favorable P90'][hoveredIdx].toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-blue-500" />
                              <span className="text-neutral-500 font-sans">Median P50:</span>
                              <span className="font-bold text-blue-600">${plotData.lines['Median P50'][hoveredIdx].toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-rose-450" style={{ backgroundColor: '#fb7185' }} />
                              <span className="text-neutral-500 font-sans">Unfavorable P10:</span>
                              <span className="font-bold text-rose-600">${plotData.lines['Unfavorable P10'][hoveredIdx].toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-center items-center gap-1.5 font-light text-neutral-400 italic">
                        <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>Hover cursors across trajectories to extract detailed year projection balances.</span>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>

            {/* Stochastic Success score (If Monte Carlo) */}
            {engineMode === 'montecarlo' && mcResult && (
              <div className="bg-neutral-950 text-white rounded-3xl p-6 shadow-md border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1.5 text-center md:text-left">
                  <div className="font-mono text-[10px] tracking-wider text-emerald-400 uppercase font-semibold flex items-center justify-center md:justify-start gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>Lifecycle Plan Diagnostic</span>
                  </div>
                  <h4 className="text-base font-bold text-white tracking-tight">Stochastic Model Plan Survival Success</h4>
                  <p className="text-xs text-neutral-400 font-light leading-relaxed max-w-lg">
                    Runs 10,000 paths varying rates continuously based on asset characteristics. Represents probability of finishing with a positive balance at age 95.
                  </p>
                </div>
                
                <div className="text-center bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 min-w-[150px] space-y-1">
                  <span className="text-[9px] font-mono tracking-widest text-neutral-400 uppercase">Survival Prob.</span>
                  <div className="text-3xl font-extrabold tracking-tight text-emerald-400">
                    {mcResult.successRate}%
                  </div>
                  <span className="text-[9px] text-neutral-400 font-light block line-clamp-1">at terminal age 95</span>
                </div>
              </div>
            )}

            {/* Active Portfolio Asset Allocator & Overrides Editor */}
            {activePortfolio && (
              <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6">
                
                <div className="flex flex-wrap items-center justify-between border-b pb-4 border-neutral-100 gap-2">
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-semibold text-neutral-900 tracking-tight">Strategy Asset Allocator & Expectation Registry</h3>
                    <p className="text-xs text-neutral-400 font-light">
                      Customize targets and override historical stock / crypt/ bond rates to see immediate simulation responses.
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-mono font-medium rounded-full ${
                    activeAllocationSum === 100 
                      ? 'bg-emerald-50 text-emerald-800' 
                      : 'bg-amber-50 text-amber-800 animate-pulse'
                  }`}>
                    Allocated Sum: {activeAllocationSum}%
                  </span>
                </div>

                {/* Grid allocations table with overrides */}
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[550px]">
                      <thead>
                        <tr className="border-b uppercase font-mono text-[9px] text-neutral-400 font-bold">
                          <th className="pb-2">Asset Code</th>
                          <th className="pb-2 w-48 text-center">Alloc. Weight (%)</th>
                          <th className="pb-2 text-right">Expected return (%)</th>
                          <th className="pb-2 text-right"> volatility (%)</th>
                          <th className="pb-2 text-right">Contribution</th>
                          <th className="pb-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 leading-normal">
                        {activePortfolio.allocation.map(alloc => {
                          const stats = getTickerStats(alloc.ticker);
                          
                          // Look for overrides
                          const currentReturn = tickerReturnOverrides[alloc.ticker.toUpperCase()] !== undefined 
                            ? tickerReturnOverrides[alloc.ticker.toUpperCase()] * 100 
                            : stats.return * 100;

                          const currentVol = tickerVolOverrides[alloc.ticker.toUpperCase()] !== undefined 
                            ? tickerVolOverrides[alloc.ticker.toUpperCase()] * 100 
                            : stats.volatility * 100;

                          const contribution = (currentReturn / 100) * (alloc.percentage / 100) * 100;

                          return (
                            <tr key={alloc.ticker}>
                              <td className="py-3">
                                <div>
                                  <span className="font-bold text-neutral-900">{alloc.ticker}</span>
                                  <span className="text-[10px] text-neutral-450 block font-light">{alloc.asset_class}</span>
                                </div>
                              </td>
                              
                              {/* Slide & edit Alloc. Percentage */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <input 
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={alloc.percentage}
                                    onChange={e => handleUpdatePercentage(alloc.ticker, parseInt(e.target.value))}
                                    className="w-full accent-neutral-900 cursor-pointer h-1"
                                  />
                                  <span className="font-mono font-bold text-neutral-800 text-[11px] shrink-0 w-10 text-right">
                                    {alloc.percentage}%
                                  </span>
                                </div>
                              </td>

                              {/* Editable Expected Return rate */}
                              <td className="py-3 text-right">
                                <div className="inline-flex items-center bg-neutral-50 px-1.5 py-1 border rounded-lg max-w-[80px]">
                                  <input
                                    type="number"
                                    step="0.5"
                                    placeholder={(stats.return * 100).toFixed(1)}
                                    value={tickerReturnOverrides[alloc.ticker.toUpperCase()] !== undefined ? (tickerReturnOverrides[alloc.ticker.toUpperCase()] * 100).toString() : ''}
                                    onChange={e => handleOverrideReturn(alloc.ticker, e.target.value)}
                                    className="w-full bg-transparent text-right font-mono text-[11px] focus:outline-hidden"
                                  />
                                  <span className="text-[9px] font-mono text-neutral-400 ml-0.5">%</span>
                                </div>
                              </td>

                              {/* Editable Volatility */}
                              <td className="py-3 text-right">
                                <div className="inline-flex items-center bg-neutral-50 px-1.5 py-1 border rounded-lg max-w-[80px]">
                                  <input
                                    type="number"
                                    step="0.5"
                                    placeholder={(stats.volatility * 100).toFixed(1)}
                                    value={tickerVolOverrides[alloc.ticker.toUpperCase()] !== undefined ? (tickerVolOverrides[alloc.ticker.toUpperCase()] * 100).toString() : ''}
                                    onChange={e => handleOverrideVolatility(alloc.ticker, e.target.value)}
                                    className="w-full bg-transparent text-right font-mono text-[11px] focus:outline-hidden"
                                  />
                                  <span className="text-[9px] font-mono text-neutral-400 ml-0.5">%</span>
                                </div>
                              </td>

                              {/* Return contribution */}
                              <td className="py-3 text-right font-mono text-neutral-700 font-semibold">
                                +{contribution.toFixed(2)}%
                              </td>

                              {/* Delete button */}
                              <td className="py-3 text-center">
                                <button
                                  onClick={() => handleRemoveAsset(alloc.ticker)}
                                  className="p-1 hover:text-rose-600 text-neutral-450 rounded cursor-pointer"
                                  title="Delete from allocation strategy"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Warning if allocation sums to non-100 */}
                  {activeAllocationSum !== 100 && (
                    <div className="p-3 bg-amber-5 border border-amber-200 text-amber-905 text-amber-900 rounded-xl flex items-start gap-2 text-[11px] leading-relaxed">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        Your target allocations sum up to <strong className="font-mono">{activeAllocationSum}%</strong>. Projections will automatically scale individual proportions of returns relative to the sum to model targets accurately, but maintaining exactly 100% is highly recommended for balanced trades list.
                      </span>
                    </div>
                  )}

                  {/* Form to append new assets to simulated portfolio allocation */}
                  <form onSubmit={handleAddAsset} className="bg-neutral-50 border p-4 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6 space-y-1">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase font-semibold">Search Ticker to Add</span>
                      <TickerSearchCombobox
                        value={newAssetTicker}
                        onChange={setNewAssetTicker}
                        placeholder="Search tickers (e.g. MSFT, TLT, SCHD, SOL)..."
                      />
                    </div>
                    
                    <div className="md:col-span-3 space-y-1">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase font-semibold">Weight Allocation %</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newAssetPct}
                        onChange={e => setNewAssetPct(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl text-xs px-2.5 py-1.5 text-right font-mono focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-mono font-medium cursor-pointer transition-all flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add to strategy</span>
                      </button>
                    </div>
                  </form>

                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
