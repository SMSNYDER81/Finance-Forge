import { Transaction, BudgetCategoryGroup } from '../types';

// Simple, high-fidelity CSV line parser that respects quoted commas
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let currentWord = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(currentWord.trim());
      currentWord = '';
    } else {
      currentWord += char;
    }
  }
  result.push(currentWord.trim());
  return result;
}

export function parseCSVData(csvText: string): { headers: string[], rows: string[][] } {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows = lines.slice(1).map(line => parseCSVLine(line).map(cell => cell.replace(/^["']|["']$/g, '').trim()));

  return { headers, rows };
}

// Map row of parsed CSV into standard transaction payload
export function mapRowToTransaction(
  row: string[],
  headers: string[],
  mapping: { date: string; description: string; amount: string },
  groupSelector: (description: string) => { group: BudgetCategoryGroup; category: string }
): Partial<Transaction> | null {
  const dateIdx = headers.indexOf(mapping.date);
  const descIdx = headers.indexOf(mapping.description);
  const amtIdx = headers.indexOf(mapping.amount);

  if (dateIdx === -1 || descIdx === -1 || amtIdx === -1) {
    return null;
  }

  const dateVal = row[dateIdx] || '';
  const descVal = row[descIdx] || '';
  
  // Clean clean absolute numeric mapping for monetary balance
  let rawAmt = (row[amtIdx] || '').replace(/[^0-9.-]/g, '');
  let amtVal = parseFloat(rawAmt);
  
  if (isNaN(amtVal)) {
    return null;
  }

  // Usually expense amounts are recorded as negative or positive. Let's make amount absolute representing expense,
  // or user-selected direction. Let's keep it clean: expenses are positive entries subtracted from budget totals.
  if (amtVal < 0) {
    amtVal = Math.abs(amtVal);
  }

  const groupInfo = groupSelector(descVal);

  return {
    id: `csv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: dateVal || new Date().toISOString().split('T')[0],
    description: descVal || 'Bank Transaction',
    amount: amtVal,
    group: groupInfo.group,
    category: groupInfo.category
  };
}

// Simple heuristic classifier to automatically assign category & group
export function autoClassifyDescription(desc: string): { group: BudgetCategoryGroup; category: string } {
  const lower = desc.toLowerCase();

  // HEURISTICS FOR NEEDS
  if (
    lower.includes('landlord') || 
    lower.includes('rent') || 
    lower.includes('mortgage') || 
    lower.includes('home loan')
  ) {
    return { group: 'Needs', category: 'Housing' };
  }
  if (
    lower.includes('electric') || 
    lower.includes('gas') || 
    lower.includes('water') || 
    lower.includes('utility') || 
    lower.includes('comcast') || 
    lower.includes('cox') || 
    lower.includes('at&t') || 
    lower.includes('verizon') || 
    lower.includes('internet')
  ) {
    return { group: 'Needs', category: 'Utilities' };
  }
  if (
    lower.includes('walmart') || 
    lower.includes('kroger') || 
    lower.includes('safeway') || 
    lower.includes('grocer') || 
    lower.includes('aldi') || 
    lower.includes('wholef')
  ) {
    return { group: 'Needs', category: 'Groceries' };
  }
  if (
    lower.includes('state farm') || 
    lower.includes('geico') || 
    lower.includes('progressive') || 
    lower.includes('allstate') || 
    lower.includes('copay') || 
    lower.includes('medical') || 
    lower.includes('clinic')
  ) {
    return { group: 'Needs', category: 'Insurance & Health' };
  }

  // HEURISTICS FOR SAVINGS
  if (
    lower.includes('fidelity') || 
    lower.includes('schwab') || 
    lower.includes('vanguard') || 
    lower.includes('interactive') || 
    lower.includes('treasury') || 
    lower.includes('ira') || 
    lower.includes('transfer to savings') || 
    lower.includes('crypto.com') || 
    lower.includes('coinbase')
  ) {
    return { group: 'Savings', category: 'Investments' };
  }

  // HEURISTICS FOR WANTS (Fallback defaults)
  if (
    lower.includes('starbucks') || 
    lower.includes('coffee') || 
    lower.includes('mcdonald') || 
    lower.includes('uber') || 
    lower.includes('lyft') || 
    lower.includes('dining') || 
    lower.includes('restaurant') || 
    lower.includes('pub') || 
    lower.includes('bar')
  ) {
    return { group: 'Wants', category: 'Dining & Cafes' };
  }
  if (
    lower.includes('netflix') || 
    lower.includes('spotify') || 
    lower.includes('disney') || 
    lower.includes('steam') || 
    lower.includes('nintendo') || 
    lower.includes('playstation')
  ) {
    return { group: 'Wants', category: 'Entertainment' };
  }
  if (
    lower.includes('amazon') || 
    lower.includes('target') || 
    lower.includes('retail') || 
    lower.includes('nordstrom') || 
    lower.includes('nike')
  ) {
    return { group: 'Wants', category: 'Shopping' };
  }

  // Global default
  return { group: 'Wants', category: 'Uncategorized' };
}
