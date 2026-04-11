import { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import * as dateFns from 'date-fns';
import { cn } from '@/src/lib/utils';
import { Account, Transaction } from '@/src/types';

interface TransactionModalProps {
  accounts: Account[];
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>) => void;
  categories: string[];
  initialData?: Transaction | null;
}

export default function TransactionModal({ accounts, onClose, onSave, categories, initialData }: TransactionModalProps) {
  const [type, setType] = useState<Transaction['type']>(initialData?.type || 'Expense');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || 'Miscellaneous');
  const [accountId, setAccountId] = useState(initialData?.accountId || accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(initialData?.toAccountId || accounts[1]?.id || '');
  const [date, setDate] = useState(initialData ? dateFns.format(dateFns.parseISO(initialData.date), 'yyyy-MM-dd') : dateFns.format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [recurringFrequency, setRecurringFrequency] = useState<Transaction['recurringFrequency']>(initialData?.recurringFrequency || 'Monthly');

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
