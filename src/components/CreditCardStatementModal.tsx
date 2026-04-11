import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ReceiptText, History } from 'lucide-react';
import { Account, Transaction } from '@/src/types';
import { formatCurrency, cn } from '@/src/lib/utils';
import * as dateFns from 'date-fns';

interface CreditCardStatementModalProps {
  cc: Account;
  transactions: Transaction[];
  onClose: () => void;
}

export default function CreditCardStatementModal({ cc, transactions, onClose }: CreditCardStatementModalProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'previous'>('current');

  const statements = useMemo(() => {
    if (!cc.billingDate) return null;

    const today = new Date();
    let currentBillingDate = new Date(today.getFullYear(), today.getMonth(), cc.billingDate);
    
    // If today is before the billing date, the "current" cycle started last month
    if (dateFns.isBefore(today, dateFns.startOfDay(currentBillingDate))) {
      currentBillingDate = dateFns.addMonths(currentBillingDate, -1);
    }

    const previousBillingDate = dateFns.addMonths(currentBillingDate, -1);

    const filterTransactions = (start: Date, end: Date) => {
      return transactions.filter(t => {
        if (t.accountId !== cc.id && t.toAccountId !== cc.id) return false;
        const tDate = dateFns.parseISO(t.date);
        return dateFns.isAfter(tDate, dateFns.endOfDay(start)) && !dateFns.isAfter(tDate, dateFns.endOfDay(end));
      }).sort((a, b) => dateFns.compareDesc(dateFns.parseISO(a.date), dateFns.parseISO(b.date)));
    };

    const currentTxs = filterTransactions(currentBillingDate, today);
    const previousTxs = filterTransactions(previousBillingDate, currentBillingDate);

    const calculateExpenses = (txs: Transaction[]) => {
      return txs.reduce((sum, t) => {
        if (t.type === 'Expense' && t.accountId === cc.id) return sum + t.amount;
        if (t.type === 'Transfer' && t.accountId === cc.id) return sum + t.amount; // Transfers out are like expenses for the card
        return sum;
      }, 0);
    };

    return {
      current: {
        transactions: currentTxs,
        total: calculateExpenses(currentTxs),
        period: `${dateFns.format(dateFns.addDays(currentBillingDate, 1), 'MMM dd')} - Today`,
        billingDate: currentBillingDate
      },
      previous: {
        transactions: previousTxs,
        total: calculateExpenses(previousTxs),
        period: `${dateFns.format(dateFns.addDays(previousBillingDate, 1), 'MMM dd')} - ${dateFns.format(currentBillingDate, 'MMM dd')}`,
        billingDate: previousBillingDate
      }
    };
  }, [cc, transactions]);

  if (!statements) return null;

  const currentData = activeTab === 'current' ? statements.current : statements.previous;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4"
    >
      <motion.div 
        initial={{ y: 100 }} 
        animate={{ y: 0 }} 
        exit={{ y: 100 }}
        className="glass-card w-full max-w-lg h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold">{cc.name}</h3>
            <p className="text-xs text-neutral-400 font-medium">Statement Details</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 bg-neutral-50/50 shrink-0">
          <button 
            onClick={() => setActiveTab('current')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all",
              activeTab === 'current' ? "bg-white shadow-sm text-blue-600" : "text-neutral-400"
            )}
          >
            <ReceiptText size={16} />
            Current
          </button>
          <button 
            onClick={() => setActiveTab('previous')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all",
              activeTab === 'previous' ? "bg-white shadow-sm text-blue-600" : "text-neutral-400"
            )}
          >
            <History size={16} />
            Previous
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest mb-1">Statement Period</p>
              <p className="text-sm font-bold text-neutral-600">{currentData.period}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(currentData.total)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest">Transactions</h4>
            {currentData.transactions.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-100">
                <p className="text-sm">No transactions in this cycle</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentData.transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-50 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center text-neutral-400">
                        {t.type === 'Transfer' ? <ChevronRight size={16} /> : <ReceiptText size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-800 line-clamp-1">{t.description}</p>
                        <p className="text-[10px] text-neutral-400 font-medium">{dateFns.format(dateFns.parseISO(t.date), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                    <p className={cn(
                      "text-sm font-bold",
                      t.type === 'Income' || (t.type === 'Transfer' && t.toAccountId === cc.id) ? "text-green-500" : "text-red-500"
                    )}>
                      {t.type === 'Income' || (t.type === 'Transfer' && t.toAccountId === cc.id) ? '+' : '-'}
                      {formatCurrency(t.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
