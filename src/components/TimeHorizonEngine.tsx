import React, { useState, useMemo } from 'react';
import { Portfolio } from '../types';
import { runMonteCarloSimulation, projectTimeHorizon, calculatePortfolioStats } from '../utils/calculators';
import { 
  LineChart, 
  TrendingUp, 
  HelpCircle, 
  PlayCircle, 
  Activity, 
  User, 
  DollarSign, 
  Calendar,
  AlertTriangle,
  FlameKindling
} from 'lucide-react';

interface TimeHorizonEngineProps {
  portfolios: Portfolio[];
  totalEquity: number;
  annualSpendingTarget: number;
}

export default function TimeHorizonEngine({
  portfolios,
  totalEquity,
  annualSpendingTarget
}: TimeHorizonEngineProps) {
  // User Planning Parameters State
  const [startingWealth, setStartingWealth] = useState<number>(totalEquity > 0 ? totalEquity : 125000);
  const [currentAge, setCurrentAge] = useState<number>(32);
  const [targetRetirementAge, setTargetRetirementAge] = useState<number>(60);
  const [annualContribution, setAnnualContribution] = useState<number>(15000);
  const [annualSpend, setAnnualSpend] = useState<number>(annualSpendingTarget || 75000);
  const [timelineYears, setTimelineYears] = useState<number>(30); // 5 to 40 years

  // Mode select
  const [engineMode, setEngineMode] = useState<'deterministic' | 'montecarlo'>('deterministic');

  // Currently selected portfolio for Monte Carlo analysis
  const [monteCarloPortName, setMonteCarloPortName] = useState(portfolios[0]?.portfolio_name || 'Aggressive Growth');

  const activeMonteCarloPort = useMemo(() => {
    return portfolios.find(p => p.portfolio_name === monteCarloPortName) || portfolios[0];
  }, [portfolios, monteCarloPortName]);

  // Handle local parameter overrides
  const handleStartWealthChange = (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) setStartingWealth(num);
  };

  // Run Calculations
  const deterministicResult = useMemo(() => {
    // Structure input portfolios
    const series = portfolios.map(p => ({
      name: p.portfolio_name,
      portfolio: p
    }));

    return projectTimeHorizon(
      series,
      startingWealth,
      annualContribution,
      targetRetirementAge,
      currentAge,
      timelineYears
    );
  }, [portfolios, startingWealth, annualContribution, targetRetirementAge, currentAge, timelineYears]);

  const mcResult = useMemo(() => {
    if (!activeMonteCarloPort) return null;
    return runMonteCarloSimulation({
      startingWealth,
      currentAge,
      retirementAge: targetRetirementAge,
      annualContribution,
      annualRetirementSpending: annualSpend,
      portfolio: activeMonteCarloPort
    });
  }, [activeMonteCarloPort, startingWealth, currentAge, targetRetirementAge, annualContribution, annualSpend]);

  // Hover tracker for interactive chart rendering
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Custom SVG Line Chart plotting scaling parameters
  const chartHeight = 220;
  const chartWidth = 560;
  const padding = { top: 20, right: 30, bottom: 30, left: 70 };

  // Helper: map data to SVG boundaries
  const plotData = useMemo(() => {
    if (engineMode === 'deterministic') {
      const data = deterministicResult;
      const xLength = data.years.length;
      
      // Get absolute max cash value
      let maxVal = 10000;
      Object.keys(data.lines).forEach(name => {
        const arr = data.lines[name];
        const localMax = Math.max(...arr);
        if (localMax > maxVal) maxVal = localMax;
      });

      // Pad max scale
      maxVal = maxVal * 1.1;

      // Map lines to paths
      const linePaths: Record<string, string> = {};
      Object.keys(data.lines).forEach(name => {
        const points = data.lines[name];
        const coordinates = points.map((val, idx) => {
          const x = padding.left + (idx / (xLength - 1)) * (chartWidth - padding.left - padding.right);
          const y = chartHeight - padding.bottom - (val / maxVal) * (chartHeight - padding.top - padding.bottom);
          return { x, y };
        });

        // Construct standard SVG line
        let pathStr = `M ${coordinates[0].x} ${coordinates[0].y}`;
        for (let i = 1; i < coordinates.length; i++) {
          pathStr += ` L ${coordinates[i].x} ${coordinates[i].y}`;
        }
        linePaths[name] = pathStr;
      });

      return {
        maxVal,
        linePaths,
        years: data.years,
        lines: data.lines,
        xLength
      };
    } else {
      // MONTE CARLO
      if (!mcResult) return null;
      const data = mcResult;
      const xLength = data.years.length;
      
      // Max percentile boundary
      let maxVal = Math.max(...data.percentile90) || 10000;
      maxVal = maxVal * 1.1;

      const path10 = data.percentile10.map((val, idx) => {
        const x = padding.left + (idx / (xLength - 1)) * (chartWidth - padding.left - padding.right);
        const y = chartHeight - padding.bottom - (val / maxVal) * (chartHeight - padding.top - padding.bottom);
        return { x, y };
      });

      const path50 = data.percentile50.map((val, idx) => {
        const x = padding.left + (idx / (xLength - 1)) * (chartWidth - padding.left - padding.right);
        const y = chartHeight - padding.bottom - (val / maxVal) * (chartHeight - padding.top - padding.bottom);
        return { x, y };
      });

      const path90 = data.percentile90.map((val, idx) => {
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
        years: data.years,
        raw: data,
        xLength
      };
    }
  }, [engineMode, deterministicResult, mcResult]);

  return (
    <div className="space-y-8" id="horizon-planner-panel">
      
      {/* Parameter Entry dashboard */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b pb-4 border-neutral-100">
          <div className="p-2 bg-neutral-100 rounded-xl text-neutral-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Demographic & Time Horizon Setup</h3>
            <p className="text-xs text-neutral-400 font-light">Establish age markers, savings values, and targeted retirement projections.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-medium text-neutral-500 uppercase tracking-widest block">Starting Portfolio Value</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-500">$</span>
              <input
                type="number"
                value={startingWealth}
                onChange={e => handleStartWealthChange(e.target.value)}
                className="w-full bg-neutral-50 border rounded-xl text-xs pl-7 pr-3 py-2.5 font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-medium text-neutral-500 uppercase tracking-widest block">Current Age</label>
            <input
              type="number"
              value={currentAge}
              onChange={e => setCurrentAge(parseInt(e.target.value) || 30)}
              className="w-full bg-neutral-50 border rounded-xl text-xs px-3 py-2.5 font-mono focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-medium text-neutral-500 uppercase tracking-widest block">Retirement Age Target</label>
            <input
              type="number"
              value={targetRetirementAge}
              onChange={e => setTargetRetirementAge(parseInt(e.target.value) || 60)}
              className="w-full bg-neutral-50 border rounded-xl text-xs px-3 py-2.5 font-mono focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-medium text-neutral-500 uppercase tracking-widest block">Annual Inputs / Savings</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-500">$</span>
              <input
                type="number"
                value={annualContribution}
                onChange={e => setAnnualContribution(parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-50 border rounded-xl text-xs pl-7 pr-3 py-2.5 font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-medium text-neutral-500 uppercase tracking-widest block">Annual Retirement Draw</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-500">$</span>
              <input
                type="number"
                value={annualSpend}
                onChange={e => setAnnualSpend(parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-50 border rounded-xl text-xs pl-7 pr-3 py-2.5 font-mono focus:outline-hidden text-rose-600 font-semibold"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Visual Analytics Canvas Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Core Visualization & Hover metrics - Span 8 */}
        <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-neutral-900">Future Horizon Comparison Engine</h3>
                {engineMode === 'montecarlo' && (
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold flex items-center gap-1.5 shrink-0 animate-pulse select-none">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> WASM STOCHASTIC TARGETS: 10k RUNS ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 font-light">
                {engineMode === 'montecarlo' 
                  ? "Running 10,000 scenarios in a high-speed stochastic simulation compiled stochastically within browser Assembly blocks."
                  : "Compare linear, fixed compounding rates against randomized Monte Carlo portfolio vectors."
                }
              </p>
            </div>

            {/* Toggle tabs */}
            <div className="bg-neutral-100 p-1 rounded-xl flex gap-1">
              <button
                onClick={() => { setEngineMode('deterministic'); setHoveredIndex(null); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  engineMode === 'deterministic' 
                    ? 'bg-neutral-900 text-white shadow-md' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Linear Target Model
              </button>
              <button
                onClick={() => { setEngineMode('montecarlo'); setHoveredIndex(null); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  engineMode === 'montecarlo' 
                    ? 'bg-neutral-900 text-white shadow-md' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Stochastic Success model
              </button>
            </div>
          </div>

          {plotData && (
            <div className="space-y-4">
              {/* Interactive Vector Line Projection */}
              <div className="relative w-full overflow-x-auto">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[500px] h-64 overflow-visible">
                  {/* Grid lines horizontal */}
                  {[0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => {
                    const y = chartHeight - padding.bottom - ratio * (chartHeight - padding.top - padding.bottom);
                    const val = ratio * plotData.maxVal;
                    return (
                      <g key={i} className="opacity-45">
                        <line 
                          x1={padding.left} 
                          y1={y} 
                          x2={chartWidth - padding.right} 
                          y2={y} 
                          className="stroke-neutral-200 stroke-1 stroke-dasharray-[3,3]" 
                        />
                        <text 
                          x={padding.left - 8} 
                          y={y + 4} 
                          textAnchor="end" 
                          className="font-mono text-[9px] fill-neutral-400"
                        >
                          ${(Math.round(val / 1000) * 1000).toLocaleString('en-US', { notation: 'compact' })}
                        </text>
                      </g>
                    );
                  })}

                  {/* Grid lines vertical */}
                  {plotData.years.map((year, idx) => {
                    if (idx % Math.ceil(plotData.xLength / 5) !== 0 && idx !== plotData.xLength - 1) return null;
                    const x = padding.left + (idx / (plotData.xLength - 1)) * (chartWidth - padding.left - padding.right);
                    return (
                      <g key={idx}>
                        <line
                          x1={x}
                          y1={chartHeight - padding.bottom}
                          x2={x}
                          y2={padding.top}
                          className="stroke-neutral-100 stroke-1"
                        />
                        <text
                          x={x}
                          y={chartHeight - padding.bottom + 15}
                          textAnchor="middle"
                          className="font-mono text-[10px] fill-neutral-400"
                        >
                          Age {year}
                        </text>
                      </g>
                    );
                  })}

                  {/* SVG Paths representing curves */}
                  {engineMode === 'deterministic' ? (
                    // 3 portfolios paths
                    Object.keys(plotData.linePaths || {}).map((name, idx) => {
                      const colors = ['stroke-emerald-500', 'stroke-blue-500', 'stroke-amber-500'];
                      return (
                        <path
                          key={name}
                          d={plotData.linePaths[name]}
                          fill="none"
                          className={`${colors[idx % colors.length]} stroke-[2.5] stroke-linejoin-round transition-all duration-300`}
                        />
                      );
                    })
                  ) : (
                    // Monte carlo curves
                    <>
                      {/* P90 */}
                      <path
                        d={plotData.pathStr90}
                        fill="none"
                        className="stroke-emerald-400 stroke-2 stroke-linejoin-round"
                      />
                      {/* P50 */}
                      <path
                        d={plotData.pathStr50}
                        fill="none"
                        className="stroke-blue-500 stroke-[2.5] stroke-linejoin-round"
                      />
                      {/* P10 */}
                      <path
                        d={plotData.pathStr10}
                        fill="none"
                        className="stroke-rose-400 stroke-2 stroke-linejoin-round"
                      />
                    </>
                  )}

                  {/* Hover guideline cursor */}
                  {hoveredIndex !== null && (
                    <g>
                      {/* Line vertical bar */}
                      <line
                        x1={padding.left + (hoveredIndex / (plotData.xLength - 1)) * (chartWidth - padding.left - padding.right)}
                        y1={padding.top}
                        x2={padding.left + (hoveredIndex / (plotData.xLength - 1)) * (chartWidth - padding.left - padding.right)}
                        y2={chartHeight - padding.bottom}
                        className="stroke-neutral-400 stroke-1 stroke-dasharray-[2,2]"
                      />
                    </g>
                  )}

                  {/* Transparent hover capture boxes */}
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
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />
                    );
                  })}
                </svg>
              </div>

              {/* Legend & Hover data outcomes */}
              <div className="p-4 bg-neutral-50 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                {hoveredIndex !== null ? (
                  <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-2 text-neutral-800">
                    <span className="font-semibold font-mono text-neutral-900 leading-none">
                      ↳ Year Age {plotData.years[hoveredIndex]}:
                    </span>

                    {engineMode === 'deterministic' ? (
                      <div className="flex flex-wrap gap-4 font-mono select-none">
                        {Object.keys(plotData.lines || {}).map((name, i) => (
                          <div key={name} className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-blue-500' : 'bg-amber-500'
                            }`} />
                            <span>{name}:</span>
                            <span className="font-bold text-neutral-900">${(plotData.lines[name][hoveredIndex]).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-4 font-mono select-none">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                          <span>P90 (Favorable):</span>
                          <span className="font-bold text-neutral-900">${(plotData.raw.percentile90[hoveredIndex]).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-blue-500" />
                          <span>P50 (Median):</span>
                          <span className="font-bold text-neutral-900">${(plotData.raw.percentile50[hoveredIndex]).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-rose-450" style={{ backgroundColor: '#f43f5e' }} />
                          <span>P10 (Unfavorable):</span>
                          <span className="font-bold text-neutral-900">${(plotData.raw.percentile10[hoveredIndex]).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-neutral-500 justify-center w-full font-sans italic font-light">
                    <span>Move cursor across the trajectory paths of the curves to read targeted valuation points.</span>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Success Metrics & Stochastic Details - Span 4 */}
        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          
          {engineMode === 'deterministic' ? (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h3 className="text-base font-semibold text-neutral-900">Deterministic Parameters</h3>
                <p className="text-xs text-neutral-400 font-light mt-1">Linear projections calculate performance based on weighted returns minus target spending offsets.</p>
              </div>

              <div className="space-y-4">
                <span className="text-[11px] font-mono tracking-widest text-neutral-400 uppercase block">Expected Performance Indices</span>
                {portfolios.map((p, idx) => {
                  const stats = calculatePortfolioStats(p);
                  return (
                    <div key={p.portfolio_name} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 text-xs">
                      <div className="flex justify-between items-center font-semibold text-neutral-900">
                        <span>{p.portfolio_name}</span>
                        <span className="font-mono text-emerald-600">{(stats.expectedReturn * 100).toFixed(1)}% Return</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-neutral-400 mt-1">
                        <span>Expected Volatility:</span>
                        <span className="font-mono">{(stats.volatility * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 font-light">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Linear models represent perfect compound paths. However, market volatility introduces "Sequence-of-Returns" risks. Use the <strong>Stochastic model</strong> to stress-test your plans.
                </p>
              </div>
            </div>
          ) : (
            mcResult && (
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-base font-semibold text-neutral-900">10,000 Stochastic Trial Outputs</h3>
                  <p className="text-xs text-neutral-400 font-light mt-1">Stochastically varies returns in parallel to model retirement survival levels.</p>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-mono text-neutral-400 block uppercase">Target Plan Portfolio</span>
                  <select
                    value={monteCarloPortName}
                    onChange={e => setMonteCarloPortName(e.target.value)}
                    className="w-full bg-neutral-50 border rounded-xl text-xs px-3 py-2.5 focus:outline-hidden"
                  >
                    {portfolios.map(p => <option key={p.portfolio_name} value={p.portfolio_name}>{p.portfolio_name}</option>)}
                  </select>
                </div>

                {/* Score Dial */}
                <div className="text-center py-4 bg-neutral-900 rounded-2xl border text-white shadow-lg space-y-1">
                  <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">Survival Probability</span>
                  <div className="text-5xl font-sans font-bold text-emerald-400 tracking-tight">
                    {mcResult.successRate}%
                  </div>
                  <span className="text-[10px] text-neutral-400 block font-light px-4">
                    Probability of finishing with a positive net balance at target age 95.
                  </span>
                </div>

                {/* Success explanation */}
                <p className="text-xs text-neutral-500 font-light leading-relaxed">
                  Stochastic probability calculates spending up to age 95. Out of 10,000 generated normal variances, <span className="font-semibold text-neutral-900">{Math.round(mcResult.successRate * 100)} trials</span> successfully sustained retirement cash flows under active historical volatility of {Math.round(calculatePortfolioStats(activeMonteCarloPort).volatility * 100)}%.
                </p>
              </div>
            )
          )}

        </div>

      </div>

    </div>
  );
}
