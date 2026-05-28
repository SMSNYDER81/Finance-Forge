import { Portfolio, LedgerItem, Transaction } from '../types';

// Map common tickers to historical statistical footprints (expected returns and volatilities)
export const TICKER_DETAILS: Record<string, { name: string, return: number, volatility: number, class: string }> = {
  // Index & Global Diversified ETFs
  VTI: { name: 'Vanguard Total Stock Market ETF', return: 0.095, volatility: 0.150, class: 'US Equity' },
  VOO: { name: 'Vanguard S&P 500 ETF', return: 0.098, volatility: 0.150, class: 'US Equity' },
  SPY: { name: 'SPDR S&P 500 ETF Trust', return: 0.100, volatility: 0.155, class: 'US Equity' },
  QQQ: { name: 'Invesco QQQ Trust (Nasdaq 100)', return: 0.125, volatility: 0.185, class: 'US Equity' },
  VXUS: { name: 'Vanguard Total International Stock ETF', return: 0.075, volatility: 0.165, class: 'Intl Equity' },
  VT: { name: 'Vanguard Total World Stock ETF', return: 0.085, volatility: 0.155, class: 'Intl Equity' },
  IWM: { name: 'iShares Russell 2000 ETF (Small Cap)', return: 0.082, volatility: 0.190, class: 'US Equity' },
  VEA: { name: 'Vanguard Developed Markets Index ETF', return: 0.072, volatility: 0.160, class: 'Intl Equity' },
  VWO: { name: 'Vanguard FTSE Emerging Markets ETF', return: 0.078, volatility: 0.195, class: 'Intl Equity' },
  
  // Dividend & Factor ETFs
  SCHD: { name: 'Schwab U.S. Dividend Equity ETF', return: 0.092, volatility: 0.135, class: 'US Equity' },
  VYM: { name: 'Vanguard High Dividend Yield ETF', return: 0.088, volatility: 0.138, class: 'US Equity' },
  AVUV: { name: 'Avantis U.S. Small Cap Value ETF', return: 0.105, volatility: 0.210, class: 'US Equity' },
  VUG: { name: 'Vanguard Growth ETF', return: 0.120, volatility: 0.180, class: 'US Equity' },
  VTV: { name: 'Vanguard Value ETF', return: 0.085, volatility: 0.140, class: 'US Equity' },

  // Fixed Income (Bonds & Treasuries)
  BND: { name: 'Vanguard Total Bond Market ETF', return: 0.042, volatility: 0.055, class: 'Fixed Income' },
  AGG: { name: 'iShares Core U.S. Aggregate Bond ETF', return: 0.040, volatility: 0.050, class: 'Fixed Income' },
  GOVT: { name: 'iShares U.S. Treasury Bond ETF', return: 0.038, volatility: 0.045, class: 'Fixed Income' },
  IEF: { name: 'iShares 7-10 Year Treasury Bond ETF', return: 0.040, volatility: 0.065, class: 'Fixed Income' },
  TLT: { name: 'iShares 20+ Year Treasury Bond ETF', return: 0.045, volatility: 0.140, class: 'Fixed Income' },
  BIL: { name: 'SPDR Bloomberg 1-3 Month T-Bill ETF', return: 0.035, volatility: 0.008, class: 'Fixed Income' },
  LQD: { name: 'iShares iBoxx $ Investment Grade Corporate Bond', return: 0.052, volatility: 0.080, class: 'Fixed Income' },
  HYG: { name: 'iShares iBoxx $ High Yield Corporate Bond', return: 0.065, volatility: 0.105, class: 'Fixed Income' },

  // Selected High-Demand Equities
  AAPL: { name: 'Apple Inc.', return: 0.130, volatility: 0.220, class: 'US Equity' },
  MSFT: { name: 'Microsoft Corporation', return: 0.135, volatility: 0.210, class: 'US Equity' },
  GOOGL: { name: 'Alphabet Inc. (Class A)', return: 0.122, volatility: 0.230, class: 'US Equity' },
  AMZN: { name: 'Amazon.com, Inc.', return: 0.125, volatility: 0.250, class: 'US Equity' },
  NVDA: { name: 'NVIDIA Corporation', return: 0.180, volatility: 0.380, class: 'US Equity' },
  TSLA: { name: 'Tesla, Inc.', return: 0.155, volatility: 0.450, class: 'US Equity' },
  META: { name: 'Meta Platforms, Inc.', return: 0.130, volatility: 0.270, class: 'US Equity' },
  JPM: { name: 'JPMorgan Chase & Co.', return: 0.098, volatility: 0.185, class: 'US Equity' },
  V: { name: 'Visa Inc.', return: 0.110, volatility: 0.165, class: 'US Equity' },
  LLY: { name: 'Eli Lilly and Company', return: 0.145, volatility: 0.240, class: 'US Equity' },

  // Crypto Assets
  BTC: { name: 'Bitcoin (BTC)', return: 0.250, volatility: 0.550, class: 'Crypto' },
  ETH: { name: 'Ethereum (ETH)', return: 0.280, volatility: 0.650, class: 'Crypto' },
  SOL: { name: 'Solana (SOL)', return: 0.350, volatility: 0.850, class: 'Crypto' },

  // Commodities & Alternative Real Estate
  GLD: { name: 'SPDR Gold Shares', return: 0.060, volatility: 0.120, class: 'Other' },
  VNQ: { name: 'Vanguard Real Estate ETF (REIT)', return: 0.075, volatility: 0.175, class: 'Other' },
  IAU: { name: 'iShares Gold Trust', return: 0.060, volatility: 0.120, class: 'Other' },
  USO: { name: 'United States Oil Fund LP', return: 0.055, volatility: 0.320, class: 'Other' },
};

