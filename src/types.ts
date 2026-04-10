export type AccountType = 'Cash' | 'Bank' | 'Credit Card';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  billingDate?: number; // Day of month (1-31)
  dueDate?: number;     // Day of month (1-31)
  color?: string;
}

export type RecurringFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  description: string;
  date: string; // ISO string
  category: string;
  type: 'Income' | 'Expense' | 'Transfer';
  toAccountId?: string; // For transfers
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
}

export interface StatementGroup {
  period: string;
  transactions: Transaction[];
  total: number;
  isFuture: boolean;
}
