import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles } from 'lucide-react';
import { Account, Transaction } from '@/src/types';
import { formatCurrency, calculatePendingDues, cn } from '@/src/lib/utils';
import * as dateFns from 'date-fns';

interface PayBillModalProps {
  cc: Account;
  accounts: Account[];
  transactions: Transaction[];
  onClose: () => void;
  onSave: (ccId: string, fromId: string, amount: number, date: string) => void;
  defaultAmount?: number;
}

export default function PayBillModal({ cc, accounts, transactions, onClose, onSave, defaultAmount }: PayBillModalProps) {
  const [fromId, setFromId] = useState(accounts[0]?.id || '');

  const statementDue = calculatePendingDues(cc, transactions);
  const totalOutstanding = Math.abs(cc.balance);
  const isFullyPaid = statementDue === 0;

  // Set default pay mode: if fully paid, default to total outstanding, otherwise statement due
  const [payMode, setPayMode] = useState<'statement' | 'total' | 'partial'>(
    isFullyPaid ? 'total' : 'statement'
  );

  // Initialize selected amount based on active mode
  const initialAmount = isFullyPaid 
    ? totalOutstanding 
    : (defaultAmount ?? statementDue);

  const [amount, setAmount] = useState(initialAmount.toFixed(2));
  const [date, setDate] = useState(dateFns.format(new Date(), 'yyyy-MM-dd'));

  const handleSelectMode = (mode: 'statement' | 'total' | 'partial') => {
    setPayMode(mode);
    if (mode === 'statement') {
      setAmount(statementDue.toFixed(2));
    } else if (mode === 'total') {
      setAmount(totalOutstanding.toFixed(2));
    } else if (mode === 'partial') {
      // If we switch to partial and current amount exactly matches statement or total,
      // present a sensible default of half that amount, or totalOutstanding
      const currentVal = parseFloat(amount);
      if (currentVal === statementDue || currentVal === totalOutstanding) {
        setAmount((statementDue > 0 ? statementDue / 2 : totalOutstanding / 2).toFixed(2));
      }
    }
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      if (Math.abs(parsed - statementDue) < 0.01 && !isFullyPaid) {
        setPayMode('statement');
      } else if (Math.abs(parsed - totalOutstanding) < 0.01) {
        setPayMode('total');
      } else {
        setPayMode('partial');
      }
    } else {
      setPayMode('partial');
    }
  };

  const adjustAmount = (increment: number) => {
    setPayMode('partial');
    const current = parseFloat(amount) || 0;
    setAmount((current + increment).toFixed(2));
  };

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
        className="glass-card w-full max-w-md p-6 space-y-6"
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">Pay Credit Card Bill</h3>
            <p className="text-xs text-neutral-400 font-semibold">{cc.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Pay from selection */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Pay From Account</label>
            <select 
              value={fromId} 
              onChange={e => setFromId(e.target.value)}
              className="glass-input w-full"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({formatCurrency(a.balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Payment Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="glass-input w-full"
            />
          </div>

          {/* Options Stack */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1 block mb-0.5">Select Payment Option</label>
            
            {/* Statement Due Option */}
            <button
              type="button"
              disabled={isFullyPaid}
              onClick={() => handleSelectMode('statement')}
              className={cn(
                "w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all relative cursor-pointer",
                isFullyPaid
                  ? "bg-neutral-50/50 border-neutral-100 opacity-60 cursor-not-allowed"
                  : payMode === 'statement'
                  ? "bg-emerald-50/40 border-emerald-500 shadow-sm"
                  : "bg-white border-neutral-200 hover:border-neutral-300"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                  payMode === 'statement' ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300"
                )}>
                  {payMode === 'statement' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-800">Pay All Due (Statement)</p>
                  <p className="text-[10px] text-neutral-400 font-medium">
                    {isFullyPaid ? "Fully paid for this cycle!" : "Pay statement balance on card"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {isFullyPaid ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-emerald-100">
                    <Sparkles size={10} /> Fully Paid
                  </span>
                ) : (
                  <p className={cn("text-sm font-extrabold", payMode === 'statement' ? "text-emerald-600" : "text-neutral-700")}>
                    {formatCurrency(statementDue)}
                  </p>
                )}
              </div>
            </button>

            {/* Total Outstanding Option */}
            <button
              type="button"
              onClick={() => handleSelectMode('total')}
              className={cn(
                "w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer",
                payMode === 'total'
                  ? "bg-blue-50/40 border-blue-500 shadow-sm"
                  : "bg-white border-neutral-200 hover:border-neutral-300"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                  payMode === 'total' ? "border-blue-500 bg-blue-500 text-white" : "border-neutral-300"
                )}>
                  {payMode === 'total' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-800">Total Outstanding</p>
                  <p className="text-[10px] text-neutral-400 font-medium">Includes unbilled cycle amounts</p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn("text-sm font-extrabold", payMode === 'total' ? "text-blue-600" : "text-neutral-700")}>
                  {formatCurrency(totalOutstanding)}
                </p>
              </div>
            </button>

            {/* Pay Partial / Custom Option */}
            <button
              type="button"
              onClick={() => handleSelectMode('partial')}
              className={cn(
                "w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer",
                payMode === 'partial'
                  ? "bg-amber-50/40 border-amber-500 shadow-sm"
                  : "bg-white border-neutral-200 hover:border-neutral-300"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                  payMode === 'partial' ? "border-amber-500 bg-amber-500 text-white" : "border-neutral-300"
                )}>
                  {payMode === 'partial' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-800">Pay Partial / Custom</p>
                  <p className="text-[10px] text-neutral-400 font-medium">Pay any custom amount of choice</p>
                </div>
              </div>
              <div className="text-right flex items-center">
                <span className={cn("text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-lg border block", 
                  payMode === 'partial' ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-neutral-50 border-neutral-200 text-neutral-500"
                )}>
                  Partial
                </span>
              </div>
            </button>
          </div>

          {/* Amount Box */}
          <div className="bg-neutral-50/80 p-4 rounded-2xl border border-neutral-100 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">Payment Amount</span>
              {payMode === 'partial' && (
                <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                  Dynamic Partial Active
                </span>
              )}
            </div>
            
            <div className="relative">
              <input 
                type="number" 
                step="0.01"
                value={amount} 
                onChange={e => handleAmountChange(e.target.value)}
                className="glass-input w-full text-xl font-extrabold pr-10 focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 font-extrabold text-base">
                ₹
              </div>
            </div>

            {/* Quick incremental buttons for "Pay More / Custom adjustments" */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
              <span className="text-[9px] font-bold text-neutral-400 uppercase mr-1 whitespace-nowrap">Pay More:</span>
              {[100, 500, 1000, 5000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => adjustAmount(val)}
                  className="px-2.5 py-1 text-[10px] bg-white border border-neutral-200 hover:bg-neutral-50 active:scale-95 text-neutral-600 rounded-lg font-bold shadow-xs cursor-pointer whitespace-nowrap transition-all"
                >
                  + {formatCurrency(val)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={() => {
            const parsed = parseFloat(amount);
            if (!isNaN(parsed) && parsed > 0) {
              onSave(cc.id, fromId, parsed, date);
              onClose();
            }
          }}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 cursor-pointer"
        >
          Confirm Payment
        </button>
      </motion.div>
    </motion.div>
  );
}
