import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  StateSchema, 
  LedgerItem, 
  Portfolio, 
  Transaction 
} from './types';
import BalanceSheetComponent from './components/BalanceSheet';
import BudgetPlanner from './components/BudgetPlanner';
import PortfolioCustomizer from './components/PortfolioCustomizer';
import TimeHorizonEngine from './components/TimeHorizonEngine';
import GeminiAdvisor from './components/GeminiAdvisor';
import CryptoBackup from './components/CryptoBackup';
import RmdCalculator from './components/RmdCalculator';
import EducationCenter from './components/EducationCenter';
import { 
  Briefcase, 
  Wallet, 
  PieChart, 
  LineChart as LineChartIcon, 
  Bot, 
  Download, 
  X,
  AlertTriangle,
  Building,
  ShieldCheck,
  Globe,
  Settings,
  Scale,
  Clock,
  BookOpen
} from 'lucide-react';

// Default initial state payload matching exactly the requested local-state.json schema
const DEFAULT_INITIAL_STATE: StateSchema = {
  user_profile: {
    target_retirement_age: 60,
    annual_spending_target: 75000,
    api_key_gemini: ''
  },
  balance_sheet: {
    assets: [
      { id: 'a1', name: 'Checking Account', category: 'Cash', value: 12500 },
      { id: 'a2', name: 'Brokerage', category: 'Investments', value: 85000 }
    ],
    liabilities: [
      { id: 'l1', name: 'Car Loan', category: 'Debt', value: 14000 }
    ]
  },
  portfolios: [
    {
      portfolio_name: 'Aggressive Growth',
      allocation: [
        { ticker: 'VTI', percentage: 70, asset_class: 'US Equity' },
        { ticker: 'VXUS', percentage: 20, asset_class: 'Intl Equity' },
        { ticker: 'BTC', percentage: 10, asset_class: 'Crypto' }
      ]
    },
    {
      portfolio_name: 'Conservative Income',
      allocation: [
        { ticker: 'VTI', percentage: 40, asset_class: 'US Equity' },
        { ticker: 'BND', percentage: 60, asset_class: 'Fixed Income' }
      ]
    }
  ],
  transactions: [
    { id: 't1', date: '2026-05-15', description: 'Landlord Housing Rent', amount: 1800, group: 'Needs', category: 'Housing' },
    { id: 't2', date: '2026-05-16', description: 'Whole Foods Market', amount: 180, group: 'Needs', category: 'Groceries' },
    { id: 't3', date: '2026-05-18', description: 'Starbucks Coffee', amount: 16, group: 'Wants', category: 'Dining & Cafes' },
    { id: 't4', date: '2026-05-20', description: 'Vanguard Roth Deposit', amount: 500, group: 'Savings', category: 'Investments' }
  ],
  monthly_income: 6500
};

// Blank slate state for users who want to start from scratch with a completely zeroed-out ledger.
const BLANK_INITIAL_STATE: StateSchema = {
  user_profile: {
    target_retirement_age: 65,
    annual_spending_target: 60000,
    api_key_gemini: ''
  },
  balance_sheet: {
    assets: [],
    liabilities: []
  },
  portfolios: [],
  transactions: [],
  monthly_income: 0,
  rmd_state: {
    birth_year: 1953,
    traditional_balance: 0,
    sep_balance: 0,
    simple_balance: 0,
    roth_balance: 0,
    spouse_sole_beneficiary: false,
    spouse_birth_year: 1968,
    withdrawals: []
  }
};

