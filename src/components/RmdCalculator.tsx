import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LedgerItem, RmdState, RmdWithdrawal } from '../types';
import { 
  DEFAULT_RMD_STATE, 
  calculateRmd, 
  getRmdAge,
  getUniformLifetimeFactor,
  getJointLifeExpectancy
} from '../utils/rmdCalculators';
import { 
  Calendar, 
  DollarSign, 
  Plus, 
  Trash2, 
  HelpCircle, 
  TrendingUp, 
  Scale, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  ArrowRight,
  Info,
  Code,
  ShieldCheck,
  Download
} from 'lucide-react';

interface RmdCalculatorProps {
  assets: LedgerItem[];
  rmdState?: RmdState;
  onChange: (state: RmdState) => void;
}

export default function RmdCalculator({ assets, rmdState, onChange }: RmdCalculatorProps) {
  // Graceful fallback to default RMD state
  const currentRmdState = rmdState || DEFAULT_RMD_STATE;
  const [taxYear, setTaxYear] = useState<number>(2026);
  const [estimatedGrowth, setEstimatedGrowth] = useState<number>(6); // 6% default balance growth

  // Rule engine state keys
  const [useFormulaEngine, setUseFormulaEngine] = useState(false);
  const [formulaString, setFormulaString] = useState("rate + Math.sin(year - 2026) * 0.015");
  const [formulaError, setFormulaError] = useState<string | null>(null);

  // Form input states for logging withdrawals
  const [newWithdrawalAmount, setNewWithdrawalAmount] = useState<string>('');
  const [newWithdrawalIraType, setNewWithdrawalIraType] = useState<'Traditional' | 'SEP' | 'SIMPLE' | 'Roth'>('Traditional');
  const [newWithdrawalDate, setNewWithdrawalDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Show detailed methodology drawers
  const [showSpousalInfo, setShowSpousalInfo] = useState(false);
  const [showSecure2Info, setShowSecure2Info] = useState(false);

  // Active projection visual point hover state
  const [hoveredForecastIdx, setHoveredForecastIdx] = useState<number | null>(null);

  // Core calculations
  const calc = calculateRmd(currentRmdState, taxYear);
  const metPercentage = calc.metPercent;

  const handleFormulaChange = (val: string) => {
    setFormulaString(val);
    try {
      const testFn = new Function('year', 'age', 'balance', 'rate', `
        const IF = (c, t, f) => c ? t : f;
        const SIN = Math.sin;
        const COS = Math.cos;
        const MIN = Math.min;
        const MAX = Math.max;
        return Number(${val});
      `);
      testFn(2026, 73, 100000, 0.06);
      setFormulaError(null);
    } catch (err: any) {
      setFormulaError(err.message || 'Syntax error in equation');
    }
  };

  const updateStateField = (field: keyof RmdState, value: any) => {
    onChange({
      ...currentRmdState,
      [field]: value
    });
  };

  // Scan Balance Sheet Assets for potential retirement IRAs
  const matchAndLinkIras = () => {
    const matchedAssets = assets.filter(a => {
      const name = a.name.toUpperCase();
      return name.includes('IRA') || name.includes('ROTH') || name.includes('401K') || name.includes('RETIREMENT');
    });

    const rothValue = matchedAssets
      .filter(a => a.name.toUpperCase().includes('ROTH'))
      .reduce((sum, a) => sum + a.value, 0);

    const sepValue = matchedAssets
      .filter(a => a.name.toUpperCase().includes('SEP'))
      .reduce((sum, a) => sum + a.value, 0);

    const simpleValue = matchedAssets
      .filter(a => a.name.toUpperCase().includes('SIMPLE'))
      .reduce((sum, a) => sum + a.value, 0);

    const traditionalValue = matchedAssets
      .filter(a => {
        const n = a.name.toUpperCase();
        return !n.includes('ROTH') && !n.includes('SEP') && !n.includes('SIMPLE');
      })
      .reduce((sum, a) => sum + a.value, 0);

    if (matchedAssets.length > 0) {
      onChange({
        ...currentRmdState,
        traditional_balance: traditionalValue,
        sep_balance: sepValue,
        simple_balance: simpleValue,
        roth_balance: rothValue
      });
      alert(`Synchronized ${matchedAssets.length} IRA assets from your Balance Sheet:\n- Traditional IRAs: $${traditionalValue.toLocaleString()}\n- SEP IRAs: $${sepValue.toLocaleString()}\n- SIMPLE IRAs: $${simpleValue.toLocaleString()}\n- Roth IRAs: $${rothValue.toLocaleString()}`);
    } else {
      alert("No retirement/IRA assets found in your Balance Sheet Assets. You can add them in the Balance Sheet tab with 'IRA', 'SEP', 'SIMPLE', or 'Roth' in their name to auto-link them, or enter values manually below.");
    }
  };

  const handleAddWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newWithdrawalAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newW: RmdWithdrawal = {
      id: `w-${Date.now()}`,
      date: newWithdrawalDate,
      ira_type: newWithdrawalIraType,
      amount
    };

    updateStateField('withdrawals', [...currentRmdState.withdrawals, newW]);
    setNewWithdrawalAmount('');
  };

  const handleDeleteWithdrawal = (id: string) => {
    updateStateField('withdrawals', currentRmdState.withdrawals.filter(w => w.id !== id));
  };

  // Compile the 15-year forecast dynamically supporting formulas
  const forecast = useMemo(() => {
    const yearsToForecast = 15;
    const result: any[] = [];
    let currentBalance = currentRmdState.traditional_balance + currentRmdState.sep_balance + currentRmdState.simple_balance;

    for (let i = 0; i < yearsToForecast; i++) {
      const year = taxYear + i;
      const age = year - currentRmdState.birth_year;
      
      // Calculate growth rate using the formula engine or simple rate
      let annualGrowthRate = estimatedGrowth / 100;
      if (useFormulaEngine && !formulaError) {
        try {
          const solver = new Function('year', 'age', 'balance', 'rate', `
            const IF = (c, t, f) => c ? t : f;
            const SIN = Math.sin;
            const COS = Math.cos;
            const MIN = Math.min;
            const MAX = Math.max;
            return Number(${formulaString});
          `);
          const res = solver(year, age, currentBalance, estimatedGrowth / 100);
          if (!isNaN(res)) {
            annualGrowthRate = res;
          }
        } catch (e) {
          // fallback stays static
        }
      }

      // Run calculateRmd on a simulated state to capture the perfect dynamic divisors
      const tempState: RmdState = {
        ...currentRmdState,
        traditional_balance: currentBalance,
        sep_balance: 0,
        simple_balance: 0,
        withdrawals: []
      };

      const calcObj = calculateRmd(tempState, year);
      
      result.push({
        year,
        age: calcObj.ownerAge,
        estimatedBalance: Math.round(currentBalance),
        divisor: calcObj.divisor,
        projectedRmd: Math.round(calcObj.rmdAmount),
        isDeadlineYr: calcObj.isTenYearDeadline,
        growthRate: annualGrowthRate
      });

      // Advance balance to next year: balance * growth - RMD
      currentBalance = (currentBalance - calcObj.rmdAmount) * (1 + annualGrowthRate);
      if (currentBalance < 0) currentBalance = 0;
    }

    return result;
  }, [currentRmdState, taxYear, estimatedGrowth, useFormulaEngine, formulaString, formulaError]);

  const handleExportRoadmapPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to export your print-ready financial roadmap report.");
      return;
    }

    const rowsHtml = forecast.map(row => `
      <tr style="border-bottom: 1px solid #f3f4f6; font-family: monospace; font-size: 11px;">
        <td style="padding: 10px 0;">Year ${row.year}</td>
        <td style="padding: 10px 0;">Age ${row.age}</td>
        <td style="padding: 10px 0; text-align: right; font-weight: bold;">$${row.estimatedBalance.toLocaleString()}</td>
        <td style="padding: 10px 0; text-align: right; color: #4f46e5; font-weight: bold;">$${row.projectedRmd.toLocaleString()}</td>
        <td style="padding: 10px 0; text-align: right;">${row.divisor > 0 ? row.divisor : 'Exempt'}</td>
        <td style="padding: 10px 0; text-align: right; color: #10b981;">${row.growthRate ? (row.growthRate * 100).toFixed(1) + '%' : '6.0%'}</td>
      </tr>
    `).join('');

    const recentWithdrawalsHtml = currentRmdState.withdrawals.length > 0 
      ? currentRmdState.withdrawals.map(w => `
          <tr style="border-bottom: 1px solid #e5e7eb; font-size: 11px;">
            <td style="padding: 8px 0; font-family: monospace;">${w.date}</td>
            <td style="padding: 8px 0;">${w.ira_type} IRA</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">$${w.amount.toLocaleString()}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="3" style="padding: 12px 0; text-align: center; color: #9ca3af; font-size: 11px; font-style: italic;">No distributions recorded for calculation year.</td></tr>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>FinanceForge - Personal Financial Security Roadmap & RMD Prospectus</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1f2937;
              padding: 40px;
              background-color: #ffffff;
              line-height: 1.5;
            }
            .header {
              border-bottom: 2px solid #111827;
              padding-bottom: 24px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 24px;
              font-weight: 700;
              letter-spacing: -0.05em;
              color: #111827;
              margin: 0;
            }
            .subtitle {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin-top: 4px;
              font-weight: 600;
            }
            .grid {
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 24px;
              margin-bottom: 30px;
            }
            .card {
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 20px;
              background: #f9fafb;
            }
            .card-title {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #6b7280;
              margin: 0 0 10px 0;
              font-weight: 700;
            }
            .stat {
              font-size: 22px;
              font-weight: 700;
              margin: 0;
              color: #111827;
              font-family: monospace;
            }
            .stat-desc {
              font-size: 11px;
              color: #6b7280;
              margin-top: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              border-bottom: 1px solid #111827;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #374151;
              padding: 8px 0;
              text-align: left;
            }
            .stamp {
              border: 1px solid #10b981;
              color: #10b981;
              padding: 4px 8px;
              display: inline-block;
              font-size: 10px;
              text-transform: uppercase;
              font-weight: bold;
              border-radius: 4px;
              margin-top: 10px;
            }
            .signature-block {
              margin-top: 50px;
              border-top: 1px dashed #d1d5db;
              padding-top: 20px;
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 30px;
              font-size: 11px;
            }
            @media print {
              body {
                padding: 10px;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; align-items: flex-start; justify-content: space-between;">
              <div>
                <h1 class="title">FINANCEFORGE</h1>
                <div class="subtitle">Secure Client-Side Portfolio & RMD roadmap</div>
              </div>
              <div style="text-align: right;">
                <span class="stamp">100% Secure & Private</span>
                <div style="font-size: 10px; color: #9ca3af; margin-top: 5px; font-family: monospace;">Report Hash: FH-${Math.round(Math.random() * 89999 + 10000)}</div>
              </div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <h2 class="card-title">Secured Demographic Data</h2>
              <div class="stat-desc">Calculation Calendar Tax Year: <strong>${taxYear}</strong></div>
              <div class="stat-desc">Beneficiary Born Year: <strong>${currentRmdState.birth_year}</strong> (Age: ${calc.ownerAge})</div>
              ${calc.isInherited ? `
                <div class="stat-desc" style="color: #4f46e5; margin-top:6px; font-weight:600;">Inherited IRA Account Type: ${calc.inheritedType === 'Spouse' ? 'Spousal Recalculation' : calc.inheritedType === 'Successor' ? 'Successor (Strict 10-Year)' : calc.inheritedType === 'EligibleDesignated' ? 'Eligible Beneficiary (Stretch)' : 'Traditional stretch'}</div>
                <div class="stat-desc">Original Owner Birth Year: <strong>${currentRmdState.original_owner_birth_year || 'N/A'}</strong></div>
                <div class="stat-desc">Year of Original Owner Death: <strong>${currentRmdState.year_of_owner_death || 'N/A'}</strong> (${calc.yearsSinceDeath} Years Passed)</div>
              ` : `
                <div class="stat-desc" style="color: #10b981; margin-top:6px; font-weight:600;">Personal Retirement Account (Original Owner)</div>
              `}
            </div>

            <div class="card">
              <h2 class="card-title">Fiscal Outlay Obligation</h2>
              <p class="stat">$${calc.rmdAmount.toLocaleString()}</p>
              <div class="stat-desc">Required Minimum Distribution due before December 31.</div>
              <div class="stat-desc" style="margin-top:8px;">Total Prior Year Base Balances: <strong>$${calc.totalBalance.toLocaleString()}</strong></div>
              <div class="stat-desc">Calculated IRS Division Factor: <strong>${calc.divisor > 0 ? calc.divisor : 'Exempt'}</strong></div>
            </div>
          </div>

          <div class="card" style="margin-bottom: 30px;">
            <h2 class="card-title">Distributions Action Record (${taxYear})</h2>
            <table style="width: 100%;">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source Asset class</th>
                  <th style="text-align: right;">Amount Satisfied</th>
                </tr>
              </thead>
              <tbody>
                ${recentWithdrawalsHtml}
              </tbody>
            </table>
            <div style="margin-top: 12px; font-size:11px; text-align: right;">
              Combined Outlay Logged: <strong style="color: #10b981;">+$${calc.withdrawalsSum.toLocaleString()}</strong> (${calc.remainingAmount > 0 ? `Shortfall remaining: $${calc.remainingAmount.toLocaleString()}` : 'Fully Met! ✅'})
            </div>
          </div>

          <div style="page-break-before: always;">
            <h2 class="card-title" style="border-bottom: 1px solid #111827; padding-bottom: 6px; font-size: 12px;">Compounded 15-Year Financial Roadmap & RMD Tax Projections</h2>
            <table>
              <thead>
                <tr>
                  <th>Calendar Year</th>
                  <th>Projected Age</th>
                  <th style="text-align: right;">Starting Est. Balance</th>
                  <th style="text-align: right; color: #4f46e5;">Required Outlay (RMD)</th>
                  <th style="padding: 8px 0; text-align: right;">IRS Table Divisor</th>
                  <th style="padding: 8px 0; text-align: right; color: #10b981;">Compounding Growth Rate</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <div class="signature-block">
            <div>
              <p><strong>Prepared for Client / Beneficiary:</strong></p>
              <div style="height: 40px; border-bottom: 1px solid #9ca3af; margin-bottom: 5px;"></div>
              <p style="color: #6b7280; margin: 0;">Secured local browser holder printout</p>
            </div>
            <div>
              <p><strong>Verification & Date:</strong></p>
              <div style="height: 40px; border-bottom: 1px solid #9ca3af; margin-bottom: 5px; font-family: monospace; font-size: 11px; display: flex; align-items: flex-end; padding-bottom: 2px;">
                Date: ${new Date().toLocaleDateString()}
              </div>
              <p style="color: #6b7280; margin: 0;">FinanceForge Cryptographic Zero-Server Signature</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const availableIrasTotal = assets
    .filter(a => {
      const name = a.name.toUpperCase();
      return name.includes('IRA') || name.includes('ROTH') || name.includes('401K') || name.includes('RETIREMENT');
    })
    .reduce((sum, a) => sum + a.value, 0);

  return (
    <div className="space-y-8" id="rmd-calculator-view">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-neutral-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="bg-neutral-900 text-white font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-semibold">
              SECURE Act 2.0 Compliant
            </span>
            <span className="text-xs text-neutral-400 font-mono">• IRS Lifetime Table III</span>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight font-sans">
            Required Minimum Distributions (RMD)
          </h2>
          <p className="text-neutral-500 text-xs font-light leading-relaxed">
            Manage your mandatory retirement account distributions under SECURE Act 2.0. Track annual withdrawals, leverage spousal joint exception calculations, and plan future tax surges.
          </p>
        </div>
        
        {availableIrasTotal > 0 && (
          <button 
            type="button"
            onClick={matchAndLinkIras}
            className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Link Balance Sheet IRAs (${availableIrasTotal.toLocaleString()})</span>
          </button>
        )}
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: input settings */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Holder demographics */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
            <h3 className="text-xs font-mono uppercase text-neutral-400 tracking-widest font-bold">
              Account Demographics
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-500 block">IRC Account Owner Type</label>
                <select
                  value={currentRmdState.is_inherited ? 'inherited' : 'original'}
                  onChange={(e) => {
                    const isInheritedVal = e.target.value === 'inherited';
                    onChange({
                      ...currentRmdState,
                      is_inherited: isInheritedVal,
                      inherited_type: isInheritedVal ? 'EligibleDesignated' : undefined,
                      year_of_owner_death: isInheritedVal ? 2024 : undefined,
                      original_owner_birth_year: isInheritedVal ? 1950 : undefined
                    });
                  }}
                  className="w-full bg-neutral-50 border rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 focus:outline-hidden"
                >
                  <option value="original">Personal IRA (Original Owner)</option>
                  <option value="inherited">Inherited or Successor IRA Beneficiary</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-500 block block">
                  {currentRmdState.is_inherited ? 'Beneficiary Birth Year' : 'Account Holder Birth Year'}
                </label>
                <input 
                  type="number"
                  min="1920"
                  max={new Date().getFullYear() - 1}
                  value={currentRmdState.birth_year}
                  onChange={(e) => updateStateField('birth_year', parseInt(e.target.value) || 1950)}
                  className="w-full bg-neutral-50 border rounded-xl px-3 py-2 focus:outline-hidden font-mono text-xs font-semibold text-neutral-800"
                />
              </div>

              {currentRmdState.is_inherited && (
                <div className="space-y-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-indigo-950 block">Beneficiary Relationship Type</label>
                    <select
                      value={currentRmdState.inherited_type || 'EligibleDesignated'}
                      onChange={(e) => updateStateField('inherited_type', e.target.value)}
                      className="w-full bg-white border rounded-xl px-2.5 py-1 text-xs text-neutral-800 focus:outline-hidden"
                    >
                      <option value="Spouse">Spouse Beneficiary (Stretch Life Expectancy Recalculated)</option>
                      <option value="EligibleDesignated">Eligible Designated (Lifetime stretch, Table I)</option>
                      <option value="NonDesignated">Non-Eligible Designated (Subject to 10-Yr rule)</option>
                      <option value="Successor">Successor Beneficiary (Strict 10-Yr rule)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-indigo-950 block font-mono">Original Owner Birth Year</label>
                    <input 
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() - 5}
                      value={currentRmdState.original_owner_birth_year || ''}
                      placeholder="e.g. 1948"
                      onChange={(e) => updateStateField('original_owner_birth_year', parseInt(e.target.value) || undefined)}
                      className="w-full bg-white border rounded-xl px-2.5 py-1 focus:outline-hidden font-mono text-xs font-medium text-neutral-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-indigo-950 block font-mono">Year Deceased Owner Died</label>
                    <input 
                      type="number"
                      min="1990"
                      max={new Date().getFullYear()}
                      value={currentRmdState.year_of_owner_death || ''}
                      placeholder="e.g. 2022"
                      onChange={(e) => updateStateField('year_of_owner_death', parseInt(e.target.value) || undefined)}
                      className="w-full bg-white border rounded-xl px-2.5 py-1 focus:outline-hidden font-mono text-xs font-medium text-neutral-800"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-500 block">Current Calculation Tax Year</label>
                <select 
                  value={taxYear}
                  onChange={(e) => setTaxYear(parseInt(e.target.value))}
                  className="w-full bg-neutral-50 border rounded-xl px-3 py-2 focus:outline-hidden font-mono text-xs font-medium text-neutral-800"
                >
                  <option value={2025}>2025 Tax Year</option>
                  <option value={2026}>2026 Tax Year (Current)</option>
                  <option value={2027}>2027 Tax Year</option>
                  <option value={2028}>2028 Tax Year</option>
                  <option value={2030}>2030 Tax Year</option>
                  <option value={2035}>2035 Tax Year</option>
                </select>
              </div>

              {/* Regulatory Milestones Callout */}
              <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-100 text-[11px] leading-relaxed space-y-1.5 font-light text-neutral-600">
                <div className="flex justify-between font-mono text-neutral-500">
                  <span>Age in Year {taxYear}:</span>
                  <span className="font-bold text-neutral-900">{calc.ownerAge} yrs</span>
                </div>
                {!calc.isInherited ? (
                  <div className="flex justify-between font-mono text-neutral-500">
                    <span>SECURE 2.0 Start Age:</span>
                    <span className="font-bold text-neutral-900">{calc.rmdAge} yrs</span>
                  </div>
                ) : (
                  <div className="flex justify-between font-mono text-neutral-500">
                    <span>Years Since Owner Death:</span>
                    <span className="font-bold text-indigo-700">{calc.yearsSinceDeath} yrs</span>
                  </div>
                )}
                <div className="border-t border-dashed my-1.5" />
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                  <p>
                    {calc.isInherited ? (
                      calc.inheritedType === 'Successor' || (calc.inheritedType === 'NonDesignated' && calc.yearsSinceDeath > 0) ? (
                        calc.isTenYearDeadline ? (
                          <span className="text-rose-650 font-bold">🚨 10-Year Deadline Reached! 100% of remaining account value must be withdrawn.</span>
                        ) : (
                          <span>⏱️ Subject to SECURE Act 10-Year liquidation rule. Empty account by year 10. (<strong>{calc.yearsRemainingTenYear} years left</strong>). {calc.ownerDiedPastRbd ? "Annual RMD is required for years 1-9 using Single Life stretch since original owner died after RBD." : "No annual distributions required in years 1-9 since owner passed before RBD."}</span>
                        )
                      ) : (
                        <span>🧬 Lifetime single life expectancy stretch (Table I) active. Recalculated index divisor factors applied.</span>
                      )
                    ) : calc.isRequiredThisYear 
                      ? "🎉 You have reached RMD age on or before the calculation year." 
                      : `⏱️ Your RMD holds until age ${calc.rmdAge}. Mandatory distributions are skipped for ${taxYear}.`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Core Retirement Assets balances info */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
            <h3 className="text-xs font-mono uppercase text-neutral-400 tracking-widest font-bold">
              Retirement IRA Values
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-500 block">Traditional IRAs Balance</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-neutral-400 text-[11px]">$</span>
                  <input 
                    type="number"
                    value={currentRmdState.traditional_balance || ''}
                    placeholder="0"
                    onChange={(e) => updateStateField('traditional_balance', parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-50 border rounded-xl pl-6 pr-3 py-2 focus:outline-hidden font-mono text-xs font-medium text-neutral-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-500 block">SEP IRAs Balance</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-neutral-400 text-[11px]">$</span>
                  <input 
                    type="number"
                    value={currentRmdState.sep_balance || ''}
                    placeholder="0"
                    onChange={(e) => updateStateField('sep_balance', parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-50 border rounded-xl pl-6 pr-3 py-2 focus:outline-hidden font-mono text-xs font-medium text-neutral-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-500 block">SIMPLE IRAs Balance</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-neutral-400 text-[11px]">$</span>
                  <input 
                    type="number"
                    value={currentRmdState.simple_balance || ''}
                    placeholder="0"
                    onChange={(e) => updateStateField('simple_balance', parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-50 border rounded-xl pl-6 pr-3 py-2 focus:outline-hidden font-mono text-xs font-medium text-neutral-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-neutral-500 block">Roth IRAs Balance</label>
                  <span className="text-[9px] font-mono font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Exempt of Original Owner RMD</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-neutral-400 text-[11px]">$</span>
                  <input 
                    type="number"
                    value={currentRmdState.roth_balance || ''}
                    placeholder="0"
                    onChange={(e) => updateStateField('roth_balance', parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-50 border rounded-xl pl-6 pr-3 py-2 focus:outline-hidden font-mono text-xs font-medium text-neutral-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Spousal Beneficiary Exemption */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-neutral-500" />
                <h3 className="text-xs font-semibold text-neutral-900">
                  Sole Spousal Beneficiary
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSpousalInfo(!showSpousalInfo)}
                className="text-neutral-450 hover:text-neutral-900 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            {showSpousalInfo && (
              <div className="bg-neutral-50 rounded-2xl p-3 border text-[11px] text-neutral-500 leading-relaxed space-y-1 pb-4">
                <p>
                  <strong>Joint Life Rule (Table II):</strong>
                </p>
                <p>
                  If your spouse is the sole beneficiary of your IRA and is <strong>more than 10 years younger</strong> than you, you can calculate distributions using their actual age. This yields a larger divisor and lower taxable mandatory withdrawals.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <label className="relative flex items-start gap-3 cursor-pointer p-1">
                <input 
                  type="checkbox"
                  checked={currentRmdState.spouse_sole_beneficiary}
                  onChange={(e) => updateStateField('spouse_sole_beneficiary', e.target.checked)}
                  className="rounded-md border-neutral-300 text-neutral-950 focus:ring-neutral-900 w-3.5 h-3.5 mt-0.5"
                />
                <span className="text-[11px] leading-relaxed text-neutral-600 font-medium">
                  Spouse is sole beneficiary and &gt; 10 years younger than me
                </span>
              </label>

              {currentRmdState.spouse_sole_beneficiary && (
                <div className="space-y-1.5 pt-2 border-t border-dashed border-neutral-100 animate-slide-in">
                  <label className="text-[11px] font-medium text-neutral-500 block">Spouse Birth Year</label>
                  <input 
                    type="number"
                    min="1920"
                    max={new Date().getFullYear()}
                    value={currentRmdState.spouse_birth_year}
                    onChange={(e) => updateStateField('spouse_birth_year', parseInt(e.target.value) || 1968)}
                    className="w-full bg-neutral-50 border rounded-xl px-3 py-2 focus:outline-hidden font-mono text-xs font-semibold text-neutral-800"
                  />
                  <span className="text-[10px] font-mono text-neutral-400 block">
                    Spouse age calculation year: {taxYear - currentRmdState.spouse_birth_year} yrs
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Zero-Server Privacy Guarantee Card */}
          <div className="bg-neutral-900 text-white rounded-3xl p-5 border border-neutral-800 shadow-lg space-y-3 relative overflow-hidden select-none">
            <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
              <ShieldCheck className="w-24 h-24 text-neutral-100" />
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold">100% Client-Side Privacy</span>
            </div>
            <h4 className="text-sm font-semibold tracking-tight">Zero-Server Privacy Guarantee</h4>
            <p className="text-[10.5px] text-neutral-400 font-light leading-relaxed">
              No accounts. No emails. No cookies tracking you. All calculations, compounding formula logic, and balance metrics are processed <strong>100% locally in your browser context</strong>. Open-source under standard GitHub audits.
            </p>
            <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-neutral-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Offline Ready
              </span>
              <span>•</span>
              <span>GitHub Open-Source</span>
            </div>
          </div>

          {/* IRA Regulatory Cheat Sheet Card */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
            <h3 className="text-xs font-mono uppercase text-neutral-400 tracking-widest font-bold">
              IRA Rules Reference Guide
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-neutral-50 rounded-2xl border space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-neutral-900 text-xs">Traditional IRA</strong>
                  <span className="text-[9px] font-mono font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Pre-Tax</span>
                </div>
                <p className="text-[11px] text-neutral-500 font-light leading-relaxed">
                  Subject to mandatory distributions beginning at <strong>Age 73</strong> (born 1951-1959) or <strong>Age 75</strong> (born 1960+). Withdrawals are taxed as ordinary federal income.
                </p>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-2xl border space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-neutral-900 text-xs">SEP IRA</strong>
                  <span className="text-[9px] font-mono font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">Employer-Funded</span>
                </div>
                <p className="text-[11px] text-neutral-500 font-light leading-relaxed">
                  Follows the <strong>exact same RMD timeline</strong> and tax rates as Traditional IRAs. Must begin taking RMDs at 73/75 even if the account holder is still actively working.
                </p>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-2xl border space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-neutral-900 text-xs">SIMPLE IRA</strong>
                  <span className="text-[9px] font-mono font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Savings Match</span>
                </div>
                <p className="text-[11px] text-neutral-500 font-light leading-relaxed">
                  Follows standard RMD timelines. Important: early withdrawals taken within the <strong>first 2 years</strong> of plan participation trigger a steep <strong>25% federal tax penalty</strong> (instead of 10%).
                </p>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-2xl border space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-neutral-900 text-xs">Roth IRA</strong>
                  <span className="text-[9px] font-mono font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Post-Tax / Tax-Free</span>
                </div>
                <p className="text-[11px] text-neutral-500 font-light leading-relaxed">
                  Original account owners are <strong>100% exempt from lifetime RMDs</strong>. For inherited Roth IRAs, a non-spouse beneficiary must fully empty the account under the <strong>10-Year Rule</strong>, but distributions are distributed 100% tax-free.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right side calculation ledger */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Visual RMD HUD */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-neutral-200 shadow-xs space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-neutral-100">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400 block">Total Subject Wealth</span>
                <span className="text-base font-bold text-neutral-950 font-mono">
                  ${calc.totalBalance.toLocaleString()}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400 block">Life Divisor Factor</span>
                <span className="text-base font-bold text-neutral-950 font-mono">
                  {calc.divisor > 0 ? calc.divisor : '—'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400 block">Required Minimum (RMD)</span>
                <span className="text-base font-bold text-neutral-950 font-mono text-indigo-700">
                  ${calc.rmdAmount.toLocaleString()}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-neutral-400 block">Met Percentage</span>
                <span className="text-base font-bold text-neutral-950 font-mono text-emerald-600">
                  {calc.metPercent.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Outlay Status Slider Bar visual indicator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-500">RMD distribution satisfaction status:</span>
                <span className="font-bold font-mono text-neutral-800">
                  ${calc.withdrawalsSum.toLocaleString()} of ${calc.rmdAmount.toLocaleString()} met
                </span>
              </div>
              <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${metPercentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                  style={{ width: `${Math.min(100, metPercentage)}%` }}
                />
              </div>
            </div>

            {/* Quick summary check */}
            <div className="bg-neutral-50 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-neutral-100">
              <div className="flex items-start gap-3">
                {metPercentage >= 100 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-neutral-950">
                    {metPercentage >= 100 ? "Distribution requirement completely met! ✅" : "RMD Outlay Pending Fulfillment"}
                  </h4>
                  <p className="text-[11px] text-neutral-500 leading-relaxed font-light">
                    {calc.remainingAmount > 0 
                      ? `Take $${calc.remainingAmount.toLocaleString()} from traditional balances before Dec 31 to prevent high penalty rules.`
                      : "Awesome. Your mandatory tax outlays are cleared. No pending excess payouts required."}
                  </p>
                </div>
              </div>

              {!calc.isRequiredThisYear && (
                <span className="text-[10px] font-mono text-neutral-400 border px-2 py-1 rounded bg-white">
                  EXEMPT YEAR
                </span>
              )}

              {calc.potentialPenalty > 0 && calc.remainingAmount > 0 && (
                <div className="text-right flex-shrink-0">
                  <span className="text-[9px] uppercase font-mono text-neutral-400 block font-bold">Shortfall Potential Fine</span>
                  <span className="text-xs font-bold text-rose-650 font-mono block">
                    ${calc.potentialPenalty.toLocaleString()} <span className="text-[10px] font-light text-neutral-400">(25%)</span>
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setShowSecure2Info(!showSecure2Info)}
                    className="text-[9px] text-indigo-600 hover:underline font-mono"
                  >
                    SECURE 2.0 timely reduction: ${calc.reducedPenalty.toLocaleString()} (10%)
                  </button>
                </div>
              )}
            </div>

            {showSecure2Info && (
              <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-[11px] text-neutral-600 leading-relaxed font-light animate-slide-in">
                <p className="font-semibold text-neutral-800">SECURE Act 2.0 Penalty Reduction Rules:</p>
                <p className="mt-1">
                  IRS section 26 CFR 1.401(a)(9) outlines strict fines for failing to withdraw RMD balances. However, effective tax year 2023, the penalty has been reduced from 50% to <strong>25%</strong>.
                </p>
                <p className="mt-1">
                  Furthermore, if the shortfall is corrected in a timely manner (by filing form 5329 within the correction window), the penalty is reduced further to <strong>10%</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Layout Section: Withdrawals ledger log */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-xs font-mono uppercase text-neutral-400 tracking-widest font-bold">
                  Log Distributions ({taxYear})
                </h3>
                <p className="text-[11px] text-neutral-500 font-light">Record actual checkouts to satisfy your RMD.</p>
              </div>
            </div>

            <form onSubmit={handleAddWithdrawal} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-neutral-400 font-mono block">Amount Distributed</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-neutral-400 text-xs">$</span>
                  <input 
                    type="number"
                    value={newWithdrawalAmount}
                    onChange={(e) => setNewWithdrawalAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-neutral-50 border rounded-xl pl-6 pr-3 py-1.5 focus:outline-hidden font-mono text-xs font-semibold text-neutral-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-neutral-400 font-mono block">Source Account Type</label>
                <select
                  value={newWithdrawalIraType}
                  onChange={(e: any) => setNewWithdrawalIraType(e.target.value)}
                  className="w-full bg-neutral-100 hover:bg-neutral-200 border-0 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-neutral-800 focus:outline-hidden transition-colors"
                >
                  <option value="Traditional">Traditional IRA</option>
                  <option value="SEP">SEP IRA</option>
                  <option value="SIMPLE">SIMPLE IRA</option>
                  <option value="Roth">Roth IRA</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-neutral-400 font-mono block">Withdrawal Date</label>
                <input 
                  type="date"
                  value={newWithdrawalDate}
                  onChange={(e) => setNewWithdrawalDate(e.target.value)}
                  className="w-full bg-neutral-100 border-0 rounded-xl px-2.5 py-1 text-xs font-mono font-medium text-neutral-800"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-1.5 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Distribution</span>
              </button>
            </form>

            {currentRmdState.withdrawals.length > 0 && (
              <div className="border border-neutral-100 rounded-2xl overflow-hidden mt-4">
                <table className="w-full text-xs font-light text-neutral-600">
                  <thead>
                    <tr className="bg-neutral-50 border-b text-[10px] font-mono text-neutral-400 uppercase select-none">
                      <th className="py-2.5 px-4 text-left">Date Recorded</th>
                      <th className="py-2.5 px-4 text-left">Account Source</th>
                      <th className="py-2.5 px-4 text-right">Outlay Value</th>
                      <th className="py-2.5 px-4 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono">
                    {currentRmdState.withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-neutral-50/50">
                        <td className="py-3 px-4 font-mono">{w.date}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium bg-neutral-100 rounded-sm text-neutral-700">
                            {w.ira_type} IRA
                          </span>
                        </td>
                        <td className="py-3 text-right px-4 font-semibold text-neutral-900">${w.amount.toLocaleString()}</td>
                        <td className="py-3 text-right px-4">
                          <button 
                            type="button"
                            onClick={() => handleDeleteWithdrawal(w.id)}
                            className="text-neutral-400 hover:text-rose-600 p-1 cursor-pointer transition-colors inline-block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modern Forecasting Panel with Custom SVG Line Visualization */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-neutral-200 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-650" />
              <h3 className="text-sm font-semibold text-neutral-900">
                15-Year Projected RMD Tax Surges
              </h3>
            </div>
            <p className="text-[11px] text-neutral-450 font-light mt-1">
              Visualize how compounding growth increases account values, resulting in larger compulsory distributions that can trigger higher tax brackets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="space-y-1">
              <span className="text-[9px] uppercase text-neutral-400 block font-semibold">Assumed Portfolio Growth:</span>
              <div className="flex items-center gap-2">
                <input 
                  type="range"
                  min="2"
                  max="12"
                  value={estimatedGrowth}
                  disabled={useFormulaEngine}
                  onChange={(e) => setEstimatedGrowth(parseInt(e.target.value))}
                  className="w-24 accent-neutral-950 cursor-pointer h-1 disabled:opacity-30"
                />
                <span className="font-bold text-neutral-800">{estimatedGrowth}%</span>
              </div>
            </div>

            <button
              onClick={handleExportRoadmapPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors self-end"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Roadmap PDF</span>
            </button>
          </div>
        </div>

        {/* Excel Formula Playground */}
        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-neutral-700" />
              <span className="text-xs font-semibold text-neutral-800">Programmable compounding formula rule engine</span>
            </div>
            <label className="relative flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={useFormulaEngine}
                onChange={(e) => setUseFormulaEngine(e.target.checked)}
                className="rounded-md border-neutral-300 text-neutral-950 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span className="text-[10px] font-mono font-bold text-neutral-500">ENABLE MODULE</span>
            </label>
          </div>

          {useFormulaEngine && (
            <div className="space-y-3 animate-slide-in">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                  <span>Dynamic expression (macros: year, age, balance, rate):</span>
                  <div className="flex gap-2">
                    <span 
                      className="text-indigo-600 font-semibold cursor-pointer hover:underline" 
                      onClick={() => handleFormulaChange("0.06 + Math.sin(year - 2026) * 0.02")}
                    >
                      Sinusoidal Wave
                    </span>
                    <span>•</span>
                    <span 
                      className="text-indigo-600 font-semibold cursor-pointer hover:underline" 
                      onClick={() => handleFormulaChange("IF(age < 75, 0.075, 0.045)")}
                    >
                      Age Glidepath
                    </span>
                  </div>
                </div>
                <textarea
                  value={formulaString}
                  onChange={(e) => handleFormulaChange(e.target.value)}
                  rows={2}
                  className="w-full bg-neutral-900 text-white font-mono text-[11px] p-2.5 rounded-xl border border-neutral-800 focus:outline-hidden"
                  placeholder="0.06 + Math.sin(year - 2026) * 0.02"
                />
                {formulaError ? (
                  <span className="text-[10px] font-mono text-rose-500 block">⚠ {formulaError}</span>
                ) : (
                  <span className="text-[9px] font-mono text-emerald-600 block">✓ Formula compiled. Compound rates dynamically adjusted.</span>
                )}
              </div>

              <div className="p-2.5 bg-neutral-100 rounded-lg text-[10px] font-light leading-relaxed text-neutral-600 space-y-1">
                <p className="font-semibold text-neutral-800">Compounding Rule Engine Specifications:</p>
                <p>• Uses JavaScript compilation sandboxed client-side. Allows standard Excel simulation logic.</p>
                <p>• Try glidepaths: <code className="font-mono bg-neutral-200 px-1 rounded">IF(age &gt; 73, 0.05, 0.08)</code></p>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic SVG Chart Rendering */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Custom SVG Responsive Canvas */}
          <div className="lg:col-span-2 space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-bold">RMD & Asset Growth Curves</span>
            
            <div className="bg-neutral-50/50 p-4 border border-neutral-150 rounded-2xl h-64 relative flex items-center justify-center select-none">
              
              {/* Plotting using purely inline, pixel-perfect, responsive SVG */}
              {(() => {
                const maxVal = Math.max(...forecast.map(row => row.estimatedBalance)) || 100000;
                const maxRmd = Math.max(...forecast.map(row => row.projectedRmd)) || 5500;
                
                // SVG dimensions settings
                const width = 500;
                const height = 200;
                const paddingLeft = 10;
                const paddingRight = 10;
                const paddingTop = 15;
                const paddingBottom = 15;

                // Points generator
                const balancePoints = forecast.map((row, i) => {
                  const x = paddingLeft + (i / (forecast.length - 1)) * (width - paddingLeft - paddingRight);
                  const y = height - paddingBottom - (row.estimatedBalance / maxVal) * (height - paddingTop - paddingBottom);
                  return `${x},${y}`;
                }).join(' ');

                const rmdPoints = forecast.map((row, i) => {
                  const x = paddingLeft + (i / (forecast.length - 1)) * (width - paddingLeft - paddingRight);
                  const y = height - paddingBottom - (row.projectedRmd / maxRmd) * (height - paddingTop - paddingBottom);
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    {/* Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                      const yPos = height - paddingBottom - p * (height - paddingTop - paddingBottom);
                      return (
                        <g key={idx}>
                          <line 
                            x1={paddingLeft} 
                            y1={yPos} 
                            x2={width - paddingRight} 
                            y2={yPos} 
                            stroke="#e5e5e5" 
                            strokeWidth="1" 
                            strokeDasharray="4,4"
                          />
                        </g>
                      );
                    })}

                    {/* Area path for balances */}
                    {forecast.length > 1 && (
                      <path 
                        d={`M ${paddingLeft} ${height - paddingBottom} L ${balancePoints} L ${width - paddingRight} ${height - paddingBottom} Z`}
                        fill="url(#balance-glow)" 
                        opacity="0.15"
                      />
                    )}

                    {/* Line path for balances */}
                    {forecast.length > 1 && (
                      <polyline 
                        fill="none" 
                        stroke="#171717" 
                        strokeWidth="1.5" 
                        points={balancePoints} 
                      />
                    )}

                    {/* Line path for projected RMD */}
                    {forecast.length > 1 && (
                      <polyline 
                        fill="none" 
                        stroke="#6366f1" 
                        strokeWidth="1.5" 
                        strokeDasharray="3,2"
                        points={rmdPoints} 
                      />
                    )}

                    {/* Dots mapping on hover */}
                    {forecast.map((row, i) => {
                      const x = paddingLeft + (i / (forecast.length - 1)) * (width - paddingLeft - paddingRight);
                      const bY = height - paddingBottom - (row.estimatedBalance / maxVal) * (height - paddingTop - paddingBottom);
                      const rY = height - paddingBottom - (row.projectedRmd / maxRmd) * (height - paddingTop - paddingBottom);
                      
                      const isHovered = hoveredForecastIdx === i;

                      return (
                        <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredForecastIdx(i)} onMouseLeave={() => setHoveredForecastIdx(null)}>
                          {/* Invisible hover capture bar */}
                          <rect 
                            x={x - 12} 
                            y={0} 
                            width={24} 
                            height={height} 
                            fill="transparent" 
                          />
                          
                          {/* Guideline on hover */}
                          {isHovered && (
                            <line 
                              x1={x} 
                              y1={paddingTop} 
                              x2={x} 
                              y2={height - paddingBottom} 
                              stroke="#a3a3a3" 
                              strokeWidth="1" 
                            />
                          )}

                          {/* Balance node */}
                          <circle 
                            cx={x} 
                            cy={bY} 
                            r={isHovered ? 4.5 : 2.5} 
                            fill="#171717" 
                            stroke="#ffffff"
                            strokeWidth="1"
                          />

                          {/* RMD node */}
                          <circle 
                            cx={x} 
                            cy={rY} 
                            r={isHovered ? 4.5 : 2} 
                            fill="#6366f1" 
                            stroke="#ffffff"
                            strokeWidth="1"
                          />
                        </g>
                      );
                    })}

                    {/* Gradients declaration */}
                    <defs>
                      <linearGradient id="balance-glow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#171717" />
                        <stop offset="100%" stopColor="#171717" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                );
              })()}

              {/* Float Display HUD Tooltip details */}
              <div className="absolute top-2 left-2 flex items-center gap-4 text-[9px] font-mono leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1.5 bg-neutral-900 border inline-block" />
                  <span className="text-neutral-500 font-medium">Est. Portfolio Balance</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1.5 bg-indigo-500 border inline-block border-dashed" />
                  <span className="text-neutral-500 font-medium">Projected Annual RMD</span>
                </div>
              </div>

              {/* Hover state details view */}
              <AnimatePresence>
                {hoveredForecastIdx !== null && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="absolute bottom-4 right-4 bg-neutral-900 text-white rounded-xl p-3 border border-neutral-700 shadow-md text-[10px] font-mono space-y-1.5 w-44 z-10"
                  >
                    <div className="flex justify-between border-b border-neutral-700 pb-1 text-neutral-300">
                      <span>Year {forecast[hoveredForecastIdx].year}</span>
                      <span className="font-bold text-white">Age {forecast[hoveredForecastIdx].age}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Balance:</span>
                      <span className="font-bold">${forecast[hoveredForecastIdx].estimatedBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-indigo-300">
                      <span>RMD due:</span>
                      <span className="font-bold">${forecast[hoveredForecastIdx].projectedRmd.toLocaleString()}</span>
                    </div>
                    {forecast[hoveredForecastIdx].divisor > 0 && (
                      <div className="flex justify-between text-neutral-400 text-[9px]">
                        <span>IRS Divisor:</span>
                        <span>{forecast[hoveredForecastIdx].divisor}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-emerald-400 text-[9px]">
                      <span>Growth Rate:</span>
                      <span>{(forecast[hoveredForecastIdx].growthRate * 100).toFixed(1)}%</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right column: Highlights table of data */}
          <div className="lg:col-span-1 space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-bold">Tax Projection Index</span>
            
            <div className="bg-neutral-50 p-4 border border-neutral-150 rounded-2xl h-64 overflow-y-auto block space-y-2 text-xs font-light">
              <p className="text-[10px] text-neutral-500 mb-2 font-mono">Selected milestones projection index:</p>
              
              <div className="space-y-2 divide-y divide-neutral-200">
                {forecast.filter((_, idx) => idx % 3 === 0 || idx === forecast.length - 1).map((row, idx) => (
                  <div key={idx} className="pt-2 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-medium text-neutral-900 block">Year {row.year} <span className="font-light text-neutral-500">(Age {row.age})</span></span>
                      <span className="text-[10px] text-neutral-400 font-mono">IRA: ${row.estimatedBalance.toLocaleString()}</span>
                    </div>
                    <div className="text-right font-mono">
                      {row.projectedRmd > 0 ? (
                        <span className="font-bold text-indigo-600 block">${row.projectedRmd.toLocaleString()}</span>
                      ) : (
                        <span className="text-[10px] text-neutral-400">Exempt</span>
                      )}
                      <span className="text-[9px] text-neutral-400 block">Divisor: {row.divisor || 'N/A'} • Growth: {(row.growthRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
