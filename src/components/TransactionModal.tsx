import { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import * as dateFns from 'date-fns';
import { cn } from '@/src/lib/utils';
import { Account, Transaction } from '@/src/types';

interface TransactionModalProps {
  accounts: Account[];
  onClose: () => void;
  onSave: (transactions: Omit<Transaction, 'id'>[]) => void;
  categories: string[];
  initialData?: Transaction | null;
}

export default function TransactionModal({ accounts, onClose, onSave, categories, initialData }: TransactionModalProps) {
  const [type, setType] = useState<Transaction['type']>(initialData?.type || 'Expense');
  const [amount, setAmount] = useState(initialData?.totalAmount?.toString() || initialData?.amount?.toString() || '');
  const [description, setDescription] = useState(initialData?.description.replace(/ \(My Share\)$| \(Lent\)$| \(Lent to .*\)$/, '') || '');
  const [category, setCategory] = useState(initialData?.category || 'Miscellaneous');
  const [accountId, setAccountId] = useState(initialData?.accountId || accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(initialData?.toAccountId || accounts[1]?.id || '');
  const [date, setDate] = useState(initialData ? dateFns.format(dateFns.parseISO(initialData.date), 'yyyy-MM-dd') : dateFns.format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [recurringFrequency, setRecurringFrequency] = useState<Transaction['recurringFrequency']>(initialData?.recurringFrequency || 'Monthly');

  // Split Logic State
  const [isSplit, setIsSplit] = useState(!!initialData?.groupId);
  const [splitType, setSplitType] = useState<'Percentage' | 'Equal'>(initialData?.splitType || 'Percentage');
  const [mySharePercent, setMySharePercent] = useState(initialData?.mySharePercent?.toString() || '50');
  const [numPeople, setNumPeople] = useState(initialData?.numPeople?.toString() || '2');
  const [debtorNames, setDebtorNames] = useState(initialData?.debtorNames || '');

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
        className="glass-card w-full max-w-md p-6 space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar"
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
              onClick={() => {
                setType(t);
                if (t !== 'Expense') setIsSplit(false);
              }}
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
              step="0.01"
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
            <div className="space-y-4">
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

              {/* Split Toggle */}
              <div className="space-y-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-semibold text-blue-900">Split with others?</span>
                  <div className={cn(
                    "w-10 h-6 rounded-full transition-all relative",
                    isSplit ? "bg-blue-600" : "bg-neutral-200"
                  )}>
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      isSplit ? "left-5" : "left-1"
                    )} />
                  </div>
                  <input 
                    type="checkbox" 
                    checked={isSplit} 
                    onChange={e => setIsSplit(e.target.checked)}
                    className="hidden"
                  />
                </label>

                {isSplit && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 pt-2 border-t border-blue-100"
                  >
                    <div className="flex p-1 bg-blue-100/50 rounded-lg">
                      {(['Percentage', 'Equal'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setSplitType(s)}
                          className={cn(
                            "flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all",
                            splitType === s ? "bg-white shadow-sm text-blue-600" : "text-blue-400"
                          )}
                        >
                          {s === 'Percentage' ? 'By %' : 'Equal Parts'}
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
                    ) : (
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
                    )}
                    
                    <div className="bg-blue-600/10 p-2 rounded-lg">
                      <p className="text-[10px] text-blue-600 font-medium">
                        {splitType === 'Percentage' ? (
                          `You'll pay ${mySharePercent}% and lent the remaining ${100 - parseFloat(mySharePercent || '0')}%`
                        ) : (
                          `You'll pay 1/${numPeople} share and lent the rest to ${parseInt(numPeople || '2') - 1} people`
                        )}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
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
            const totalAmount = parseFloat(amount);
            const commonData = {
              accountId,
              toAccountId: type === 'Transfer' ? toAccountId : undefined,
              date: new Date(date).toISOString(),
              isRecurring,
              recurringFrequency: isRecurring ? recurringFrequency : undefined,
              type,
            };

            const results: Omit<Transaction, 'id'>[] = [];

            if (type === 'Expense' && isSplit) {
              const groupId = initialData?.groupId || Math.random().toString(36).substr(2, 9);
              let myShareAmount: number;
              if (splitType === 'Percentage') {
                myShareAmount = parseFloat(((totalAmount * parseFloat(mySharePercent || '0')) / 100).toFixed(2));
              } else {
                myShareAmount = parseFloat((totalAmount / parseInt(numPeople || '1')).toFixed(2));
              }
              const lentAmount = parseFloat((totalAmount - myShareAmount).toFixed(2));

              const splitMetadata = {
                groupId,
                splitType,
                mySharePercent: parseFloat(mySharePercent),
                numPeople: parseInt(numPeople),
                totalAmount,
                debtorNames
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
            } else {
              results.push({
                ...commonData,
                amount: totalAmount,
                description,
                category: type === 'Expense' ? category : 'General',
              });
            }
            onSave(results);
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
