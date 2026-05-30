import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Wallet, ArrowUpRight, ArrowDownLeft, 
  Settings as SettingsIcon, LayoutDashboard, ChevronRight, 
  ArrowRightLeft, Download, Upload, Trash2, Pencil, Check, X, Search, Filter,
  ArrowDownWideNarrow, ArrowUpNarrowWide, Copy, CalendarDays 
} from 'lucide-react';
import * as dateFns from 'date-fns';
import { useLocalStorage } from './hooks/useLocalStorage';
import { cn, formatCurrency, calculatePendingDues } from './lib/utils';
import { Account, Transaction } from './types';

// Components
import TransactionModal from './components/TransactionModal';
import AccountModal from './components/AccountModal';
import PayBillModal from './components/PayBillModal';
import CreditCardStatementModal from './components/CreditCardStatementModal';
import ConfirmationModal from './components/ConfirmationModal';
import ResetModal from './components/ResetModal';
import FilterModal from './components/FilterModal';

const CATEGORIES = [
  "Housing & Utilities", "Groceries", "Transportation", "Medical", 
  "Insurance", "Gifts & Donations", "Investments", "Dining", 
  "Tickets & Subscriptions", "Shopping", "Education", "Lent / Owed to Me", "Miscellaneous"
];

export default function App() {
  const [accounts, setAccounts] = useLocalStorage<Account[]>('pennywise_accounts', []);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('pennywise_transactions', []);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'settings'>('dashboard');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isPayBillModalOpen, setIsPayBillModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedCreditCard, setSelectedCreditCard] = useState<Account | null>(null);
  const [selectedStatementCard, setSelectedStatementCard] = useState<Account | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterAccount, setFilterAccount] = useState('All');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isCopied, setIsCopied] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'All' | 'Income' | 'Expense' | 'Lent' | 'Recurring'>('All');
  const [defaultTransactionAccountId, setDefaultTransactionAccountId] = useState<string | undefined>(undefined);

  // Recurring Logic
  useEffect(() => {
    const today = dateFns.startOfDay(new Date());
    let accountsUpdated = false;
    let tempAccounts = [...accounts];
    let tempTransactions = [...transactions];
    let newTransactionsAdded: Transaction[] = [];

    const processedTransactions = tempTransactions.map(t => {
      if (t.isRecurring && t.recurringFrequency) {
        let currentIterDate = dateFns.parseISO(t.date);
        const endDate = t.recurringEndDate ? dateFns.parseISO(t.recurringEndDate) : null;

        if (endDate && dateFns.isAfter(dateFns.startOfDay(currentIterDate), endDate)) {
          return { ...t, isRecurring: false };
        }

        let hasGeneratedInstances = false;

        while (true) {
          // If the scheduled date is in the future, we don't materialize it yet
          if (dateFns.isAfter(dateFns.startOfDay(currentIterDate), today)) break;
          // If we've passed the end date, stop
          if (endDate && dateFns.isAfter(dateFns.startOfDay(currentIterDate), endDate)) break;

          // Materialize the instance at currentIterDate
          const id = Math.random().toString(36).substr(2, 9);
          const staticInstance: Transaction = {
            ...t,
            id,
            date: currentIterDate.toISOString(),
            isRecurring: false,
          };
          newTransactionsAdded.push(staticInstance);
          
          // Update balances for the materialized instance
          tempAccounts = tempAccounts.map(acc => {
            if (acc.id === t.accountId) {
              return { ...acc, balance: acc.balance + (t.type === 'Income' ? t.amount : -t.amount) };
            }
            if (t.type === 'Transfer' && acc.id === t.toAccountId) {
              return { ...acc, balance: acc.balance + t.amount };
            }
            return acc;
          });
          accountsUpdated = true;
          
          // Calculate next occurrence
          let nextOccurrence: Date;
          if (t.recurringFrequency === 'Daily') nextOccurrence = dateFns.addDays(currentIterDate, 1);
          else if (t.recurringFrequency === 'Weekly') nextOccurrence = dateFns.addWeeks(currentIterDate, 1);
          else if (t.recurringFrequency === 'Monthly') nextOccurrence = dateFns.addMonths(currentIterDate, 1);
          else nextOccurrence = dateFns.addYears(currentIterDate, 1);
          
          currentIterDate = nextOccurrence;
          hasGeneratedInstances = true;
        }

        if (hasGeneratedInstances) {
          const isExpired = endDate && dateFns.isAfter(dateFns.startOfDay(currentIterDate), endDate);
          return { 
            ...t, 
            date: currentIterDate.toISOString(),
            isRecurring: isExpired ? false : t.isRecurring 
          };
        }
      }
      return t;
    });

    if (newTransactionsAdded.length > 0) {
      setTransactions([...newTransactionsAdded, ...processedTransactions]);
      if (accountsUpdated) {
        setAccounts(tempAccounts);
      }
    }
  }, [transactions.length]); // Re-run when transaction count changes to catch new recurring setups

  // Derived Data
  const netWorth = useMemo(() => accounts.reduce((acc, curr) => acc + curr.balance, 0), [accounts]);
  const [balanceDisplayMode, setBalanceDisplayMode] = useState<'Net' | 'Gross'>('Net');
  const totalAssets = useMemo(() => accounts.filter(a => a.type !== 'Credit Card').reduce((acc, curr) => acc + curr.balance, 0), [accounts]);
  const totalCreditDues = useMemo(() => accounts.filter(a => a.type === 'Credit Card').reduce((acc, curr) => acc + Math.abs(curr.balance), 0), [accounts]);
  
  const peaceOfMind = useMemo(() => {
    const ccAccountsWithBalance = accounts.filter(a => a.type === 'Credit Card' && a.balance < 0);
    if (ccAccountsWithBalance.length === 0) return null;
    
    const totalCcaAmount = ccAccountsWithBalance.reduce((acc, curr) => acc + Math.abs(curr.balance), 0);
    const coverage = totalAssets / totalCcaAmount;
    
    const today = new Date();
    let earliestDueDate: Date | null = null;

    ccAccountsWithBalance.forEach(cc => {
      let dueDate = new Date(today.getFullYear(), today.getMonth(), cc.dueDate || 1);
      if (dateFns.isAfter(today, dueDate)) {
        dueDate = dateFns.addMonths(dueDate, 1);
      }
      if (!earliestDueDate || dateFns.isBefore(dueDate, earliestDueDate)) {
        earliestDueDate = dueDate;
      }
    });

    const daysLeft = earliestDueDate ? dateFns.differenceInDays(earliestDueDate, today) : 0;

    // Pending Dues Logic
    const overdueCards: string[] = [];
    const ccAccounts = accounts.filter(a => a.type === 'Credit Card' && a.billingDate && a.dueDate);
    
    ccAccounts.forEach(acc => {
      const pending = calculatePendingDues(acc, transactions);
      if (pending >= 0.01) {
        let lastBillingDate = new Date(today.getFullYear(), today.getMonth(), acc.billingDate!);
        // If today is the billing day or before it, the "last" bill was from the previous month
        if (!dateFns.isAfter(today, dateFns.endOfDay(lastBillingDate))) {
          lastBillingDate = dateFns.addMonths(lastBillingDate, -1);
        }
        
        let lastDueDate = new Date(lastBillingDate.getFullYear(), lastBillingDate.getMonth(), acc.dueDate!);
        if (dateFns.isBefore(lastDueDate, lastBillingDate)) {
          lastDueDate = dateFns.addMonths(lastDueDate, 1);
        }

        if (dateFns.isAfter(today, dateFns.endOfDay(lastDueDate))) {
          overdueCards.push(acc.name);
        }
      }
    });

    const hasPendingDues = overdueCards.length > 0;

    return {
      amount: totalCcaAmount,
      daysLeft,
      coverage: coverage.toFixed(1),
      isSafe: coverage > 1.5 && !hasPendingDues,
      hasPendingDues,
      overdueCards
    };
  }, [accounts, totalAssets, transactions]);

  const baseFilteredTransactions = useMemo(() => {
    const today = new Date();
    const filterFn = (t: Transaction, overrideDate?: string) => {
      const isRecurringView = filterType === 'Recurring';
      
      // When viewing recurring master list, ignore other filters
      if (isRecurringView) {
        return t.isRecurring === true;
      }

      const queryWords = searchQuery.toLowerCase().split(' ').filter(word => word.length > 0);
      const searchableText = `${t.description} ${t.amount} ${t.debtorNames || ''}`.toLowerCase();
      const matchesSearch = queryWords.length === 0 || queryWords.every(word => searchableText.includes(word));
      
      const tDate = dateFns.parseISO(overrideDate || t.date);
      
      // Don't show future transactions. Just show up to today.
      const isFuture = dateFns.isAfter(dateFns.startOfDay(tDate), dateFns.endOfDay(today));
      if (isFuture) return false;

      const matchesMonth = filterMonth === 'All' || dateFns.format(tDate, 'MMMM') === filterMonth;
      const matchesYear = filterYear === 'All' || dateFns.format(tDate, 'yyyy') === filterYear;
      const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
      const matchesAccount = filterAccount === 'All' || t.accountId === filterAccount || t.toAccountId === filterAccount;
      
      const matchesType = filterType === 'All' || t.type === filterType;

      return matchesSearch && matchesMonth && matchesYear && matchesCategory && matchesAccount && matchesType;
    };

    const realFiltered = transactions.filter(t => filterFn(t));

    // Do not show future projections; just show real transactions until today
    const all = realFiltered;

    return all.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
    });
  }, [transactions, searchQuery, filterMonth, filterYear, filterCategory, filterAccount, sortBy, sortOrder, filterType]);

  const cashFlow = useMemo(() => {
    return baseFilteredTransactions.reduce((acc, t) => {
      if (t.type === 'Income') {
        if (t.category === 'Lent / Owed to Me') {
          acc.lent -= t.amount;
        } else {
          acc.income += t.amount;
        }
      } else if (t.type === 'Expense') {
        // A transaction is "Lent" if it's in the Lent category AND it's not the user's own share of a split
        if (t.category === 'Lent / Owed to Me' && !t.description.includes('(My Share)')) {
          acc.lent += t.amount;
        } else {
          acc.expense += t.amount;
        }
      }
      return acc;
    }, { income: 0, expense: 0, lent: 0 });
  }, [baseFilteredTransactions]);

  const filteredTransactions = useMemo(() => {
    if (filterType === 'All') return baseFilteredTransactions;
    return baseFilteredTransactions.filter(t => {
      if (filterType === 'Income') return t.type === 'Income' && t.category !== 'Lent / Owed to Me';
      if (filterType === 'Lent') return t.category === 'Lent / Owed to Me';
      if (filterType === 'Expense') return t.type === 'Expense' && t.category !== 'Lent / Owed to Me';
      return true;
    });
  }, [baseFilteredTransactions, filterType]);

  const filterDescription = useMemo(() => {
    if (filterType === 'Recurring') return 'All Recurring Transactions';
    const parts = [];
    
    // Time period
    if (filterMonth === 'All' && filterYear === 'All') {
      parts.push('all time');
    } else if (filterMonth === 'All') {
      parts.push(`Year ${filterYear}`);
    } else if (filterYear === 'All') {
      parts.push(`every ${filterMonth}`);
    } else {
      parts.push(`${filterMonth} ${filterYear}`);
    }

    // Category
    if (filterCategory !== 'All') {
      parts.push(`in ${filterCategory}`);
    }

    // Account
    if (filterAccount !== 'All') {
      const acc = accounts.find(a => a.id === filterAccount);
      if (acc) parts.push(`for ${acc.name}`);
    }

    // Search
    if (searchQuery) {
      parts.push(`matching "${searchQuery}"`);
    }

    // Type filter
    if (filterType !== 'All') {
      parts.push(`(${filterType} only)`);
    }

    return parts.join(' ');
  }, [filterMonth, filterYear, filterCategory, filterAccount, searchQuery, accounts, filterType]);

  const copyResults = () => {
    if (filteredTransactions.length === 0) return;

    const text = filteredTransactions.map(t => {
      const date = dateFns.format(dateFns.parseISO(t.date), 'dd/MM/yyyy');
      return `${date} - ${t.description} - ${formatCurrency(t.amount)}`;
    }).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Handlers
  const addTransaction = (t: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[]) => {
    const transactionsToAdd = Array.isArray(t) ? t : [t];
    const newTransactions: Transaction[] = transactionsToAdd.map(tx => ({
      ...tx,
      id: Math.random().toString(36).substr(2, 9)
    }));
    
    setTransactions(prev => [...newTransactions, ...prev]);

    setAccounts(prevAccounts => {
      let updatedAccounts = [...prevAccounts];
      newTransactions.forEach(tx => {
        updatedAccounts = updatedAccounts.map(acc => {
          if (acc.id === tx.accountId) {
            return { ...acc, balance: acc.balance + (tx.type === 'Income' ? tx.amount : -tx.amount) };
          }
          if (tx.type === 'Transfer' && acc.id === tx.toAccountId) {
            return { ...acc, balance: acc.balance + tx.amount };
          }
          return acc;
        });
      });
      return updatedAccounts;
    });
  };

  const updateTransaction = (id: string, updated: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[]) => {
    const old = transactions.find(tx => tx.id === id);
    if (!old) return;

    const groupId = old.groupId;
    const relatedTransactions = groupId ? transactions.filter(tx => tx.groupId === groupId) : [old];
    const relatedIds = relatedTransactions.map(tx => tx.id);

    const transactionsToAdd = Array.isArray(updated) ? updated : [updated];
    const newTransactions: Transaction[] = transactionsToAdd.map(tx => ({
      ...tx,
      id: Math.random().toString(36).substr(2, 9)
    }));

    setAccounts(prevAccounts => {
      let updatedAccounts = [...prevAccounts];
      
      // Revert old transactions
      relatedTransactions.forEach(tx => {
        updatedAccounts = updatedAccounts.map(acc => {
          if (acc.id === tx.accountId) {
            return { ...acc, balance: acc.balance - (tx.type === 'Income' ? tx.amount : -tx.amount) };
          }
          if (tx.type === 'Transfer' && acc.id === tx.toAccountId) {
            return { ...acc, balance: acc.balance - tx.amount };
          }
          return acc;
        });
      });

      // Apply new transactions
      newTransactions.forEach(tx => {
        updatedAccounts = updatedAccounts.map(acc => {
          if (acc.id === tx.accountId) {
            return { ...acc, balance: acc.balance + (tx.type === 'Income' ? tx.amount : -tx.amount) };
          }
          if (tx.type === 'Transfer' && acc.id === tx.toAccountId) {
            return { ...acc, balance: acc.balance + tx.amount };
          }
          return acc;
        });
      });

      return updatedAccounts;
    });

    // Update transactions list outside of setAccounts to avoid side-effect issues
    setTransactions(prev => [...newTransactions, ...prev.filter(tx => !relatedIds.includes(tx.id))]);
  };

  const deleteTransaction = (id: string) => {
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;

    const groupId = t.groupId;
    const relatedTransactions = groupId ? transactions.filter(tx => tx.groupId === groupId) : [t];
    const relatedIds = relatedTransactions.map(tx => tx.id);

    setTransactions(prev => prev.filter(tx => !relatedIds.includes(tx.id)));

    setAccounts(prevAccounts => {
      let updatedAccounts = [...prevAccounts];
      relatedTransactions.forEach(tx => {
        updatedAccounts = updatedAccounts.map(acc => {
          if (acc.id === tx.accountId) {
            return { ...acc, balance: acc.balance - (tx.type === 'Income' ? tx.amount : -tx.amount) };
          }
          if (tx.type === 'Transfer' && acc.id === tx.toAccountId) {
            return { ...acc, balance: acc.balance - tx.amount };
          }
          return acc;
        });
      });
      return updatedAccounts;
    });
  };

  const addAccount = (a: Omit<Account, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setAccounts([...accounts, { ...a, id }]);
  };

  const updateAccount = (id: string, updated: Omit<Account, 'id'>) => {
    setAccounts(accounts.map(acc => acc.id === id ? { ...updated, id } : acc));
  };

  const deleteAccount = (id: string) => {
    setAccounts(accounts.filter(a => a.id !== id));
    setTransactions(transactions.filter(t => t.accountId !== id && t.toAccountId !== id));
  };

  const payBill = (ccId: string, fromId: string, amount: number, date: string) => {
    addTransaction({
      accountId: fromId,
      toAccountId: ccId,
      amount,
      description: `Bill Payment`,
      date: dateFns.parseISO(date).toISOString(),
      category: 'Payment',
      type: 'Transfer'
    });
  };

  const handleReset = (type: 'transactions' | 'balances' | 'nuclear') => {
    if (type === 'transactions') {
      setTransactions([]);
    } else if (type === 'balances') {
      setAccounts(accounts.map(acc => ({ ...acc, balance: 0 })));
    } else if (type === 'nuclear') {
      setTransactions([]);
      setAccounts([]);
    }
    setIsResetModalOpen(false);
  };

  const exportBackup = () => {
    const data = {
      accounts,
      transactions,
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pennywise_backup_${dateFns.format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.accounts && data.transactions) {
            setAccounts(data.accounts);
            setTransactions(data.transactions);
            alert('Backup imported successfully!');
          } else {
            alert('Invalid backup file format.');
          }
        } catch (err) {
          alert('Error parsing backup file.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-md mx-auto h-[100dvh] flex flex-col relative overflow-hidden bg-transparent">
      {/* Main Content Scrollable Container */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 pt-8 pb-32">
        {/* Header */}
        <header className="mb-8 flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-full w-fit">
              <button 
                onClick={() => setBalanceDisplayMode('Net')}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all",
                  balanceDisplayMode === 'Net' ? "bg-white text-blue-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                )}
              >
                Net
              </button>
              <button 
                onClick={() => setBalanceDisplayMode('Gross')}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all",
                  balanceDisplayMode === 'Gross' ? "bg-white text-blue-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                )}
              >
                Gross
              </button>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              {formatCurrency(balanceDisplayMode === 'Net' ? netWorth : totalAssets)}
            </h1>
            <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider">
              {balanceDisplayMode === 'Net' ? 'Available Funds' : 'Total Assets'}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn(
                "p-2 rounded-full transition-all",
                activeTab === 'settings' ? "bg-neutral-900 text-white" : "bg-white/50 text-neutral-600"
              )}
            >
              <SettingsIcon size={20} />
            </button>
          </div>
        </header>
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.15 }}
              className="space-y-6"
            >
              {/* Peace of Mind Card */}
              {peaceOfMind && (
                <div className={cn(
                  "glass-card p-6 border-l-4",
                  peaceOfMind.hasPendingDues ? "border-l-red-500 bg-red-50/30" : 
                  peaceOfMind.isSafe ? "border-l-emerald-500" : "border-l-amber-500"
                )}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase text-neutral-400">Peace of Mind</span>
                    {peaceOfMind.hasPendingDues ? <X size={16} className="text-red-500" /> :
                     peaceOfMind.isSafe ? <Check size={16} className="text-emerald-500" /> : <X size={16} className="text-amber-500" />}
                  </div>
                  <p className="text-neutral-700 leading-relaxed">
                    {peaceOfMind.hasPendingDues ? (
                      <span className="text-red-600 font-medium">
                        Please pay your overdue {peaceOfMind.overdueCards.join(', ')} balance to maintain your account status.
                      </span>
                    ) : (
                      <>
                        You owe <span className="font-bold text-neutral-900">{formatCurrency(peaceOfMind.amount)}</span> in <span className="font-bold text-neutral-900">{peaceOfMind.daysLeft} days</span>. 
                        <br />
                        {parseFloat(peaceOfMind.coverage) >= 1 ? (
                          <>Your cash covers this <span className="font-bold text-neutral-900">{peaceOfMind.coverage}x</span> over.</>
                        ) : (
                          <>You need <span className="font-bold text-red-500">{Math.abs(1 / parseFloat(peaceOfMind.coverage)).toFixed(1)}x</span> more than what you have.</>
                        )}
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Cash Flow Summary */}
              {(filterMonth !== 'All' || filterYear !== 'All' || filterCategory !== 'All' || filterAccount !== 'All' || searchQuery !== '' || filterType !== 'All') && (
                <div className="space-y-2.5">
                  <div className="px-1">
                    <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest">
                      Showing {filterDescription}
                    </p>
                  </div>
                  <div className="flex gap-2.5 xs:gap-3 overflow-hidden">
                    <button 
                      onClick={() => setFilterType(filterType === 'Income' ? 'All' : 'Income')}
                      className={cn(
                        "glass-card p-3 xs:p-4 border-l-[3px] xs:border-l-4 border-l-emerald-500 flex-1 min-w-[90px] sm:min-w-[120px] text-left transition-all active:scale-95 overflow-hidden",
                        filterType === 'Income' ? "ring-2 ring-emerald-500 ring-offset-2" : "opacity-70 grayscale-[0.3]"
                      )}
                    >
                      <p className="text-[10px] font-bold uppercase text-neutral-400 mb-1 truncate">Income</p>
                      <p 
                        className="text-base xs:text-lg sm:text-xl font-bold text-emerald-600 truncate whitespace-nowrap"
                        title={formatCurrency(cashFlow.income)}
                      >
                        {formatCurrency(cashFlow.income)}
                      </p>
                    </button>
                    <button 
                      onClick={() => setFilterType(filterType === 'Expense' ? 'All' : 'Expense')}
                      className={cn(
                        "glass-card p-3 xs:p-4 border-l-[3px] xs:border-l-4 border-l-red-500 flex-1 min-w-[90px] sm:min-w-[120px] text-left transition-all active:scale-95 overflow-hidden",
                        filterType === 'Expense' ? "ring-2 ring-red-500 ring-offset-2" : "opacity-70 grayscale-[0.3]"
                      )}
                    >
                      <p className="text-[10px] font-bold uppercase text-neutral-400 mb-1 truncate">Expenses</p>
                      <p 
                        className="text-base xs:text-lg sm:text-xl font-bold text-red-500 truncate whitespace-nowrap"
                        title={formatCurrency(cashFlow.expense)}
                      >
                        {formatCurrency(cashFlow.expense)}
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Activity Section */}
              <section className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Activity</h2>
                    <button 
                      onClick={() => setShowFilters(!showFilters)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        showFilters ? "bg-blue-50 text-blue-600" : "text-neutral-400 hover:bg-neutral-50"
                      )}
                      title="All filters"
                    >
                      <Filter size={16} />
                    </button>
                    {(() => {
                      const curMonth = dateFns.format(new Date(), 'MMMM');
                      const curYear = dateFns.format(new Date(), 'yyyy');
                      const isCurrentMonth = filterMonth === curMonth && filterYear === curYear;

                      return (
                        <button
                          type="button"
                          onClick={() => {
                            if (isCurrentMonth) {
                              setFilterMonth('All');
                              setFilterYear('All');
                            } else {
                              setFilterMonth(curMonth);
                              setFilterYear(curYear);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer border",
                            isCurrentMonth 
                              ? "bg-blue-600 border-blue-600 text-white shadow-sm hover:bg-blue-700" 
                              : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 shadow-xs"
                          )}
                        >
                          <CalendarDays size={12} />
                          This Month
                        </button>
                      );
                    })()}
                    <button
                      onClick={copyResults}
                      disabled={filteredTransactions.length === 0}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                        isCopied 
                          ? "bg-emerald-100 text-emerald-600" 
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      <Copy size={12} />
                      {isCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  {(filterMonth !== 'All' || filterYear !== 'All' || filterCategory !== 'All' || filterAccount !== 'All' || searchQuery !== '' || sortBy !== 'date' || sortOrder !== 'desc' || filterType !== 'All') && (
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setFilterMonth('All');
                        setFilterYear('All');
                        setFilterCategory('All');
                        setFilterAccount('All');
                        setSortBy('date');
                        setSortOrder('desc');
                        setFilterType('All');
                      }}
                      className="text-[10px] font-bold uppercase text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                {/* Filters Modal */}
                <FilterModal
                  isOpen={showFilters}
                  onClose={() => setShowFilters(false)}
                  accounts={accounts}
                  categories={CATEGORIES}
                  currentFilters={{
                    searchQuery,
                    filterMonth,
                    filterYear,
                    filterCategory,
                    filterAccount,
                    filterType,
                    sortBy,
                    sortOrder,
                  }}
                  onApply={(updatedFilters) => {
                    setSearchQuery(updatedFilters.searchQuery);
                    setFilterMonth(updatedFilters.filterMonth);
                    setFilterYear(updatedFilters.filterYear);
                    setFilterCategory(updatedFilters.filterCategory);
                    setFilterAccount(updatedFilters.filterAccount);
                    setFilterType(updatedFilters.filterType);
                    setSortBy(updatedFilters.sortBy);
                    setSortOrder(updatedFilters.sortOrder);
                  }}
                />
                
                {/* Transaction List */}
                <motion.div 
                  layout="position"
                  transition={{ layout: { duration: 0.3, ease: "easeInOut" } }}
                  className="space-y-2"
                >
                  <AnimatePresence>
                    {filteredTransactions.map(t => {
                      const account = accounts.find(a => a.id === t.accountId);
                      return (
                        <motion.div 
                          layout
                          key={t.id} 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ type: "tween", ease: "easeInOut", duration: 0.15 }}
                          className={cn(
                            "glass-card p-3 flex items-center justify-between group border-l-4 border-l-blue-400 gap-3",
                            t.isProjected && "opacity-50 border-dashed bg-white/30"
                          )}
                        >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center",
                            t.type === 'Income' ? "bg-emerald-100 text-emerald-600" : 
                            t.type === 'Transfer' ? "bg-blue-100 text-blue-600" : "bg-neutral-100 text-neutral-600",
                            t.isProjected && "grayscale"
                          )}>
                            {t.type === 'Income' ? <ArrowDownLeft size={16} /> : 
                             t.type === 'Transfer' ? <ArrowRightLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate leading-tight">
                              {t.description}
                              {filterType !== 'Recurring' && (t.isProjected || (t.isRecurring && dateFns.isAfter(dateFns.parseISO(t.date), new Date()))) && (
                                <span className={cn(
                                  "ml-2 text-[8px] font-bold uppercase py-0.5 px-1 rounded",
                                  t.isProjected ? "bg-amber-100 text-amber-600" : "bg-neutral-200 text-neutral-500"
                                )}>
                                  Upcoming
                                </span>
                              )}
                              {!t.isProjected && t.isRecurring && (
                                <span className="ml-2 text-[8px] font-bold uppercase py-0.5 px-1 bg-blue-100 text-blue-600 rounded">
                                  {t.recurringFrequency}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-neutral-400 truncate mt-0.5 flex items-center flex-wrap gap-1">
                              <span>{account?.name} • {dateFns.format(dateFns.parseISO(t.date), 'MMM d')}</span>
                              {t.totalAmount && t.totalAmount > 0 && (
                                <>
                                  <span className="text-neutral-300">•</span>
                                  <span className="text-neutral-400">
                                    Bill: {formatCurrency(t.totalAmount)}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <p className={cn(
                            "font-bold text-sm whitespace-nowrap leading-tight",
                            t.type === 'Income' ? "text-emerald-600" : 
                            t.type === 'Transfer' ? "text-neutral-900" :
                            (t.category === 'Lent / Owed to Me' && !t.description.includes('(My Share)')) ? "text-blue-500" : 
                            "text-red-500"
                          )}>
                            {t.type === 'Income' ? '+' : '-'}{formatCurrency(t.amount)}
                          </p>
                          {!t.isProjected && (
                            <div className="flex items-center gap-1 mt-1">
                              <button 
                                onClick={() => {
                                  if (t.groupId) {
                                    const master = transactions.find(tx => tx.groupId === t.groupId && tx.description.includes('(My Share)'));
                                    setEditingTransaction(master || t);
                                  } else {
                                    setEditingTransaction(t);
                                  }
                                }} 
                                className="text-neutral-400 hover:text-blue-500 p-1 transition-colors active:scale-90"
                              >
                                <Pencil size={12} />
                              </button>
                              <button 
                                onClick={() => deleteTransaction(t.id)} 
                                className="text-neutral-400 hover:text-red-500 p-1 transition-colors active:scale-90"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12 text-neutral-400">
                    <p>No transactions found.</p>
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {activeTab === 'accounts' && (
            <motion.div
              key="accounts"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.15 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Your Accounts</h2>
                <div className="flex gap-2">
                  <button onClick={() => setIsAccountModalOpen(true)} className="glass-button flex items-center gap-2 text-sm">
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>
              
              <div className="grid gap-3">
                {accounts.map(acc => (
                  <div 
                    key={acc.id} 
                    className="glass-card p-4 space-y-3 transition-all cursor-pointer hover:border-blue-200 active:scale-[0.99]"
                    onClick={() => {
                      setSelectedStatementCard(acc);
                    }}
                  >
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", acc.color)} />
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm truncate">{acc.name}</h3>
                          <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest truncate">{acc.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className={cn("text-base font-bold whitespace-nowrap", acc.balance < 0 ? "text-red-500" : "text-neutral-900")}>
                            {formatCurrency(acc.balance)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAccount(acc);
                            }} 
                            className="text-neutral-300 hover:text-blue-500 p-1"
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAccount(acc.id);
                            }} 
                            className="text-neutral-300 hover:text-red-400 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {acc.type === 'Credit Card' && (() => {
                      const pendingDues = calculatePendingDues(acc, transactions);
                      const isPaid = pendingDues === 0;
                      return (
                        <div className="pt-2 border-t border-neutral-100 flex justify-between items-center">
                          <div className="text-[10px] text-neutral-500 flex gap-3">
                            <p><span className="font-bold uppercase">Bill:</span> Day {acc.billingDate}</p>
                            <p><span className="font-bold uppercase">Due:</span> Day {acc.dueDate}</p>
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCreditCard(acc);
                              setIsPayBillModalOpen(true);
                            }}
                            className={cn(
                              "text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                              isPaid 
                                ? "text-emerald-600 bg-emerald-50/70 border border-emerald-100/50 hover:bg-emerald-100/60" 
                                : "text-blue-600 bg-blue-50/80 hover:bg-blue-100"
                            )}
                          >
                            {isPaid ? "Paid ✓" : "Pay Bill"}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.15 }}
              className="space-y-8"
            >
              <h2 className="text-2xl font-bold">Settings</h2>
              
              <section className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-neutral-400 tracking-widest">Data Management</h3>
                <div className="glass-card p-4 space-y-4">
                  <button 
                    onClick={exportBackup}
                    className="w-full flex items-center justify-between p-2 hover:bg-neutral-50 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Download size={20} className="text-neutral-400" />
                      <span className="font-medium">Export Backup (JSON)</span>
                    </div>
                    <ChevronRight size={16} className="text-neutral-300" />
                  </button>
                  
                  <label className="w-full flex items-center justify-between p-2 hover:bg-neutral-50 rounded-xl transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Upload size={20} className="text-neutral-400" />
                      <span className="font-medium">Import Backup (JSON)</span>
                    </div>
                    <input type="file" accept=".json" onChange={importBackup} className="hidden" />
                    <ChevronRight size={16} className="text-neutral-300" />
                  </label>

                  <button 
                    onClick={() => setIsResetModalOpen(true)}
                    className="w-full flex items-center justify-between p-2 hover:bg-red-50 rounded-xl transition-colors text-red-600"
                  >
                    <div className="flex items-center gap-3">
                      <Trash2 size={20} className="text-red-400" />
                      <span className="font-medium">Reset All Data</span>
                    </div>
                    <ChevronRight size={16} className="text-red-200" />
                  </button>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-x border-neutral-100/80 rounded-t-[24px] px-6 py-2 flex items-center justify-between z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "flex-grow flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all cursor-pointer",
            activeTab === 'dashboard' ? "text-blue-600 font-semibold" : "text-neutral-400 hover:text-neutral-600"
          )}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </button>
        
        {/* Central Plus Transact Button */}
        <div className="flex-grow flex-1 flex justify-center -mt-6">
          <button 
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-100 active:scale-95 transition-transform cursor-pointer"
            title="Add Transaction"
          >
            <Plus size={24} />
          </button>
        </div>
        
        <button 
          onClick={() => setActiveTab('accounts')}
          className={cn(
            "flex-grow flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all cursor-pointer",
            activeTab === 'accounts' ? "text-blue-600 font-semibold" : "text-neutral-400 hover:text-neutral-600"
          )}
        >
          <Wallet size={20} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Accounts</span>
        </button>
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {(isExpenseModalOpen || editingTransaction) && (
          <TransactionModal 
            accounts={accounts} 
            initialData={editingTransaction}
            defaultAccountId={defaultTransactionAccountId}
            onClose={() => {
              setIsExpenseModalOpen(false);
              setEditingTransaction(null);
              setDefaultTransactionAccountId(undefined);
            }} 
            onSave={(txs) => {
              if (editingTransaction) updateTransaction(editingTransaction.id, txs);
              else addTransaction(txs);
              setDefaultTransactionAccountId(undefined);
            }} 
            categories={CATEGORIES}
          />
        )}
        {(isAccountModalOpen || editingAccount) && (
          <AccountModal 
            initialData={editingAccount}
            onClose={() => {
              setIsAccountModalOpen(false);
              setEditingAccount(null);
            }} 
            onSave={(a) => {
              if (editingAccount) updateAccount(editingAccount.id, a);
              else addAccount(a);
            }} 
          />
        )}
        {isPayBillModalOpen && selectedCreditCard && (
          <PayBillModal 
            cc={selectedCreditCard}
            accounts={accounts.filter(a => a.type !== 'Credit Card')}
            transactions={transactions}
            onClose={() => setIsPayBillModalOpen(false)}
            onSave={payBill}
            defaultAmount={calculatePendingDues(selectedCreditCard, transactions)}
          />
        )}
        {selectedStatementCard && (
          <CreditCardStatementModal 
            cc={selectedStatementCard}
            transactions={transactions}
            onClose={() => setSelectedStatementCard(null)}
            onEditTransaction={(t) => {
              if (t.groupId) {
                const master = transactions.find(tx => tx.groupId === t.groupId && tx.description.includes('(My Share)'));
                setEditingTransaction(master || t);
              } else {
                setEditingTransaction(t);
              }
            }}
            onDeleteTransaction={deleteTransaction}
            onAddTransaction={(accId) => {
              setDefaultTransactionAccountId(accId);
              setIsExpenseModalOpen(true);
            }}
          />
        )}
        {isResetModalOpen && (
          <ResetModal
            onClose={() => setIsResetModalOpen(false)}
            onReset={handleReset}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
