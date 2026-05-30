import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Search, ArrowDownWideNarrow, ArrowUpNarrowWide, Check, CalendarDays } from 'lucide-react';
import { cn } from '../lib/utils';
import { Account } from '../types';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: string[];
  currentFilters: {
    searchQuery: string;
    filterMonth: string;
    filterYear: string;
    filterCategory: string;
    filterAccount: string;
    filterType: 'All' | 'Income' | 'Expense' | 'Lent' | 'Recurring';
    sortBy: 'date' | 'amount';
    sortOrder: 'asc' | 'desc';
  };
  onApply: (filters: {
    searchQuery: string;
    filterMonth: string;
    filterYear: string;
    filterCategory: string;
    filterAccount: string;
    filterType: 'All' | 'Income' | 'Expense' | 'Lent' | 'Recurring';
    sortBy: 'date' | 'amount';
    sortOrder: 'asc' | 'desc';
  }) => void;
}

export default function FilterModal({
  isOpen,
  onClose,
  accounts,
  categories,
  currentFilters,
  onApply,
}: FilterModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Local state initialized to currentFilters
  const [searchQuery, setSearchQuery] = useState(currentFilters.searchQuery);
  const [filterMonth, setFilterMonth] = useState(currentFilters.filterMonth);
  const [filterYear, setFilterYear] = useState(currentFilters.filterYear);
  const [filterCategory, setFilterCategory] = useState(currentFilters.filterCategory);
  const [filterAccount, setFilterAccount] = useState(currentFilters.filterAccount);
  const [filterType, setFilterType] = useState(currentFilters.filterType);
  const [sortBy, setSortBy] = useState(currentFilters.sortBy);
  const [sortOrder, setSortOrder] = useState(currentFilters.sortOrder);

  // Sync state if modal is reopened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(currentFilters.searchQuery);
      setFilterMonth(currentFilters.filterMonth);
      setFilterYear(currentFilters.filterYear);
      setFilterCategory(currentFilters.filterCategory);
      setFilterAccount(currentFilters.filterAccount);
      setFilterType(currentFilters.filterType);
      setSortBy(currentFilters.sortBy);
      setSortOrder(currentFilters.sortOrder);
    }
  }, [isOpen, currentFilters]);

  if (!isOpen) return null;

  const handleReset = () => {
    setSearchQuery('');
    setFilterMonth('All');
    setFilterYear('All');
    setFilterCategory('All');
    setFilterAccount('All');
    setFilterType('All');
    setSortBy('date');
    setSortOrder('desc');
  };

  const handleApply = () => {
    onApply({
      searchQuery,
      filterMonth,
      filterYear,
      filterCategory,
      filterAccount,
      filterType,
      sortBy,
      sortOrder,
    });
    onClose();
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYearHex = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => (currentYearHex + 2 - i).toString());

  // Date helper utilities
  const getCurrentMonthName = () => new Date().toLocaleString('en-US', { month: 'long' });
  const getCurrentYearString = () => new Date().getFullYear().toString();
  
  const getPrevMonthDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  };
  const getPrevMonthName = () => getPrevMonthDate().toLocaleString('en-US', { month: 'long' });
  const getPrevMonthYearString = () => getPrevMonthDate().getFullYear().toString();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.3 }}
        className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-neutral-200/50 w-full max-w-md overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-white/50">
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm">Filter Activity</h3>
            <p className="text-[10px] text-neutral-400 font-medium">Refine your transaction list</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4.5 overflow-y-auto">
          {/* Search Term */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Search Keywords</label>
            <div className="relative group/search">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 group-focus-within/search:text-blue-500 transition-colors z-10">
                <Search size={14} />
              </div>
              <input
                type="text"
                placeholder="Search description, amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-neutral-200/60 rounded-xl py-2 px-3 pl-8.5 text-xs text-neutral-700 placeholder:text-neutral-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Quick Date Filters</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setFilterMonth(getCurrentMonthName());
                  setFilterYear(getCurrentYearString());
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5",
                  filterMonth === getCurrentMonthName() && filterYear === getCurrentYearString()
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-600"
                )}
              >
                <CalendarDays size={11} />
                This Month ({getCurrentMonthName().substring(0, 3)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMonth(getPrevMonthName());
                  setFilterYear(getPrevMonthYearString());
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5",
                  filterMonth === getPrevMonthName() && filterYear === getPrevMonthYearString()
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-600"
                )}
              >
                <CalendarDays size={11} />
                Previous Month ({getPrevMonthName().substring(0, 3)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMonth('All');
                  setFilterYear('All');
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer",
                  filterMonth === 'All' && filterYear === 'All'
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-600"
                )}
              >
                All Time
              </button>
            </div>
          </div>

          {/* Type Selector (Pills) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Transaction Type</label>
            <div className="flex flex-wrap gap-1.5">
              {(['All', 'Income', 'Expense', 'Recurring'] as const).map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1",
                    filterType === type
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "bg-neutral-50 border border-neutral-200/40 hover:bg-neutral-100 text-neutral-500"
                  )}
                >
                  {filterType === type && <Check size={10} />}
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Main Dropdowns Group */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Month */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Month</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full bg-white border border-neutral-200/60 rounded-xl text-xs font-medium text-neutral-700 transition-all outline-none h-9 px-2.5 cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              >
                <option value="All">All Months</option>
                {months.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Year</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full bg-white border border-neutral-200/60 rounded-xl text-xs font-medium text-neutral-700 transition-all outline-none h-9 px-2.5 cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              >
                <option value="All">All Years</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="space-y-1.5 col-span-2">
              <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-white border border-neutral-200/60 rounded-xl text-xs font-medium text-neutral-700 transition-all outline-none h-9 px-2.5 cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              >
                <option value="All">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Account */}
            <div className="space-y-1.5 col-span-2">
              <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Account</label>
              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="w-full bg-white border border-neutral-200/60 rounded-xl text-xs font-medium text-neutral-700 transition-all outline-none h-9 px-2.5 cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              >
                <option value="All">All Accounts</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-neutral-100/80 pt-3.5 flex flex-col xs:flex-row xs:items-center justify-between gap-3">
            {/* Sort by */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">Sort by</label>
              <div className="inline-flex rounded-xl border border-neutral-200/60 p-0.5 bg-neutral-50/80">
                <button
                  type="button"
                  onClick={() => setSortBy('date')}
                  className={cn(
                    "text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                    sortBy === 'date' ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  Date
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('amount')}
                  className={cn(
                    "text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                    sortBy === 'amount' ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  Amount
                </button>
              </div>
            </div>

            {/* Sort Order */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block xs:text-right">Direction</label>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-xl border border-neutral-200/60 hover:bg-neutral-50 text-neutral-600 inline-flex items-center gap-1.5 transition-all cursor-pointer"
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

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/80 gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-600 active:scale-95 transition-all cursor-pointer px-1 py-1"
          >
            Clear All
          </button>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-700 bg-white border border-neutral-200/50 rounded-xl transition-all cursor-pointer active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-100 transition-all cursor-pointer active:scale-95"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
