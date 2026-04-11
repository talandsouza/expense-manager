import * as dateFns from 'date-fns';
import { Account, Transaction } from '@/src/types';

export function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function calculatePendingDues(acc: Account, transactions: Transaction[]) {
  if (acc.type !== 'Credit Card' || !acc.billingDate || !acc.dueDate) return 0;

  const today = new Date();
  let lastBillingDate = new Date(today.getFullYear(), today.getMonth(), acc.billingDate);
  
  // If today is on or before the billing day, the "last" bill was generated in the previous month
  if (!dateFns.isAfter(today, dateFns.endOfDay(lastBillingDate))) {
    lastBillingDate = dateFns.addMonths(lastBillingDate, -1);
  }

  // A bill includes all transactions UP TO the end of the billing day
  const billingCycleEnd = dateFns.endOfDay(lastBillingDate);

  const txAfterBilling = transactions.filter(t => 
    (t.accountId === acc.id || t.toAccountId === acc.id) && 
    dateFns.isAfter(dateFns.parseISO(t.date), billingCycleEnd)
  );
  
  let balanceAtBilling = acc.balance;
  txAfterBilling.forEach(t => {
    if (t.accountId === acc.id) {
      balanceAtBilling -= (t.type === 'Income' ? t.amount : -t.amount);
    }
    if (t.toAccountId === acc.id) {
      balanceAtBilling -= t.amount;
    }
  });

  if (balanceAtBilling >= 0) return 0;

  const paymentsSinceBilling = txAfterBilling
    .filter(t => t.toAccountId === acc.id && t.type === 'Transfer')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const pending = Math.abs(balanceAtBilling) - paymentsSinceBilling;
  return Math.max(0, Math.round(pending * 100) / 100);
}
