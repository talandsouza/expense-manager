import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Wallet, ArrowUpRight, ArrowDownLeft, 
  Settings as SettingsIcon, LayoutDashboard, ChevronRight, 
  ArrowRightLeft, Download, Upload, Trash2, Pencil, Check, X, Search, Filter,
  ArrowDownWideNarrow, ArrowUpNarrowWide, Copy 
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
  const [filterMonth, setFilterMonth] = useState(dateFns.format(new Date(), 'MMMM'));
  const [filterYear, setFilterYear] = useState(dateFns.format(new Date(), 'yyyy'));
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterAccount, setFilterAccount] = useState('All');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isCopied, setIsCopied] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'All' | 'Income' | 'Expense' | 'Lent'>('All');

  // Recurring Logic
  useEffect(() => {
    const today = new Date();
    let accountsUpdated = false;
    let tempAccounts = [...accounts];
    let tempTransactions = [...transactions];
    let newTransactionsAdded: Transaction[] = [];

    const processedTransactions = tempTransactions.map(t => {
      if (t.isRecurring && t.recurringFrequency) {
        let nextDate = dateFns.parseISO(t.date);
        let hasGenerated = false;

        while (true) {
          let potentialNextDate: Date;
          if (t.recurringFrequency === 'Daily') potentialNextDate = dateFns.addDays(nextDate, 1);
          else if (t.recurringFrequency === 'Weekly') potentialNextDate = dateFns.addWeeks(nextDate, 1);
          else if (t.recurringFrequency === 'Monthly') potentialNextDate = dateFns.addMonths(nextDate, 1);
          else potentialNextDate = dateFns.addYears(nextDate, 1);

          if (dateFns.isAfter(potentialNextDate, today)) break;

          const id = Math.random().toString(36).substr(2, 9);
          const newInstance: Transaction = {
            ...t,
            id,
            date: potentialNextDate.toISOString(),
            isRecurring: false,
          };
          newTransactionsAdded.push(newInstance);
          nextDate = potentialNextDate;
          hasGenerated = true;
          
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
        }

        if (hasGenerated) {
          return { ...t, date: nextDate.toISOString() };
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
  }, []);

  // Derived Data
  const netWorth = useMemo(() => accounts.reduce((acc, curr) => acc + curr.balance, 0), [accounts]);
  const totalAssets = useMemo(() => accounts.filter(a => a.type !== 'Credit Card').reduce((acc, curr) => acc + curr.balance, 0), [accounts]);
  
  const peaceOfMind = useMemo(() => {
    const cc = accounts.find(a => a.type === 'Credit Card' && a.balance < 0);
    if (!cc) return null;
    
    const amount = Math.abs(cc.balance);
    const coverage = totalAssets / amount;
    
    const today = new Date();
    let dueDate = new Date(today.getFullYear(), today.getMonth(), cc.dueDate || 1);
    if (dateFns.isAfter(today, dueDate)) {
      dueDate = dateFns.addMonths(dueDate, 1);
    }
    const daysLeft = dateFns.differenceInDays(dueDate, today);

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
      amount,
      daysLeft,
      coverage: coverage.toFixed(1),
      isSafe: coverage > 1.5 && !hasPendingDues,
      hasPendingDues,
      overdueCards
    };
  }, [accounts, totalAssets, transactions]);

  const baseFilteredTransactions = useMemo(() => {
    const filtered = transactions.filter(t => {
      const queryWords = searchQuery.toLowerCase().split(' ').filter(word => word.length > 0);
      const searchableText = `${t.description} ${t.amount} ${t.debtorNames || ''}`.toLowerCase();
      const matchesSearch = queryWords.length === 0 || queryWords.every(word => searchableText.includes(word));
      
      const tDate = dateFns.parseISO(t.date);
      const matchesMonth = filterMonth === 'All' || dateFns.format(tDate, 'MMMM') === filterMonth;
      const matchesYear = filterYear === 'All' || dateFns.format(tDate, 'yyyy') === filterYear;
      const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
      const matchesAccount = filterAccount === 'All' || t.accountId === filterAccount || t.toAccountId === filterAccount;
      return matchesSearch && matchesMonth && matchesYear && matchesCategory && matchesAccount;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
    });
  }, [transactions, searchQuery, filterMonth, filterYear, filterCategory, filterAccount, sortBy, sortOrder]);

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

  const payBill = (ccId: string, fromId: string, amount: number) => {
    addTransaction({
      accountId: fromId,
      toAccountId: ccId,
      amount,
      description: `Bill Payment`,
      date: new Date().toISOString(),
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
    <div className="max-w-md mx-auto min-h-screen pb-60 px-4 pt-8 relative overflow-x-hidden">
      {/* Header */}
      <header className="mb-8 flex justify-between items-end">
        <div>
          <p className="text-neutral-500 text-sm font-medium uppercase tracking-wider">Available Funds</p>
          <h1 className="text-4xl font-bold tracking-tight">{formatCurrency(netWorth)}</h1>
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

      {/* Main Content */}
      <main>
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
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
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest px-1">
                  Showing {filterDescription}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => setFilterType(filterType === 'Income' ? 'All' : 'Income')}
                    className={cn(
                      "glass-card p-4 border-l-4 border-l-emerald-500 flex-1 min-w-[120px] text-left transition-all active:scale-95",
                      filterType === 'Income' ? "ring-2 ring-emerald-500 ring-offset-2" : "opacity-70 grayscale-[0.3]"
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase text-neutral-400 mb-1">Income</p>
                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(cashFlow.income)}</p>
                  </button>
                  <button 
                    onClick={() => setFilterType(filterType === 'Expense' ? 'All' : 'Expense')}
                    className={cn(
                      "glass-card p-4 border-l-4 border-l-red-500 flex-1 min-w-[120px] text-left transition-all active:scale-95",
                      filterType === 'Expense' ? "ring-2 ring-red-500 ring-offset-2" : "opacity-70 grayscale-[0.3]"
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase text-neutral-400 mb-1">Expenses</p>
                    <p className="text-xl font-bold text-red-500">{formatCurrency(cashFlow.expense)}</p>
                  </button>
                  {Math.abs(cashFlow.lent) > 0.01 && (
                    <button 
                      onClick={() => setFilterType(filterType === 'Lent' ? 'All' : 'Lent')}
                      className={cn(
                        "glass-card p-4 border-l-4 border-l-blue-500 flex-1 min-w-[120px] text-left transition-all active:scale-95",
                        filterType === 'Lent' ? "ring-2 ring-blue-500 ring-offset-2" : "opacity-70 grayscale-[0.3]"
                      )}
                    >
                      <p className="text-[10px] font-bold uppercase text-neutral-400 mb-1">Lent</p>
                      <p className="text-xl font-bold text-blue-500">{formatCurrency(cashFlow.lent)}</p>
                    </button>
                  )}
                </div>
              </div>

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
                    >
                      <Filter size={16} />
                    </button>
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
                  {(filterMonth !== dateFns.format(new Date(), 'MMMM') || filterYear !== dateFns.format(new Date(), 'yyyy') || filterCategory !== 'All' || filterAccount !== 'All' || searchQuery !== '' || sortBy !== 'date' || sortOrder !== 'desc' || filterType !== 'All') && (
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setFilterMonth(dateFns.format(new Date(), 'MMMM'));
                        setFilterYear(dateFns.format(new Date(), 'yyyy'));
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

                {/* Filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ 
                        height: { duration: 0.3, ease: "easeInOut" },
                        opacity: { duration: 0.2 }
                      }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 pb-4 space-y-3">
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 group-focus-within:text-blue-500 transition-colors z-10">
                            <Search size={18} />
                          </div>
                          <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="glass-input w-full py-3.5 text-sm transition-none"
                            style={{ paddingLeft: '3rem' }}
                          />
                        </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          value={filterMonth} 
                          onChange={(e) => setFilterMonth(e.target.value)}
                          className="glass-input text-[10px] font-bold uppercase py-2 px-2"
                        >
                          <option value="All">Month</option>
                          {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>

                        <select 
                          value={filterYear} 
                          onChange={(e) => setFilterYear(e.target.value)}
                          className="glass-input text-[10px] font-bold uppercase py-2 px-2"
                        >
                          <option value="All">Year</option>
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                            <option key={y} value={y.toString()}>{y}</option>
                          ))}
                        </select>

                        <select 
                          value={filterCategory} 
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="glass-input text-[10px] font-bold uppercase py-2 px-2"
                        >
                          <option value="All">Category</option>
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>

                        <select 
                          value={filterAccount} 
                          onChange={(e) => setFilterAccount(e.target.value)}
                          className="glass-input text-[10px] font-bold uppercase py-2 px-2"
                        >
                          <option value="All">Account</option>
                          {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] font-bold uppercase text-neutral-400">Sort by:</span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setSortBy('date')}
                            className={cn(
                              "text-[10px] font-bold uppercase px-2 py-1 rounded-md transition-all",
                              sortBy === 'date' ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"
                            )}
                          >
                            Date
                          </button>
                          <button 
                            onClick={() => setSortBy('amount')}
                            className={cn(
                              "text-[10px] font-bold uppercase px-2 py-1 rounded-md transition-all",
                              sortBy === 'amount' ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"
                            )}
                          >
                            Amount
                          </button>
                        </div>
                        <div className="ml-auto">
                          <button 
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-neutral-100 text-neutral-500 flex items-center gap-1.5 transition-all active:scale-95"
                          >
                            {sortOrder === 'desc' ? (
                              <>
                                <ArrowDownWideNarrow size={12} />
                                {sortBy === 'date' ? 'Newest' : 'Highest'}
                              </>
                            ) : (
                              <>
                                <ArrowUpNarrowWide size={12} />
                                {sortBy === 'date' ? 'Oldest' : 'Lowest'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  )}
                </AnimatePresence>
                
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
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="glass-card p-3 flex items-center justify-between group border-l-4 border-l-blue-400 gap-3"
                        >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center",
                            t.type === 'Income' ? "bg-emerald-100 text-emerald-600" : 
                            t.type === 'Transfer' ? "bg-blue-100 text-blue-600" : "bg-neutral-100 text-neutral-600"
                          )}>
                            {t.type === 'Income' ? <ArrowDownLeft size={16} /> : 
                             t.type === 'Transfer' ? <ArrowRightLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate leading-tight">{t.description}</p>
                            <p className="text-[10px] text-neutral-400 truncate mt-0.5">{account?.name} • {dateFns.format(dateFns.parseISO(t.date), 'MMM d')}</p>
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
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
                    className={cn(
                      "glass-card p-4 space-y-3 transition-all",
                      acc.type === 'Credit Card' ? "cursor-pointer hover:border-blue-200 active:scale-[0.99]" : ""
                    )}
                    onClick={() => {
                      if (acc.type === 'Credit Card') {
                        setSelectedStatementCard(acc);
                      }
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2.5 h-2.5 rounded-full", acc.color)} />
                        <div>
                          <h3 className="font-bold text-sm">{acc.name}</h3>
                          <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">{acc.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={cn("text-base font-bold", acc.balance < 0 ? "text-red-500" : "text-neutral-900")}>
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

                    {acc.type === 'Credit Card' && (
                      <div className="pt-2 border-t border-neutral-100 flex justify-between items-center">
                        <div className="text-[10px] text-neutral-500 flex gap-3">
                          <p><span className="font-bold uppercase">Bill:</span> Day {acc.billingDate}</p>
                          <p><span className="font-bold uppercase">Due:</span> Day {acc.dueDate}</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCreditCard(acc);
                            setIsPayBillModalOpen(true);
                          }}
                          className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          PAY BILL
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
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

      {/* Floating Add Button - Home Screen Only */}
      <AnimatePresence>
        {activeTab === 'dashboard' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md pointer-events-none px-6 z-[60]"
          >
            <div className="flex justify-end">
              <button 
                onClick={() => setIsExpenseModalOpen(true)}
                className="w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center active:scale-95 transition-transform pointer-events-auto"
              >
                <Plus size={28} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md glass-card p-2 flex items-center justify-between z-50">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all",
            activeTab === 'dashboard' ? "bg-neutral-900 text-white" : "text-neutral-400"
          )}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-bold uppercase">Home</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('accounts')}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all",
            activeTab === 'accounts' ? "bg-neutral-900 text-white" : "text-neutral-400"
          )}
        >
          <Wallet size={20} />
          <span className="text-[10px] font-bold uppercase">Accounts</span>
        </button>
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {(isExpenseModalOpen || editingTransaction) && (
          <TransactionModal 
            accounts={accounts} 
            initialData={editingTransaction}
            onClose={() => {
              setIsExpenseModalOpen(false);
              setEditingTransaction(null);
            }} 
            onSave={(txs) => {
              if (editingTransaction) updateTransaction(editingTransaction.id, txs);
              else addTransaction(txs);
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
