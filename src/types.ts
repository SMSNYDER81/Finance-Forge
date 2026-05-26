export interface UserProfile {
  target_retirement_age: number;
  annual_spending_target: number;
  api_key_gemini: string;
}

export type AssetCategory = 'Cash' | 'Investments' | 'Real Estate' | 'Other';
export type LiabilityCategory = 'Debt' | 'Mortgage' | 'Credit Card' | 'Other';

export interface LedgerItem {
  id: string;
  name: string;
  category: AssetCategory | LiabilityCategory;
  value: number;
}

export interface BalanceSheet {
  assets: LedgerItem[];
  liabilities: LedgerItem[];
}

export interface PortfolioAllocation {
  ticker: string;
  percentage: number;
  asset_class: string;
}

export interface Portfolio {
  portfolio_name: string;
  allocation: PortfolioAllocation[];
}

export type BudgetCategoryGroup = 'Needs' | 'Wants' | 'Savings';

export interface BudgetRule {
  needs_target: number; // typically 50
  wants_target: number; // typically 30
  savings_target: number; // typically 20
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  group: BudgetCategoryGroup;
  category: string; // e.g. Rent, Groceries, Dining out, Stock acquisition
}

export interface CSVColumnMapping {
  date: string;
  description: string;
  amount: string;
}

export interface RmdWithdrawal {
  id: string;
  date: string;
  amount: number;
  ira_type: 'Traditional' | 'SEP' | 'SIMPLE' | 'Roth';
}

export interface RmdState {
  birth_year: number;
  traditional_balance: number;
  sep_balance: number;
  simple_balance: number;
  roth_balance?: number;
  spouse_sole_beneficiary: boolean;
  spouse_birth_year: number;
  withdrawals: RmdWithdrawal[];
  is_inherited?: boolean;
  inherited_type?: 'Spouse' | 'EligibleDesignated' | 'NonDesignated' | 'Successor';
  original_owner_birth_year?: number;
  year_of_owner_death?: number;
}

export interface StateSchema {
  user_profile: UserProfile;
  balance_sheet: BalanceSheet;
  portfolios: Portfolio[];
  transactions: Transaction[];
  monthly_income: number;
  rmd_state?: RmdState;
}
