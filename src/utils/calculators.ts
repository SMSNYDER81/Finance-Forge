import { Portfolio, LedgerItem, Transaction } from '../types';

// Map common tickers to historical statistical footprints (expected returns and volatilities)
export const TICKER_DETAILS: Record<string, { name: string, return: number, volatility: number, class: string }> = {
  VTI: { name: 'Vanguard Total Stock Market', return: 0.095, volatility: 0.150, class: 'US Equity' },
  VXUS: { name: 'Vanguard Total International Stock', return: 0.075, volatility: 0.165, class: 'Intl Equity' },
  BND: { name: 'Vanguard Total Bond Market', return: 0.042, volatility: 0.055, class: 'Fixed Income' },
  BTC: { name: 'Bitcoin', return: 0.280, volatility: 0.550, class: 'Crypto' },
  ETH: { name: 'Ethereum', return: 0.320, volatility: 0.650, class: 'Crypto' },
  SPY: { name: 'SPDR S&P 500 ETF Trust', return: 0.100, volatility: 0.155, class: 'US Equity' },
  QQQ: { name: 'Invesco QQQ Trust', return: 0.125, volatility: 0.185, class: 'US Equity' },
  AGG: { name: 'iShares Core U.S. Aggregate Bond', return: 0.040, volatility: 0.050, class: 'Fixed Income' },
  GLD: { name: 'SPDR Gold Shares', return: 0.060, volatility: 0.120, class: 'Other' },
};

export const DEFAULT_TICKER_STATS = { name: 'Custom Asset', return: 0.080, volatility: 0.150, class: 'Other' };

export function getTickerStats(ticker: string) {
  const upper = ticker.toUpperCase().trim();
  return TICKER_DETAILS[upper] || { ...DEFAULT_TICKER_STATS, name: `${upper} Asset` };
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
