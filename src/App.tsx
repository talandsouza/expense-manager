/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Settings as SettingsIcon, 
  LayoutDashboard,
  ChevronRight,
  ArrowRightLeft,
  Download,
  Upload,
  Trash2,
  X,
  Check,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  isAfter, 
  startOfMonth, 
  endOfMonth, 
  addMonths, 
  subMonths, 
  addDays,
  addWeeks,
  addYears,
  getDate, 
  setDay, 
  setMonth, 
  setYear,
  parseISO,
  differenceInDays
} from 'date-fns';
import Papa from 'papaparse';
import { useLocalStorage } from './hooks/useLocalStorage';
import { cn, formatCurrency } from './lib/utils';
import { Account, Transaction, AccountType, StatementGroup } from './types';

export default function App() {
  // --- State ---
  const [accounts, setAccounts] = useLocalStorage<Account[]>('pennywise_accounts', [
    { id: '1', name: 'Main Bank', type: 'Bank', balance: 150000, color: 'bg-blue-500' },
    { id: '2', name: 'Pocket Cash', type: 'Cash', balance: 5000, color: 'bg-emerald-500' },
    { id: '3', name: 'Credit Card', type: 'Credit Card', balance: -45000, billingDate: 15, dueDate: 5, color: 'bg-indigo-600' },
  ]);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('pennywise_transactions', []);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'settings'>('dashboard');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isPayBillModalOpen, setIsPayBillModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedCreditCard, setSelectedCreditCard] = useState<Account | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), 'MMMM'));
  const [filterYear, setFilterYear] = useState<string>(format(new Date(), 'yyyy'));
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterAccount, setFilterAccount] = useState<string>('All');

  const categories = [
    "Housing & Utilities",
    "Groceries",
    "Transportation",
    "Medical",
    "Insurance",
    "Gifts & Donations",
    "Investments",
    "Dining",
    "Tickets & Subscriptions",
    "Shopping",
    "Education",
    "Miscellaneous"
  ];

  // --- Recurring Logic ---
  React.useEffect(() => {
    const today = new Date();
    let accountsUpdated = false;
    let tempAccounts = [...accounts];
    let tempTransactions = [...transactions];
    let newTransactionsAdded: Transaction[] = [];

    const processedTransactions = tempTransactions.map(t => {
      if (t.isRecurring && t.recurringFrequency) {
        let nextDate = parseISO(t.date);
        let hasGenerated = false;

        while (true) {
          let potentialNextDate: Date;
          if (t.recurringFrequency === 'Daily') potentialNextDate = addDays(nextDate, 1);
          else if (t.recurringFrequency === 'Weekly') potentialNextDate = addWeeks(nextDate, 1);
          else if (t.recurringFrequency === 'Monthly') potentialNextDate = addMonths(nextDate, 1);
          else potentialNextDate = addYears(nextDate, 1);

          if (isAfter(potentialNextDate, today)) break;

          // Create new transaction instance
          const id = Math.random().toString(36).substr(2, 9);
          const newInstance: Transaction = {
            ...t,
            id,
            date: potentialNextDate.toISOString(),
            isRecurring: false, // The generated one isn't the master recurring template
          };
          newTransactionsAdded.push(newInstance);
          nextDate = potentialNextDate;
          hasGenerated = true;
          
          // Update temp balances
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

  // --- Derived Data ---
  const netWorth = useMemo(() => {
    return accounts.reduce((acc, curr) => acc + curr.balance, 0);
  }, [accounts]);

  const totalAssets = useMemo(() => {
    return accounts.filter(a => a.type !== 'Credit Card').reduce((acc, curr) => acc + curr.balance, 0);
  }, [accounts]);

  const totalDebt = useMemo(() => {
    return Math.abs(accounts.filter(a => a.type === 'Credit Card').reduce((acc, curr) => acc + curr.balance, 0));
  }, [accounts]);

  const peaceOfMind = useMemo(() => {
    const cc = accounts.find(a => a.type === 'Credit Card' && a.balance < 0);
    if (!cc) return null;
    
    const amount = Math.abs(cc.balance);
    const coverage = totalAssets / amount;
    
    // Calculate days until due
    const today = new Date();
    let dueDate = new Date(today.getFullYear(), today.getMonth(), cc.dueDate || 1);
    if (isAfter(today, dueDate)) {
      dueDate = addMonths(dueDate, 1);
    }
    const daysLeft = differenceInDays(dueDate, today);

    return {
      amount,
      daysLeft,
      coverage: coverage.toFixed(1),
      isSafe: coverage > 1.5
    };
  }, [accounts, totalAssets]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const tDate = parseISO(t.date);
      const matchesMonth = filterMonth === 'All' || format(tDate, 'MMMM') === filterMonth;
      const matchesYear = filterYear === 'All' || format(tDate, 'yyyy') === filterYear;
      const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
      const matchesAccount = filterAccount === 'All' || t.accountId === filterAccount || t.toAccountId === filterAccount;
      return matchesSearch && matchesMonth && matchesYear && matchesCategory && matchesAccount;
    });
  }, [transactions, searchQuery, filterMonth, filterYear, filterCategory, filterAccount]);

  const cashFlow = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === 'Income') acc.income += t.amount;
      else if (t.type === 'Expense') acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredTransactions]);

  // --- Logic ---
  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newTransaction = { ...t, id };
    setTransactions([newTransaction, ...transactions]);

    // Update account balance
    setAccounts(accounts.map(acc => {
      if (acc.id === t.accountId) {
        return { ...acc, balance: acc.balance + (t.type === 'Income' ? t.amount : -t.amount) };
      }
      if (t.type === 'Transfer' && acc.id === t.toAccountId) {
        return { ...acc, balance: acc.balance + t.amount };
      }
      return acc;
    }));
  };

  const updateTransaction = (id: string, updated: Omit<Transaction, 'id'>) => {
    const old = transactions.find(tx => tx.id === id);
    if (!old) return;

    // 1. Revert old transaction impact
    let tempAccounts = accounts.map(acc => {
      if (acc.id === old.accountId) {
        return { ...acc, balance: acc.balance - (old.type === 'Income' ? old.amount : -old.amount) };
      }
      if (old.type === 'Transfer' && acc.id === old.toAccountId) {
        return { ...acc, balance: acc.balance - old.amount };
      }
      return acc;
    });

    // 2. Apply new transaction impact
    tempAccounts = tempAccounts.map(acc => {
      if (acc.id === updated.accountId) {
        return { ...acc, balance: acc.balance + (updated.type === 'Income' ? updated.amount : -updated.amount) };
      }
      if (updated.type === 'Transfer' && acc.id === updated.toAccountId) {
        return { ...acc, balance: acc.balance + updated.amount };
      }
      return acc;
    });

    setAccounts(tempAccounts);
    setTransactions(transactions.map(tx => tx.id === id ? { ...updated, id } : tx));
  };

  const deleteTransaction = (id: string) => {
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;

    setTransactions(transactions.filter(tx => tx.id !== id));

    // Revert account balance
    setAccounts(accounts.map(acc => {
      if (acc.id === t.accountId) {
        return { ...acc, balance: acc.balance - (t.type === 'Income' ? t.amount : -t.amount) };
      }
      if (t.type === 'Transfer' && acc.id === t.toAccountId) {
        return { ...acc, balance: acc.balance - t.amount };
      }
      return acc;
    }));
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

  // --- Export/Import ---
  const exportToCSV = () => {
    // We'll export two separate sections in one file or use a JSON-like structure.
    // To keep it CSV but include both, we can prefix rows or use a combined object.
    // Better approach: Export a JSON file for "Full Backup" or a multi-part CSV.
    // Let's stick to a clean JSON export for "Full Backup" to ensure all types are preserved.
    const data = {
      accounts,
      transactions,
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pennywise_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
  };

  const importFromBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // --- Views ---
  return (
    <div className="max-w-md mx-auto min-h-screen pb-24 px-4 pt-8 relative overflow-x-hidden">
      {/* Header */}
      <header className="mb-8 flex justify-between items-end">
        <div>
          <p className="text-neutral-500 text-sm font-medium uppercase tracking-wider">Net Worth</p>
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
                  peaceOfMind.isSafe ? "border-l-emerald-500" : "border-l-amber-500"
                )}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase text-neutral-400">Peace of Mind</span>
                    {peaceOfMind.isSafe ? <Check size={16} className="text-emerald-500" /> : <X size={16} className="text-amber-500" />}
                  </div>
                  <p className="text-neutral-700 leading-relaxed">
                    You owe <span className="font-bold text-neutral-900">{formatCurrency(peaceOfMind.amount)}</span> in <span className="font-bold text-neutral-900">{peaceOfMind.daysLeft} days</span>. 
                    <br />
                    {parseFloat(peaceOfMind.coverage) >= 1 ? (
                      <>Your cash covers this <span className="font-bold text-neutral-900">{peaceOfMind.coverage}x</span> over.</>
                    ) : (
                      <>You need <span className="font-bold text-red-500">{Math.abs(1 / parseFloat(peaceOfMind.coverage)).toFixed(1)}x</span> more than what you have.</>
                    )}
                  </p>
                </div>
              )}

              {/* Cash Flow Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 border-l-4 border-l-emerald-500">
                  <p className="text-[10px] font-bold uppercase text-neutral-400 mb-1">Income</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(cashFlow.income)}</p>
                </div>
                <div className="glass-card p-4 border-l-4 border-l-red-500">
                  <p className="text-[10px] font-bold uppercase text-neutral-400 mb-1">Expenses</p>
                  <p className="text-xl font-bold text-red-500">{formatCurrency(cashFlow.expense)}</p>
                </div>
              </div>

              {/* Grouped Transactions */}
              <section className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Activity</h2>
                  {(filterMonth !== format(new Date(), 'MMMM') || filterYear !== format(new Date(), 'yyyy') || filterCategory !== 'All' || filterAccount !== 'All' || searchQuery !== '') && (
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setFilterMonth(format(new Date(), 'MMMM'));
                        setFilterYear(format(new Date(), 'yyyy'));
                        setFilterCategory('All');
                        setFilterAccount('All');
                      }}
                      className="text-[10px] font-bold uppercase text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="space-y-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="glass-input w-full pl-10"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    </div>
                    {searchQuery && (
                      <button 
                        onClick={() => {
                          setSearchQuery('');
                          setFilterMonth(format(new Date(), 'MMMM'));
                          setFilterYear(format(new Date(), 'yyyy'));
                          setFilterCategory('All');
                          setFilterAccount('All');
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      >
                        <X size={16} />
                      </button>
                    )}
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
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select 
                      value={filterAccount} 
                      onChange={(e) => setFilterAccount(e.target.value)}
                      className="glass-input text-[10px] font-bold uppercase py-2 px-2"
                    >
                      <option value="All">Account</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {Object.entries(
                  filteredTransactions
                    .reduce((groups: any, t) => {
                    const account = accounts.find(a => a.id === t.accountId);
                    let period = format(parseISO(t.date), 'MMMM yyyy');
                    let isFuture = false;

                    if (account?.type === 'Credit Card' && account.billingDate) {
                      const tDate = parseISO(t.date);
                      const billingDay = account.billingDate;
                      const tDay = getDate(tDate);
                      
                      if (tDay > billingDay) {
                        period = `Next Statement (${format(addMonths(tDate, 1), 'MMM')})`;
                        isFuture = true;
                      } else {
                        period = `Current Statement (${format(tDate, 'MMM')})`;
                      }
                    }

                    if (!groups[period]) groups[period] = { transactions: [], isFuture };
                    groups[period].transactions.push(t);
                    return groups;
                  }, {})
                ).map(([period, group]: [string, any]) => (
                  <div key={period} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest">{period}</h3>
                      <div className="flex-1 h-[1px] bg-neutral-100" />
                    </div>
                    {group.transactions.map((t: Transaction) => {
                      const account = accounts.find(a => a.id === t.accountId);
                      return (
                        <div 
                          key={t.id} 
                          className={cn(
                            "glass-card p-4 flex items-center justify-between group border-l-4 transition-all",
                            group.isFuture ? "border-l-purple-400" : "border-l-blue-400"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              t.type === 'Income' ? "bg-emerald-100 text-emerald-600" : 
                              t.type === 'Transfer' ? "bg-blue-100 text-blue-600" : "bg-neutral-100 text-neutral-600"
                            )}>
                              {t.type === 'Income' ? <ArrowDownLeft size={20} /> : 
                               t.type === 'Transfer' ? <ArrowRightLeft size={20} /> : <ArrowUpRight size={20} />}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{t.description}</p>
                              <p className="text-xs text-neutral-400">{account?.name} • {format(parseISO(t.date), 'MMM d')}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <p className={cn(
                              "font-bold text-sm",
                              t.type === 'Income' ? "text-emerald-600" : "text-neutral-900"
                            )}>
                              {t.type === 'Income' ? '+' : '-'}{formatCurrency(t.amount)}
                            </p>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setEditingTransaction(t)} 
                                className="text-neutral-400 hover:text-blue-500 transition-colors p-1"
                              >
                                <Pencil size={14} />
                              </button>
                              <button 
                                onClick={() => deleteTransaction(t.id)} 
                                className="text-neutral-400 hover:text-red-500 transition-colors p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {transactions.length === 0 && (
                  <div className="text-center py-12 text-neutral-400">
                    <p>No transactions yet.</p>
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
                <button onClick={() => setIsAccountModalOpen(true)} className="glass-button flex items-center gap-2 text-sm">
                  <Plus size={16} /> Add
                </button>
              </div>
              
              <div className="grid gap-4">
                {accounts.map(acc => (
                  <div key={acc.id} className="glass-card p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-3 h-3 rounded-full", acc.color)} />
                        <div>
                          <h3 className="font-bold">{acc.name}</h3>
                          <p className="text-xs text-neutral-400 uppercase font-bold tracking-widest">{acc.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-xl font-bold", acc.balance < 0 ? "text-red-500" : "text-neutral-900")}>
                          {formatCurrency(acc.balance)}
                        </p>
                      </div>
                    </div>

                    {acc.type === 'Credit Card' && (
                      <div className="pt-4 border-t border-neutral-100 flex justify-between items-center">
                        <div className="text-xs text-neutral-500">
                          <p>Billing: Day {acc.billingDate}</p>
                          <p>Due: Day {acc.dueDate}</p>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedCreditCard(acc);
                            setIsPayBillModalOpen(true);
                          }}
                          className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          PAY BILL
                        </button>
                      </div>
                    )}

                    <div className="flex justify-end items-center gap-3">
                      <button 
                        onClick={() => setEditingAccount(acc)} 
                        className="text-neutral-300 hover:text-blue-500 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => deleteAccount(acc.id)} 
                        className="text-neutral-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
                    onClick={exportToCSV}
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
                    <input type="file" accept=".json" onChange={importFromBackup} className="hidden" />
                    <ChevronRight size={16} className="text-neutral-300" />
                  </label>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-neutral-400 tracking-widest">About</h3>
                <div className="glass-card p-6 text-center space-y-2">
                  <p className="font-bold text-lg">PennyWise</p>
                  <p className="text-sm text-neutral-500">Version 1.0.0</p>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Designed for clarity. Built for peace of mind.
                  </p>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md glass-card p-2 flex items-center justify-between z-50">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all",
            activeTab === 'dashboard' ? "bg-neutral-900 text-white" : "text-neutral-400 hover:text-neutral-600"
          )}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-bold uppercase">Home</span>
        </button>
        
        <div className="relative -top-8 px-2">
          <button 
            onClick={() => setIsExpenseModalOpen(true)}
            className="w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus size={28} />
          </button>
        </div>

        <button 
          onClick={() => setActiveTab('accounts')}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all",
            activeTab === 'accounts' ? "bg-neutral-900 text-white" : "text-neutral-400 hover:text-neutral-600"
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
            initialData={editingTransaction || undefined}
            onClose={() => {
              setIsExpenseModalOpen(false);
              setEditingTransaction(null);
            }} 
            onSave={(t) => {
              if (editingTransaction) {
                updateTransaction(editingTransaction.id, t);
              } else {
                addTransaction(t);
              }
            }} 
            categories={categories}
          />
        )}
        {isAccountModalOpen || editingAccount ? (
          <AccountModal 
            initialData={editingAccount || undefined}
            onClose={() => {
              setIsAccountModalOpen(false);
              setEditingAccount(null);
            }} 
            onSave={(a) => {
              if (editingAccount) {
                updateAccount(editingAccount.id, a);
              } else {
                addAccount(a);
              }
            }} 
          />
        ) : null}
        {isPayBillModalOpen && selectedCreditCard && (
          <PayBillModal 
            cc={selectedCreditCard}
            accounts={accounts.filter(a => a.type !== 'Credit Card')}
            onClose={() => setIsPayBillModalOpen(false)}
            onSave={payBill}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---

function TransactionModal({ accounts, onClose, onSave, categories, initialData }: { 
  accounts: Account[], 
  onClose: () => void, 
  onSave: (t: any) => void, 
  categories: string[],
  initialData?: Transaction
}) {
  const [type, setType] = useState<'Expense' | 'Income' | 'Transfer'>(initialData?.type || 'Expense');
  const [amount, setAmount] = useState(initialData?.amount.toString() || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || 'Miscellaneous');
  const [accountId, setAccountId] = useState(initialData?.accountId || accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(initialData?.toAccountId || accounts[1]?.id || '');
  const [date, setDate] = useState(initialData ? format(parseISO(initialData.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [recurringFrequency, setRecurringFrequency] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>(initialData?.recurringFrequency || 'Monthly');

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
        className="glass-card w-full max-w-md p-6 space-y-6"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">{initialData ? 'Edit Transaction' : 'New Transaction'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex p-1 bg-neutral-100 rounded-xl">
          {(['Expense', 'Income', 'Transfer'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all",
                type === t ? "bg-white shadow-sm text-neutral-900" : "text-neutral-400"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Amount</label>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="glass-input w-full text-2xl font-bold"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Description</label>
            <input 
              type="text" 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              placeholder="What was it for?"
              className="glass-input w-full"
            />
          </div>

          {type === 'Expense' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Category</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value)}
                className="glass-input w-full text-sm"
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Account</label>
              <select 
                value={accountId} 
                onChange={e => setAccountId(e.target.value)}
                className="glass-input w-full text-sm"
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            {type === 'Transfer' ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">To Account</label>
                <select 
                  value={toAccountId} 
                  onChange={e => setToAccountId(e.target.value)}
                  className="glass-input w-full text-sm"
                >
                  {accounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Date</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  className="glass-input w-full text-sm"
                />
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={cn(
                "w-10 h-6 rounded-full transition-all relative",
                isRecurring ? "bg-blue-600" : "bg-neutral-200"
              )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  isRecurring ? "left-5" : "left-1"
                )} />
              </div>
              <input 
                type="checkbox" 
                checked={isRecurring} 
                onChange={e => setIsRecurring(e.target.checked)}
                className="hidden"
              />
              <span className="text-sm font-medium text-neutral-700">Recurring Transaction</span>
            </label>

            {isRecurring && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-1"
              >
                <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Frequency</label>
                <select 
                  value={recurringFrequency} 
                  onChange={e => setRecurringFrequency(e.target.value as any)}
                  className="glass-input w-full text-sm"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </motion.div>
            )}
          </div>
        </div>

        <button 
          onClick={() => {
            onSave({
              accountId,
              toAccountId: type === 'Transfer' ? toAccountId : undefined,
              amount: parseFloat(amount),
              description,
              date: new Date(date).toISOString(),
              category: type === 'Expense' ? category : 'General',
              type,
              isRecurring,
              recurringFrequency: isRecurring ? recurringFrequency : undefined
            });
            onClose();
          }}
          disabled={!amount || !description}
          className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          {initialData ? 'Update Transaction' : 'Save Transaction'}
        </button>
      </motion.div>
    </motion.div>
  );
}

function AccountModal({ onClose, onSave, initialData }: { 
  onClose: () => void, 
  onSave: (a: any) => void,
  initialData?: Account
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<AccountType>(initialData?.type || 'Bank');
  const [balance, setBalance] = useState(initialData?.balance.toString() || '');
  const [billingDate, setBillingDate] = useState(initialData?.billingDate?.toString() || '15');
  const [dueDate, setDueDate] = useState(initialData?.dueDate?.toString() || '5');

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
        className="glass-card w-full max-w-md p-6 space-y-6"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">{initialData ? 'Edit Account' : 'Add Account'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Account Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Chase Freedom"
              className="glass-input w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Type</label>
            <select 
              value={type} 
              onChange={e => setType(e.target.value as AccountType)}
              className="glass-input w-full"
            >
              <option value="Bank">Bank</option>
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Initial Balance</label>
            <input 
              type="number" 
              value={balance} 
              onChange={e => setBalance(e.target.value)}
              placeholder="0.00"
              className="glass-input w-full"
            />
          </div>

          {type === 'Credit Card' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Billing Day</label>
                <input 
                  type="number" 
                  min="1" max="31"
                  value={billingDate} 
                  onChange={e => setBillingDate(e.target.value)}
                  className="glass-input w-full"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Due Day</label>
                <input 
                  type="number" 
                  min="1" max="31"
                  value={dueDate} 
                  onChange={e => setDueDate(e.target.value)}
                  className="glass-input w-full"
                />
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => {
            onSave({
              name,
              type,
              balance: parseFloat(balance) || 0,
              billingDate: type === 'Credit Card' ? parseInt(billingDate) : undefined,
              dueDate: type === 'Credit Card' ? parseInt(dueDate) : undefined,
              color: initialData?.color || 'bg-blue-500'
            });
            onClose();
          }}
          disabled={!name}
          className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          {initialData ? 'Update Account' : 'Create Account'}
        </button>
      </motion.div>
    </motion.div>
  );
}

function PayBillModal({ cc, accounts, onClose, onSave }: { cc: Account, accounts: Account[], onClose: () => void, onSave: (ccId: string, fromId: string, amount: number) => void }) {
  const [fromId, setFromId] = useState(accounts[0]?.id || '');
  const [amount, setAmount] = useState(Math.abs(cc.balance).toString());

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
        className="glass-card w-full max-w-md p-6 space-y-6"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Pay Bill: {cc.name}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">From Account</label>
            <select 
              value={fromId} 
              onChange={e => setFromId(e.target.value)}
              className="glass-input w-full"
            >
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Payment Amount</label>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)}
              className="glass-input w-full text-2xl font-bold"
            />
          </div>
        </div>

        <button 
          onClick={() => {
            onSave(cc.id, fromId, parseFloat(amount));
            onClose();
          }}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-colors"
        >
          Confirm Payment
        </button>
      </motion.div>
    </motion.div>
  );
}
