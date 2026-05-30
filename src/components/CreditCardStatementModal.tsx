import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ReceiptText, History, Pencil, Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Account, Transaction } from '@/src/types';
import { formatCurrency, cn } from '@/src/lib/utils';
import * as dateFns from 'date-fns';

interface CreditCardStatementModalProps {
  cc: Account;
  transactions: Transaction[];
  onClose: () => void;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onAddTransaction?: (accountId: string) => void;
}

export default function CreditCardStatementModal({ 
  cc, 
  transactions, 
  onClose,
  onEditTransaction,
  onDeleteTransaction,
  onAddTransaction
}: CreditCardStatementModalProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'previous'>('current');
  const [nonCcFilter, setNonCcFilter] = useState<'60days' | 'currentMonth' | 'previousMonth'>('60days');

  const isCc = cc.type === 'Credit Card';

  // For Credit Cards: compute statement cycles
  const statements = useMemo(() => {
    if (!isCc || !cc.billingDate) return null;

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
  }, [cc, transactions, isCc]);

  // For General Accounts: compute log and totals based on selected filter
  const nonCcTransactions = useMemo(() => {
    if (isCc) return [];
    
    const today = new Date();
    const sixtyDaysAgo = dateFns.subDays(today, 60);
    const startOfCurMonth = dateFns.startOfMonth(today);
    const endOfCurMonth = dateFns.endOfMonth(today);
    
    const prevMonthDate = dateFns.subMonths(today, 1);
    const startOfPrevMonth = dateFns.startOfMonth(prevMonthDate);
    const endOfPrevMonth = dateFns.endOfMonth(prevMonthDate);
    
    return transactions
      .filter(t => {
        if (t.accountId !== cc.id && t.toAccountId !== cc.id) return false;
        const tDate = dateFns.parseISO(t.date);
        
        if (nonCcFilter === 'currentMonth') {
          return !dateFns.isBefore(tDate, startOfCurMonth) && !dateFns.isAfter(tDate, endOfCurMonth) && !dateFns.isAfter(tDate, dateFns.endOfDay(today));
        } else if (nonCcFilter === 'previousMonth') {
          return !dateFns.isBefore(tDate, startOfPrevMonth) && !dateFns.isAfter(tDate, endOfPrevMonth);
        } else {
          // Last 60 Days: limit to >= sixtyDaysAgo AND <= today (so no future records like June show up)
          return !dateFns.isBefore(tDate, dateFns.startOfDay(sixtyDaysAgo)) && !dateFns.isAfter(tDate, dateFns.endOfDay(today));
        }
      })
      .sort((a, b) => dateFns.compareDesc(dateFns.parseISO(a.date), dateFns.parseISO(b.date)));
  }, [cc, transactions, isCc, nonCcFilter]);

  const nonCcStats = useMemo(() => {
    if (isCc) return null;
    
    let inflow = 0;
    let outflow = 0;
    
    nonCcTransactions.forEach(t => {
      const isIncoming = t.type === 'Income' || (t.type === 'Transfer' && t.toAccountId === cc.id);
      if (isIncoming) {
        inflow += t.amount;
      } else {
        outflow += t.amount;
      }
    });
    
    return { inflow, outflow };
  }, [cc, nonCcTransactions, isCc]);

  const currentData = isCc ? (activeTab === 'current' ? statements?.current : statements?.previous) : null;
  const displayTransactions = isCc ? (currentData?.transactions || []) : nonCcTransactions;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4"
    >
      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
        className="glass-card w-full max-w-lg h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className={cn("w-2.5 h-2.5 rounded-full", cc.color)} />
              {cc.name}
            </h3>
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-0.5">
              {isCc ? 'Credit Card Statement' : `${cc.type} Account Log`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        {isCc ? (
          <div className="flex p-2 bg-neutral-50/50 shrink-0">
            <button 
              onClick={() => setActiveTab('current')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer",
                activeTab === 'current' ? "bg-white shadow-sm text-blue-600" : "text-neutral-400"
              )}
            >
              <ReceiptText size={16} />
              Current
            </button>
            <button 
              onClick={() => setActiveTab('previous')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer",
                activeTab === 'previous' ? "bg-white shadow-sm text-blue-600" : "text-neutral-400"
              )}
            >
              <History size={16} />
              Previous
            </button>
          </div>
        ) : (
          <div className="flex p-2 bg-neutral-50/50 shrink-0 gap-1 overflow-x-auto">
            <button 
              onClick={() => setNonCcFilter('60days')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl font-bold text-[11px] xs:text-xs transition-all cursor-pointer whitespace-nowrap",
                nonCcFilter === '60days' ? "bg-white shadow-sm text-blue-600 font-extrabold" : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              <History size={14} />
              Last 60 Days
            </button>
            <button 
              onClick={() => setNonCcFilter('currentMonth')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl font-bold text-[11px] xs:text-xs transition-all cursor-pointer whitespace-nowrap",
                nonCcFilter === 'currentMonth' ? "bg-white shadow-sm text-blue-600 font-extrabold" : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              <ReceiptText size={14} />
              {dateFns.format(new Date(), 'MMMM')}
            </button>
            <button 
              onClick={() => setNonCcFilter('previousMonth')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl font-bold text-[11px] xs:text-xs transition-all cursor-pointer whitespace-nowrap",
                nonCcFilter === 'previousMonth' ? "bg-white shadow-sm text-blue-600 font-extrabold" : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              <History size={14} />
              {dateFns.format(dateFns.subMonths(new Date(), 1), 'MMMM')}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isCc && currentData ? (
            <div className="flex justify-between items-end bg-neutral-50/55 p-4 rounded-2xl border border-neutral-100">
               <div>
                <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest mb-1">Statement Period</p>
                <p className="text-sm font-bold text-neutral-600">{currentData.period}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-red-500">{formatCurrency(currentData.total)}</p>
              </div>
            </div>
          ) : (!isCc && nonCcFilter !== '60days') ? (
            /* General Account Info Box: Inflow/Outflow summary only */
            <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50/55 rounded-2xl border border-neutral-100">
              <div className="text-center pr-2 border-r border-neutral-100">
                <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest mb-1 flex items-center justify-center gap-0.5">
                  <ArrowDownLeft size={10} className="text-emerald-500" /> Inflow
                </p>
                <p className="text-base font-extrabold text-emerald-600 truncate">
                  {nonCcStats?.inflow && nonCcStats.inflow > 0 ? `+${formatCurrency(nonCcStats.inflow)}` : formatCurrency(0)}
                </p>
              </div>
              <div className="text-center pl-2">
                <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest mb-1 flex items-center justify-center gap-0.5">
                  <ArrowUpRight size={10} className="text-red-500" /> Outflow
                </p>
                <p className="text-base font-extrabold text-red-500 truncate">
                  {nonCcStats?.outflow && nonCcStats.outflow > 0 ? `-${formatCurrency(nonCcStats.outflow)}` : formatCurrency(0)}
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest">
                {isCc ? 'Cycle Transactions' : nonCcFilter === 'currentMonth' ? 'Transaction History (Current Month)' : nonCcFilter === 'previousMonth' ? 'Transaction History (Previous Month)' : 'Transaction History (Last 60 Days)'}
              </h4>
              <div className="flex items-center">
                {onAddTransaction && (
                  <button
                    onClick={() => onAddTransaction(cc.id)}
                    className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 cursor-pointer transition-all"
                  >
                    + Add Transaction
                  </button>
                )}
              </div>
            </div>
            
            {displayTransactions.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 bg-neutral-50/50 rounded-2xl border-2 border-dashed border-neutral-100">
                <p className="text-sm font-semibold">No transactions found</p>
                <p className="text-xs text-neutral-300 mt-1">
                  {isCc 
                    ? 'No transactions in this statement cycle.' 
                    : nonCcFilter === 'currentMonth' 
                    ? 'No transactions recorded in the current month.' 
                    : nonCcFilter === 'previousMonth' 
                    ? 'No transactions recorded in the previous month.' 
                    : 'No transactions recorded in the last 60 days.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayTransactions.map(t => {
                  const isIncoming = t.type === 'Income' || (t.type === 'Transfer' && t.toAccountId === cc.id);
                  return (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-50 shadow-sm hover:border-neutral-200 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          isIncoming ? "bg-emerald-50 text-emerald-600" : "bg-neutral-50 text-neutral-400"
                        )}>
                          {t.type === 'Transfer' ? (
                            isIncoming ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />
                          ) : (
                            <ReceiptText size={16} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-neutral-800 truncate">{t.description}</p>
                          <p className="text-[10px] text-neutral-400 font-medium flex items-center flex-wrap gap-1">
                            <span>{dateFns.format(dateFns.parseISO(t.date), 'MMM dd, yyyy')}</span>
                            {t.category && (
                              <>
                                <span className="text-neutral-300">•</span>
                                <span className="text-neutral-400">{t.category}</span>
                              </>
                            )}
                            {t.totalAmount && t.totalAmount > 0 && (
                              <>
                                <span className="text-neutral-300">•</span>
                                <span>Bill: {formatCurrency(t.totalAmount)}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end flex-shrink-0">
                        <p className={cn(
                          "text-sm font-extrabold whitespace-nowrap leading-tight",
                          isIncoming ? "text-emerald-500" : "text-neutral-800"
                        )}>
                          {isIncoming ? '+' : '-'}
                          {formatCurrency(t.amount)}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <button 
                            type="button"
                            onClick={() => onEditTransaction(t)} 
                            className="text-neutral-300 hover:text-blue-500 p-1 transition-colors active:scale-90 cursor-pointer"
                            title="Edit Transaction"
                          >
                            <Pencil size={12} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => onDeleteTransaction(t.id)} 
                            className="text-neutral-300 hover:text-red-500 p-1 transition-colors active:scale-90 cursor-pointer"
                            title="Delete Transaction"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
