import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Calculator } from 'lucide-react';
import * as dateFns from 'date-fns';
import { cn, formatCurrency } from '@/src/lib/utils';
import { Account, Transaction } from '@/src/types';

interface TransactionModalProps {
  accounts: Account[];
  onClose: () => void;
  onSave: (transactions: Omit<Transaction, 'id'>[]) => void;
  categories: string[];
  initialData?: Transaction | null;
  defaultAccountId?: string;
}

export default function TransactionModal({ accounts, onClose, onSave, categories, initialData, defaultAccountId }: TransactionModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const [type, setType] = useState<Transaction['type']>(initialData?.type || 'Expense');
  const [amount, setAmount] = useState(initialData?.totalAmount?.toString() || initialData?.amount?.toString() || '');
  const [showCalc, setShowCalc] = useState(false);
  const [description, setDescription] = useState(initialData?.description.replace(/ \(My Share\)$| \(Lent\)$| \(Lent to .*\)$/, '') || '');
  const [category, setCategory] = useState(() => {
    if (initialData?.originalCategory) return initialData.originalCategory;
    if (initialData?.category === 'Lent / Owed to Me') return 'Miscellaneous';
    return initialData?.category || 'Miscellaneous';
  });
  const [accountId, setAccountId] = useState(initialData?.accountId || defaultAccountId || accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(initialData?.toAccountId || accounts[1]?.id || '');
  const [date, setDate] = useState(initialData ? dateFns.format(dateFns.parseISO(initialData.date), 'yyyy-MM-dd') : dateFns.format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [recurringFrequency, setRecurringFrequency] = useState<Transaction['recurringFrequency']>(initialData?.recurringFrequency || 'Monthly');
  const [recurringEndDate, setRecurringEndDate] = useState(initialData?.recurringEndDate ? dateFns.format(dateFns.parseISO(initialData.recurringEndDate), 'yyyy-MM-dd') : '');
  const [isSettlingDebt, setIsSettlingDebt] = useState(initialData?.type === 'Income' && initialData?.category === 'Lent / Owed to Me');

  // Calculator Logic
  const calculateResult = (input: string): number | null => {
    try {
      // Remove any characters that aren't numbers, operators, dots, or parentheses
      const sanitized = input.replace(/[^0-9+\-*/.()]/g, '');
      if (!sanitized || !/[0-9]/.test(sanitized)) return null;
      
      // Basic evaluation using Function constructor (safer than eval if sanitized)
      // We only allow simple arithmetic
      const result = new Function(`return ${sanitized}`)();
      return typeof result === 'number' && isFinite(result) ? parseFloat(result.toFixed(2)) : null;
    } catch {
      return null;
    }
  };

  const calculatedAmount = useMemo(() => calculateResult(amount), [amount]);

  // Split Logic State
  const [isSplit, setIsSplit] = useState(!!initialData?.groupId);
  const [splitType, setSplitType] = useState<'Percentage' | 'Equal' | 'Amount'>(initialData?.splitType || 'Percentage');
  const [mySharePercent, setMySharePercent] = useState(initialData?.mySharePercent?.toString() || '50');
  const [myShareAmountInput, setMyShareAmountInput] = useState(initialData?.myShareAmount?.toString() || '');
  const [numPeople, setNumPeople] = useState(initialData?.numPeople?.toString() || '2');
  const [debtorNames, setDebtorNames] = useState(initialData?.debtorNames || '');

  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
        className="glass-card w-full max-w-md flex flex-col h-[100dvh] sm:h-auto sm:max-h-[85vh] overflow-hidden rounded-t-[24px] sm:rounded-3xl shadow-2xl bg-white"
      >
        {/* Sticky Header */}
        <div className="flex-shrink-0 p-5 pb-3 border-b border-neutral-100 flex justify-between items-center bg-white">
          <h3 className="text-xl font-bold text-neutral-900">{initialData ? 'Edit Transaction' : 'New Transaction'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer">
            <X size={20} className="text-neutral-500" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex-shrink-0 bg-neutral-50 px-5 py-2.5 border-b border-neutral-150/40 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={cn(
              "flex-grow py-2 text-xs font-bold uppercase rounded-xl transition-all border flex items-center justify-center gap-1.5 cursor-pointer",
              activeTab === 'basic'
                ? "bg-white border-neutral-200 text-blue-600 shadow-sm"
                : "bg-transparent border-transparent text-neutral-400 hover:text-neutral-600"
            )}
          >
            Core Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={cn(
              "flex-grow py-2 text-xs font-bold uppercase rounded-xl transition-all border flex items-center justify-center gap-1.5 cursor-pointer relative",
              activeTab === 'advanced'
                ? "bg-white border-neutral-200 text-blue-600 shadow-sm"
                : "bg-transparent border-transparent text-neutral-400 hover:text-neutral-600"
            )}
          >
            <span>{type === 'Expense' ? 'Split & Repeat' : 'Repeat Options'}</span>
            {((type === 'Expense' && isSplit) || isRecurring) && (
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse absolute top-1.5 right-3 border-2 border-white" />
            )}
          </button>
        </div>

        {/* Scrollable Form Area */}
        <div className="flex-grow overflow-y-auto p-5 space-y-5 no-scrollbar overscroll-contain bg-white">
          {activeTab === 'basic' ? (
            <div className="space-y-4">
              <div className="flex p-1 bg-neutral-100 rounded-xl">
                {(['Expense', 'Income', 'Transfer'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t);
                      if (t !== 'Expense') setIsSplit(false);
                    }}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer",
                      type === t ? "bg-white shadow-sm text-neutral-900" : "text-neutral-400"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {type === 'Income' && (
                <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <span className="text-sm font-semibold text-emerald-900">Settling a debt or Reversed Expense?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isSettlingDebt} 
                      onChange={e => setIsSettlingDebt(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-400">Amount</label>
                  <div className="flex items-center gap-1.5">
                    {calculatedAmount !== null && amount.match(/[+\-*/]/) && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        type="button"
                        onClick={() => {
                          setAmount(calculatedAmount.toString());
                        }}
                        className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        Apply: {formatCurrency(calculatedAmount)}
                      </motion.button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCalc(prev => !prev)}
                      className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-all cursor-pointer",
                        showCalc 
                          ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm" 
                          : "bg-neutral-50 border-neutral-200 text-neutral-500 hover:bg-neutral-100"
                      )}
                    >
                      <Calculator size={10} />
                      <span>{showCalc ? "Hide Keypad" : "Show Keypad"}</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    inputMode={showCalc ? "none" : "decimal"}
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="glass-input w-full text-2xl font-bold h-auto py-2 pr-10"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300">
                    <span className="text-xs font-bold">₹</span>
                  </div>
                </div>

                {showCalc && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, height: 0 }}
                    animate={{ opacity: 1, scale: 1, height: 'auto' }}
                    exit={{ opacity: 0, scale: 0.95, height: 0 }}
                    className="overflow-hidden bg-neutral-50 border border-neutral-200/50 p-2.5 rounded-2xl"
                  >
                    <div className="grid grid-cols-4 gap-1.5 text-sm font-semibold select-none">
                      {[
                        { label: 'C', value: 'clear', className: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-150/45 text-[13px] font-extrabold' },
                        { label: '(', value: '(', className: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700' },
                        { label: ')', value: ')', className: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700' },
                        { label: '÷', value: '/', className: 'bg-blue-50 hover:bg-blue-100 text-blue-600 text-base font-extrabold' },
                        
                        { label: '7', value: '7', className: 'bg-white hover:bg-neutral-100 border border-neutral-200/40 text-neutral-800 font-bold' },
                        { label: '8', value: '8', className: 'bg-white hover:bg-neutral-100 border border-neutral-200/40 text-neutral-800 font-bold' },
                        { label: '9', value: '9', className: 'bg-white hover:bg-neutral-100 border border-neutral-200/40 text-neutral-800 font-bold' },
                        { label: '×', value: '*', className: 'bg-blue-50 hover:bg-blue-100 text-blue-600 text-[17px] font-extrabold' },
                        
                        { label: '4', value: '4', className: 'bg-white hover:bg-neutral-100 border border-neutral-200/40 text-neutral-800 font-bold' },
                        { label: '5', value: '5', className: 'bg-white hover:bg-neutral-100 border border-neutral-200/40 text-neutral-800 font-bold' },
                        { label: '6', value: '6', className: 'bg-white hover:bg-neutral-100 border border-neutral-200/40 text-neutral-800 font-bold' },
                        { label: '−', value: '-', className: 'bg-blue-50 hover:bg-blue-100 text-blue-600 text-base font-extrabold' },
                        
                        { label: '1', value: '1', className: 'bg-white hover:bg-neutral-100 border border-neutral-200/40 text-neutral-800 font-bold' },
                        { label: '2', value: '2', className: 'bg-white hover:bg-neutral-100 border border-neutral-200/40 text-neutral-800 font-bold' },
                        { label: '3', value: '3', className: 'bg-white hover:bg-neutral-100 border border-neutral-200/40 text-neutral-800 font-bold' },
                        { label: '+', value: '+', className: 'bg-blue-50 hover:bg-blue-100 text-blue-600 text-[17px] font-extrabold' },
                        
                        { label: '0', value: '0', className: 'bg-white hover:bg-neutral-100 border border-neutral-200/40 text-neutral-800 font-bold' },
                        { label: '.', value: '.', className: 'bg-white hover:bg-neutral-100 border border-neutral-200/40 text-neutral-800 font-bold' },
                        { label: '⌫', value: 'backspace', className: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-[13px]' },
                        { label: '=', value: 'equal', className: 'bg-blue-600 hover:bg-blue-700 text-white font-extrabold' }
                      ].map((btn, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (btn.value === 'clear') {
                              setAmount('');
                            } else if (btn.value === 'backspace') {
                              setAmount(prev => prev.slice(0, -1));
                            } else if (btn.value === 'equal') {
                              const res = calculateResult(amount);
                              if (res !== null) {
                                setAmount(res.toString());
                              }
                            } else {
                              setAmount(prev => prev + btn.value);
                            }
                          }}
                          className={cn(
                            "h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95",
                            btn.className
                          )}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
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
                    {categories.filter(cat => cat !== 'Lent / Owed to Me').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="space-y-1 min-w-0">
                  <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Account</label>
                  <select 
                    value={accountId} 
                    onChange={e => setAccountId(e.target.value)}
                    className="glass-input w-full text-sm"
                  >
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                {type === 'Transfer' && (
                  <div className="space-y-1 min-w-0">
                    <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">To Account</label>
                    <select 
                      value={toAccountId} 
                      onChange={e => setToAccountId(e.target.value)}
                      className="glass-input w-full text-sm"
                    >
                      {accounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-1 min-w-0">
                  <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Date</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="glass-input w-full text-sm appearance-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {type === 'Expense' && (
                <div className="space-y-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-900">Split with others?</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isSplit} 
                        onChange={e => setIsSplit(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {isSplit && (
                    <div className="space-y-3 pt-2 border-t border-blue-100">
                      <div className="flex p-1 bg-blue-100/50 rounded-lg gap-1">
                        {(['Percentage', 'Equal', 'Amount'] as const).map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSplitType(s)}
                            className={cn(
                              "flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer",
                              splitType === s ? "bg-white shadow-sm text-blue-600" : "text-blue-400"
                            )}
                          >
                            {s === 'Percentage' ? 'By %' : s === 'Equal' ? 'Equal' : 'Amount'}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-blue-400 ml-1">Names (comma separated)</label>
                        <input 
                          type="text" 
                          value={debtorNames} 
                          onChange={e => setDebtorNames(e.target.value)}
                          placeholder="Name 1, Name 2, Name 3"
                          className="glass-input w-full text-sm"
                        />
                      </div>

                      {splitType === 'Percentage' ? (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-blue-400 ml-1">My Share %</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              step="any"
                              value={mySharePercent} 
                              onChange={e => setMySharePercent(e.target.value)}
                              className="glass-input w-full text-sm pr-8"
                              min="0"
                              max="100"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-blue-400">%</span>
                          </div>
                        </div>
                      ) : splitType === 'Equal' ? (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-blue-400 ml-1">Number of People</label>
                          <input 
                            type="number" 
                            value={numPeople} 
                            onChange={e => setNumPeople(e.target.value)}
                            className="glass-input w-full text-sm"
                            min="2"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-blue-400 ml-1">My Share Amount</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={myShareAmountInput} 
                            onChange={e => setMyShareAmountInput(e.target.value)}
                            placeholder="0.00"
                            className="glass-input w-full text-sm"
                          />
                        </div>
                      )}
                      
                      <div className="bg-blue-600/10 p-2 rounded-lg">
                        <p className="text-[10px] text-blue-600 font-medium">
                          {(() => {
                            const total = parseFloat(amount || '0');
                            if (splitType === 'Percentage') {
                              const myShare = parseFloat(((total * parseFloat(mySharePercent || '0')) / 100).toFixed(2));
                              const lent = parseFloat((total - myShare).toFixed(2));
                              const baseMsg = `You'll pay ${mySharePercent}% and lent the remaining ${100 - parseFloat(mySharePercent || '0')}%`;
                              return total > 0 ? `${baseMsg} (${formatCurrency(myShare)} / ${formatCurrency(lent)})` : baseMsg;
                            } else if (splitType === 'Equal') {
                              const myShare = parseFloat((total / parseInt(numPeople || '1')).toFixed(2));
                              const lent = parseFloat((total - myShare).toFixed(2));
                              const baseMsg = `You'll pay 1/${numPeople} share and lent the rest to ${parseInt(numPeople || '2') - 1} people`;
                              return total > 0 ? `${baseMsg} (${formatCurrency(myShare)} / ${formatCurrency(lent)})` : baseMsg;
                            } else {
                              const myShare = parseFloat(myShareAmountInput || '0');
                              const lent = parseFloat((total - myShare).toFixed(2));
                              const baseMsg = `You'll pay ${formatCurrency(myShare)} and lent the remaining ${formatCurrency(lent)}`;
                              return total > 0 ? baseMsg : `Enter total amount to see split`;
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4 p-4 bg-neutral-50/70 rounded-2xl border border-neutral-200/50 relative">
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
                  <span className="text-sm font-semibold text-neutral-800">Recurring Transaction</span>
                </label>

                {isRecurring && (
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-neutral-200/50">
                    <div className="space-y-1">
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
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">End Date (Optional)</label>
                      <input 
                        type="date" 
                        value={recurringEndDate} 
                        onChange={e => setRecurringEndDate(e.target.value)}
                        min={date}
                        className="glass-input w-full text-sm appearance-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 p-5 pt-3 border-t border-neutral-100 bg-white/80 backdrop-blur-md pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button 
            type="button"
            onClick={() => {
              const totalAmount = calculatedAmount || parseFloat(amount) || 0;
              const commonData = {
                accountId,
                toAccountId: type === 'Transfer' ? toAccountId : undefined,
                date: new Date(date).toISOString(),
                isRecurring,
                recurringFrequency: isRecurring ? recurringFrequency : undefined,
                recurringEndDate: isRecurring && recurringEndDate ? new Date(recurringEndDate).toISOString() : undefined,
                type,
              };

              const results: Omit<Transaction, 'id'>[] = [];

              if (type === 'Expense' && isSplit) {
                const groupId = initialData?.groupId || Math.random().toString(36).substr(2, 9);
                let myShareAmount: number;
                if (splitType === 'Percentage') {
                  myShareAmount = parseFloat(((totalAmount * parseFloat(mySharePercent || '0')) / 100).toFixed(2));
                } else if (splitType === 'Equal') {
                  myShareAmount = parseFloat((totalAmount / parseInt(numPeople || '1')).toFixed(2));
                } else {
                  myShareAmount = parseFloat(myShareAmountInput || '0');
                }
                const lentAmount = parseFloat((totalAmount - myShareAmount).toFixed(2));

                const splitMetadata = {
                  groupId,
                  splitType,
                  mySharePercent: parseFloat(mySharePercent),
                  myShareAmount: parseFloat(myShareAmountInput || '0'),
                  numPeople: parseInt(numPeople),
                  totalAmount,
                  debtorNames,
                  originalCategory: category
                };

                // Entry A: My Share
                results.push({
                  ...commonData,
                  amount: myShareAmount,
                  description: `${description} (My Share)`,
                  category,
                  ...splitMetadata
                });

                // Entry B: Lent
                if (lentAmount > 0) {
                  const names = debtorNames.split(',').map(n => n.trim()).filter(Boolean);
                  let lentDescription = description;
                  if (names.length === 1) {
                    lentDescription += ` (Lent to ${names[0]})`;
                  } else if (names.length === 2) {
                    lentDescription += ` (Lent to ${names[0]} and ${names[1]})`;
                  } else if (names.length >= 3) {
                    lentDescription += ` (Lent to ${names[0]}, ${names[1]} ... )`;
                  } else {
                    lentDescription += ` (Lent)`;
                  }

                  results.push({
                    ...commonData,
                    amount: lentAmount,
                    description: lentDescription,
                    category: 'Lent / Owed to Me',
                    ...splitMetadata
                  });
                }
              } else {
                results.push({
                  ...commonData,
                  amount: totalAmount,
                  description,
                  category: type === 'Expense' ? category : (isSettlingDebt ? 'Lent / Owed to Me' : 'General'),
                });
              }
              onSave(results);
              onClose();
            }}
            disabled={(!calculatedAmount && isNaN(parseFloat(amount))) || !description}
            className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer shadow-sm active:scale-95 text-center"
          >
            {initialData ? 'Update Transaction' : 'Save Transaction'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