export const DEFAULT_TICKER_STATS = { name: 'Custom Asset', return: 0.080, volatility: 0.150, class: 'Other' };

// Runtime registry to hold tickers found dynamically via the public search API
export const DYNAMIC_TICKER_REGISTRY: Record<string, { name: string, return: number, volatility: number, class: string }> = {};

export function registerDynamicTicker(symbol: string, name: string, type?: string) {
  const upperSymbol = symbol.toUpperCase().trim();
  if (TICKER_DETAILS[upperSymbol] || DYNAMIC_TICKER_REGISTRY[upperSymbol]) return;

  // Intelligent deduction of reasonable return & volatility proxies based on name/category
  let assetClass = 'US Equity';
  let estReturn = 0.095;
  let estVolatility = 0.160;

  const lowerName = name.toLowerCase();
  const lowerType = (type || '').toLowerCase();

  const isBonds = 
    lowerName.includes('bond') || 
    lowerName.includes('treasury') || 
    lowerName.includes('fixed income') || 
    lowerName.includes('yield') || 
    lowerName.includes('debt') || 
    lowerName.includes('bill') ||
    lowerType.includes('bond') ||
    lowerType.includes('fixedincome');

  const isCrypto = 
    lowerName.includes('bitcoin') || 
    lowerName.includes('ethereum') || 
    lowerName.includes('crypto') || 
    lowerName.includes('solana') || 
    lowerType.includes('coin') || 
    lowerType.includes('crypto');

  const isAlt = 
    lowerName.includes('real estate') || 
    lowerName.includes('reit') || 
    lowerName.includes('property') || 
    lowerName.includes('gold') || 
    lowerName.includes('commodity') || 
    lowerName.includes('silver') || 
    lowerName.includes('oil') ||
    lowerType.includes('reit') ||
    lowerType.includes('commodity');

  const isIntl = 
    lowerName.includes('international') || 
    lowerName.includes('global') || 
    lowerName.includes('emerging') || 
    lowerName.includes('ex-us') || 
    lowerName.includes('europe') || 
    lowerName.includes('asia');

  if (isCrypto) {
    assetClass = 'Crypto';
    estReturn = 0.240;
    estVolatility = 0.600;
  } else if (isBonds) {
    assetClass = 'Fixed Income';
    estReturn = 0.042;
    estVolatility = 0.055;
  } else if (isAlt) {
    assetClass = 'Other';
    estReturn = 0.068;
    estVolatility = 0.150;
  } else if (isIntl) {
    assetClass = 'Intl Equity';
    estReturn = 0.078;
    estVolatility = 0.165;
  }

  DYNAMIC_TICKER_REGISTRY[upperSymbol] = {
    name,
    return: estReturn,
    volatility: estVolatility,
    class: assetClass
  };
}

export function getTickerStats(ticker: string) {
  const upper = ticker.toUpperCase().trim();
  return TICKER_DETAILS[upper] || DYNAMIC_TICKER_REGISTRY[upper] || { ...DEFAULT_TICKER_STATS, name: `${upper} Asset` };
}

