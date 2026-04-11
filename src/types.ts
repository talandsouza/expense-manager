export interface Account {
  id: string;
  name: string;
  type: 'Bank' | 'Cash' | 'Credit Card' | 'Investment';
  balance: number;
  billingDate?: number;
  dueDate?: number;
  color: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  toAccountId?: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  type: 'Expense' | 'Income' | 'Transfer';
  isRecurring?: boolean;
  recurringFrequency?: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  groupId?: string;
  splitType?: 'Percentage' | 'Equal';
  mySharePercent?: number;
  numPeople?: number;
  totalAmount?: number;
  debtorNames?: string;
}