export default function App() {
  const [state, setState] = useState<StateSchema>(DEFAULT_INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'balance' | 'budget' | 'portfolio' | 'simulation' | 'copilot' | 'rmd' | 'vault' | 'education'>('balance');
  const [isDataDirty, setIsDataDirty] = useState(false);
  const [showEvictionAlert, setShowEvictionAlert] = useState(true);

  // Load state from localStorage on init
  useEffect(() => {
    const cached = localStorage.getItem('financeforge_local_state');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.user_profile && parsed.balance_sheet) {
          setState(parsed);
        }
      } catch (err) {
        console.error('Core local cache parsing failed:', err);
      }
    }
  }, []);

  // Sync state to localStorage on every update
  const updateState = (updates: Partial<StateSchema>) => {
    const nextState = { ...state, ...updates };
    setState(nextState);
    localStorage.setItem('financeforge_local_state', JSON.stringify(nextState));
    setIsDataDirty(true);
  };

  // Profile parameter adjustments
  const handleUpdateProfile = (age: number, spending: number) => {
    updateState({
      user_profile: {
        ...state.user_profile,
        target_retirement_age: age,
        annual_spending_target: spending
      }
    });
  };

  const handleUpdateApiKey = (key: string) => {
    updateState({
      user_profile: {
        ...state.user_profile,
        api_key_gemini: key
      }
    });
  };

  // Re-run completely with imported backup configurations
  const handleRestoreState = (restored: StateSchema) => {
    setState(restored);
    localStorage.setItem('financeforge_local_state', JSON.stringify(restored));
    setIsDataDirty(false); // reset warning since they just recovered
  };

  const handleResetToBlankSlate = () => {
    setState(BLANK_INITIAL_STATE);
    localStorage.setItem('financeforge_local_state', JSON.stringify(BLANK_INITIAL_STATE));
    setIsDataDirty(false);
    alert('Local browser ledger reset to a completely clean, empty canvas.');
  };

  const handleResetToDemoData = () => {
    setState(DEFAULT_INITIAL_STATE);
    localStorage.setItem('financeforge_local_state', JSON.stringify(DEFAULT_INITIAL_STATE));
    setIsDataDirty(false);
    alert('Standard practice sandbox demo template successfully loaded.');
  };

  // Extract totals for active investment allocation checks
  const totalAssetsValue = state.balance_sheet.assets.reduce((sum, item) => sum + item.value, 0);
  const totalLiabilitiesValue = state.balance_sheet.liabilities.reduce((sum, item) => sum + item.value, 0);
  const investmentAssets = state.balance_sheet.assets.filter(a => a.category === 'Investments').reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="min-h-screen bg-neutral-50/50 text-neutral-800 font-sans antialiased flex flex-col selection:bg-neutral-900 selection:text-white">
      
      {/* Decorative accent board top */}
      <div className="h-1 bg-neutral-900 w-full" />

      {/* Dynamic eviction alert banner */}
      {showEvictionAlert && isDataDirty && (
        <div className="bg-amber-650 text-amber-900 bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs font-medium relative transition-all animate-slide-in print:hidden">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 animate-pulse" />
            <span>
              <strong>Local changes unsaved to file backup.</strong> Web Storage can be automatically evicted if this device fills up. Please generate an <button onClick={() => setActiveTab('vault')} className="underline font-bold text-neutral-950 cursor-pointer">encrypted backup file (.json)</button> to safeguard your balances.
            </span>
          </div>
          <button onClick={() => setShowEvictionAlert(false)} className="hover:text-black p-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Global Sandbox Navigation Bar */}
      <header className="bg-white border-b border-neutral-200/80 sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-lg shadow-md">
              F
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900 tracking-tight font-sans">
                FinanceForge
              </h1>
              <span className="text-[10px] font-mono uppercase text-emerald-600 block tracking-wider font-semibold">Privacy Financial planner</span>
            </div>
          </div>

          {/* Quick Indicators HUD */}
          <div className="flex items-center gap-4 text-xs font-mono select-none">
            <div className="flex items-center gap-1.5 bg-neutral-150 px-3 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Client-Only Sandboxing</span>
            </div>
            
            <div className="hidden sm:flex items-center gap-1 bg-neutral-100 px-2 py-1 rounded text-[10px] text-neutral-400">
              <Globe className="w-3 h-3" />
              <span>Offline Ready</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container workspace */}
      <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 flex-grow flex flex-col lg:flex-row gap-8 print:block print:p-0 print:gap-0">
        
        {/* Navigation Sidebar & Setup Module */}
        <aside className="w-full lg:w-64 flex flex-col gap-6 flex-shrink-0 print:hidden">
          
          {/* Core Menu Tabs */}
          <div className="bg-white rounded-3xl border border-neutral-200 p-4 space-y-1.5 shadow-xs">
            <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase block mb-2 px-2.5 font-bold">Suite Modules</span>
            
            <button
              onClick={() => setActiveTab('balance')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-all cursor-pointer ${
                activeTab === 'balance' 
                  ? 'bg-neutral-900 text-white shadow-md' 
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Balance Sheet & Ledger</span>
            </button>

            <button
              onClick={() => setActiveTab('budget')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-all cursor-pointer ${
                activeTab === 'budget' 
                  ? 'bg-neutral-900 text-white shadow-md' 
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Cash Flow & Budgeting</span>
            </button>

            <button
              onClick={() => setActiveTab('portfolio')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-all cursor-pointer ${
                activeTab === 'portfolio' 
                  ? 'bg-neutral-900 text-white shadow-md' 
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Portfolio Allocator</span>
            </button>

            <button
              onClick={() => setActiveTab('simulation')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-all cursor-pointer ${
                activeTab === 'simulation' 
                  ? 'bg-neutral-900 text-white shadow-md' 
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <LineChartIcon className="w-4 h-4" />
              <span>Projections & Simulations</span>
            </button>

            <button
              onClick={() => setActiveTab('copilot')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-all cursor-pointer ${
                activeTab === 'copilot' 
                  ? 'bg-neutral-900 text-white shadow-md' 
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>AI Deep Advisor Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('rmd')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-all cursor-pointer ${
                activeTab === 'rmd' 
                  ? 'bg-neutral-900 text-white shadow-md' 
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>RMD Tax Planner</span>
            </button>

            <button
              onClick={() => setActiveTab('education')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-all cursor-pointer ${
                activeTab === 'education' 
                  ? 'bg-neutral-900 text-white shadow-md' 
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Tax Library</span>
            </button>

            <button
              onClick={() => setActiveTab('vault')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-all cursor-pointer ${
                activeTab === 'vault' 
                  ? 'bg-neutral-900 text-white shadow-md' 
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Encrypted Export Vault</span>
            </button>
          </div>

          {/* User Parameters Sidebar Drawer */}
          <div className="bg-white rounded-3xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Settings className="w-4 h-4 text-neutral-500" />
              <span className="text-xs font-semibold text-neutral-950">Target Demographics Goal</span>
            </div>

            <div className="space-y-4 text-xs font-light">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block font-semibold">Retirement Age Milestone</span>
                <input
                  type="range"
                  min="40"
                  max="80"
                  value={state.user_profile.target_retirement_age}
                  onChange={e => handleUpdateProfile(parseInt(e.target.value), state.user_profile.annual_spending_target)}
                  className="w-full accent-neutral-900 cursor-pointer h-1 rounded-lg"
                />
                <div className="flex justify-between font-mono font-medium text-neutral-900 mt-1">
                  <span>Target Age:</span>
                  <span>{state.user_profile.target_retirement_age} years</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-dashed border-neutral-100">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block font-semibold">Annual Retirement Spend target</span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-neutral-450">$</span>
                  <input
                    type="number"
                    value={state.user_profile.annual_spending_target}
                    onChange={e => handleUpdateProfile(state.user_profile.target_retirement_age, parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-100/60 border rounded-lg pl-6 pr-2.5 py-1.5 focus:outline-hidden font-mono text-right font-medium text-neutral-850"
                  />
                </div>
              </div>
            </div>
          </div>

        </aside>

        {/* Dynamic Panel Canvas */}
        <section className="flex-grow print:w-full print:p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="min-h-[500px]"
            >
              
              {activeTab === 'balance' && (
                <BalanceSheetComponent
                  assets={state.balance_sheet.assets}
                  liabilities={state.balance_sheet.liabilities}
                  onChange={(assets, liabilities) => {
                    updateState({
                      balance_sheet: { assets, liabilities }
                    });
                  }}
                  onResetToBlank={handleResetToBlankSlate}
                  onResetToDemo={handleResetToDemoData}
                />
              )}

              {activeTab === 'budget' && (
                <BudgetPlanner
                  transactions={state.transactions}
                  monthlyIncome={state.monthly_income}
                  onIncomeChange={(monthly_income) => updateState({ monthly_income })}
                  onTransactionsChange={(transactions) => updateState({ transactions })}
                />
              )}

              {activeTab === 'portfolio' && (
                <PortfolioCustomizer
                  portfolios={state.portfolios}
                  onPortfoliosChange={(portfolios) => updateState({ portfolios })}
                  investmentsTotal={investmentAssets}
                />
              )}

              {activeTab === 'simulation' && (
                <TimeHorizonEngine
                  portfolios={state.portfolios}
                  totalEquity={investmentAssets}
                  annualSpendingTarget={state.user_profile.annual_spending_target}
                  onPortfoliosChange={(portfolios) => updateState({ portfolios })}
                />
              )}

              {activeTab === 'copilot' && (
                <GeminiAdvisor
                  appState={state}
                  onApiKeyChange={handleUpdateApiKey}
                />
              )}

              {activeTab === 'rmd' && (
                <RmdCalculator
                  assets={state.balance_sheet.assets}
                  rmdState={state.rmd_state}
                  onChange={(rmd_state) => updateState({ rmd_state })}
                />
              )}

              {activeTab === 'education' && (
                <EducationCenter />
              )}

              {activeTab === 'vault' && (
                <CryptoBackup
                  appState={state}
                  onRestoreState={handleRestoreState}
                />
              )}

            </motion.div>
          </AnimatePresence>
        </section>

      </main>

      {/* Sandboxed Local footer metadata */}
      <footer className="bg-white border-t border-neutral-200 py-6 text-center text-[10px] font-mono text-neutral-400 select-none print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span>FinanceForge v1.1.0 • Privacy Secured Cockpit</span>
          <span className="max-w-md sm:text-right text-[9px] text-neutral-400 leading-normal font-sans">
            <strong>Disclaimer:</strong> Free educational tool. Calculations and AI outputs are for illustrative simulations only and do not constitute professional financial, investment, legal, or tax advice.
          </span>
        </div>
      </footer>

    </div>
  );
}