// Calculate portfolio stats from its allocations
export function calculatePortfolioStats(portfolio: Portfolio) {
  let weightedReturn = 0;
  let weightedVolatility = 0; // Simple approximation (can add correlation matrix adjustments or standard model)
  let totalPct = 0;

  portfolio.allocation.forEach(alloc => {
    const stats = getTickerStats(alloc.ticker);
    const weight = alloc.percentage / 100;
    weightedReturn += stats.return * weight;
    weightedVolatility += stats.volatility * weight; // linear sum for simple proxy
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
}

// Box-Muller transform to get a standard normal Gaussian distribution variable
export function randomNormal(): number {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Monte Carlo simulator running 10,000 distinct trials in the client.
 * Starting wealth: total cash & investments.
 * Inputs: expected return, volatility, annual contributions, annual retirement spending target.
 * We run simulation from age (start_age) to 95.
 */
export interface MonteCarloInput {
  startingWealth: number;
  currentAge: number;
  retirementAge: number;
  annualContribution: number;
  annualRetirementSpending: number;
  portfolio: Portfolio;
  yearsToRun?: number;
}

export interface MonteCarloResult {
  years: number[];
  percentile10: number[];  // Conservative/unfavorable
  percentile50: number[];  // Median
  percentile90: number[];  // Favorable
  successRate: number;      // % of trials with wealth > 0 at end
}

export function runMonteCarloSimulation(input: MonteCarloInput): MonteCarloResult {
  const {
    startingWealth,
    currentAge,
    retirementAge,
    annualContribution,
    annualRetirementSpending,
    portfolio
  } = input;

  const yearsToPlan = 95 - currentAge;
  const numTrials = 10000;
  
  const stats = calculatePortfolioStats(portfolio);
  const mu = stats.expectedReturn;
  const sigma = stats.volatility;

  // Pre-allocate trials grid
  // Col = year, Row = trial
  const wealthGrid: Float32Array[] = Array.from({ length: numTrials }, () => new Float32Array(yearsToPlan + 1));

  // Initialize starting wealth
  for (let t = 0; t < numTrials; t++) {
    wealthGrid[t][0] = startingWealth;
  }

  // Iterate over retirement periods
  for (let y = 1; y <= yearsToPlan; y++) {
    const currentYearAge = currentAge + y - 1;
    const isRetired = currentYearAge >= retirementAge;
    const netCashFlow = isRetired ? -annualRetirementSpending : annualContribution;

    for (let t = 0; t < numTrials; t++) {
      const priorWealth = wealthGrid[t][y - 1];
      if (priorWealth <= 0) {
        wealthGrid[t][y] = 0;
        continue;
      }

      // Lognormal asset growth standard formulation:
      // S_t = S_{t-1} * exp((mu - 0.5 * sigma^2) + sigma * Z)
      const randomShock = randomNormal();
      const organicReturn = Math.exp((mu - 0.5 * sigma * sigma) + sigma * randomShock);
      let newWealth = priorWealth * organicReturn + netCashFlow;
      
      if (newWealth < 0) {
        newWealth = 0;
      }
      wealthGrid[t][y] = newWealth;
    }
  }

  // Extract percentiles for each year
  const years = Array.from({ length: yearsToPlan + 1 }, (_, i) => currentAge + i);
  const p10: number[] = [];
  const p50: number[] = [];
  const p90: number[] = [];
  let successfulTrialsAtEnd = 0;

  for (let y = 0; y <= yearsToPlan; y++) {
    // Collect all wealth stats for year y
    const yearWealths = new Float32Array(numTrials);
    for (let t = 0; t < numTrials; t++) {
      yearWealths[t] = wealthGrid[t][y];
    }
    // Sort array to extract percentiles
    yearWealths.sort();

    // 10th percentile is near index numTrials * 0.10
    p10.push(Math.round(yearWealths[Math.floor(numTrials * 0.10)]));
    // 50th percentile is median
    p50.push(Math.round(yearWealths[Math.floor(numTrials * 0.50)]));
    // 90th percentile is high return trial
    p90.push(Math.round(yearWealths[Math.floor(numTrials * 0.90)]));

    if (y === yearsToPlan) {
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
}

// Time Horizon Comparison projection (deterministic comparison of up to 3 portfolios over variable timelines)
export function projectTimeHorizon(
  portfolios: { name: string, portfolio: Portfolio }[],
  initialWealth: number,
  annualSavings: number,
  retirementAge: number,
  currentAge: number,
  numYears: number
): { years: number[], lines: Record<string, number[]> } {
  const years = Array.from({ length: numYears + 1 }, (_, i) => currentAge + i);
  const lines: Record<string, number[]> = {};

  portfolios.forEach(p => {
    const stats = calculatePortfolioStats(p.portfolio);
    const r = stats.expectedReturn;
    const wealthPath: number[] = [initialWealth];
    let currentWealth = initialWealth;

    for (let y = 1; y <= numYears; y++) {
      const isPostRetirement = (currentAge + y - 1) >= retirementAge;
      // In deteministic analysis, we simply apply compound growth
      const contribution = isPostRetirement ? 0 : annualSavings;
      currentWealth = currentWealth * (1 + r) + contribution;
      if (currentWealth < 0) currentWealth = 0;
      wealthPath.push(Math.round(currentWealth));
    }
    lines[p.name] = wealthPath;
  });

  return { years, lines };
}

// Rebalancing Recommendations logic
export interface RebalanceRecommendation {
  ticker: string;
  assetClass: string;
  currentPercentage: number;
  targetPercentage: number;
  currentValue: number;
  targetValue: number;
  differenceValue: number; // target - current: positive means buy, negative sell
  action: 'Buy' | 'Sell' | 'Hold';
}

export function calculateRebalancing(
  allocation: { ticker: string, percentage: number, asset_class: string }[],
  currentAssets: { ticker: string, value: number }[]
): {
  recommendations: RebalanceRecommendation[];
  trackingError: number; // Root Mean Square Error (RMSE) of percent drift
} {
  const totalAssetValue = currentAssets.reduce((sum, item) => sum + item.value, 0);

  // Map allocations by ticker
  const targetMap = new Map<string, typeof allocation[0]>();
  allocation.forEach(a => targetMap.set(a.ticker.toUpperCase(), a));

  // Combine target allocations and actual values
  const allTickers = new Set<string>();
  allocation.forEach(a => allTickers.add(a.ticker.toUpperCase()));
  currentAssets.forEach(a => allTickers.add(a.ticker.toUpperCase()));

  const recommendations: RebalanceRecommendation[] = [];
  let sumSquaredDrift = 0;

  allTickers.forEach(ticker => {
    const targetInfo = targetMap.get(ticker);
    const targetPercent = targetInfo ? targetInfo.percentage : 0;
    const assetClass = targetInfo ? targetInfo.asset_class : 'Other';

    const actualItem = currentAssets.find(a => a.ticker.toUpperCase() === ticker);
    const actualValue = actualItem ? actualItem.value : 0;
    
    // Percentages
    const currentPercent = totalAssetValue > 0 ? (actualValue / totalAssetValue) * 100 : 0;
    const targetValue = Math.round((targetPercent / 100) * totalAssetValue);
    const differenceValue = targetValue - actualValue;

    const percentDrift = currentPercent - targetPercent;
    sumSquaredDrift += percentDrift * percentDrift;

    let action: 'Buy' | 'Sell' | 'Hold' = 'Hold';
    if (Math.abs(percentDrift) > 1) { // 1% threshold
      action = differenceValue > 0 ? 'Buy' : 'Sell';
    }

    recommendations.push({
      ticker,
      assetClass,
      currentPercentage: Math.round(currentPercent * 10) / 10,
      targetPercentage: targetPercent,
      currentValue: actualValue,
      targetValue,
      differenceValue,
      action
    });
  });

  const trackingError = allTickers.size > 0 
    ? Math.sqrt(sumSquaredDrift / allTickers.size) 
    : 0;

  return {
    recommendations: recommendations.sort((a,b) => b.differenceValue - a.differenceValue),
    trackingError: Math.round(trackingError * 10) / 10
  };
}

// 50/30/20 Budgeting rules check
export function aggregateBudget(transactions: Transaction[], monthlyIncome: number) {
  // Simple budget check
  let needsSpent = 0;
  let wantsSpent = 0;
  let savingsSpent = 0;

  transactions.forEach(t => {
    if (t.group === 'Needs') needsSpent += t.amount;
    else if (t.group === 'Wants') wantsSpent += t.amount;
    else if (t.group === 'Savings') savingsSpent += t.amount;
  });

  const needsPercent = monthlyIncome > 0 ? (needsSpent / monthlyIncome) * 100 : 0;
  const wantsPercent = monthlyIncome > 0 ? (wantsSpent / monthlyIncome) * 100 : 0;
  const savingsPercent = monthlyIncome > 0 ? (savingsSpent / monthlyIncome) * 100 : 0;

  return {
    needs: { spent: needsSpent, percent: Math.round(needsPercent), target: 50, status: needsPercent > 50 ? 'overextended' : 'healthy' },
    wants: { spent: wantsSpent, percent: Math.round(wantsPercent), target: 30, status: wantsPercent > 30 ? 'overextended' : 'healthy' },
    savings: { spent: savingsSpent, percent: Math.round(savingsPercent), target: 20, status: savingsPercent < 20 ? 'lagging' : 'healthy' },
    totalSpent: needsSpent + wantsSpent + savingsSpent,
    totalRemaining: Math.max(0, monthlyIncome - (needsSpent + wantsSpent + savingsSpent))
  };
}
