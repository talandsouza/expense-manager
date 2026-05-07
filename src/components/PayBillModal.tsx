import { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Account } from '@/src/types';
import { formatCurrency } from '@/src/lib/utils';
import * as dateFns from 'date-fns';

interface PayBillModalProps {
  cc: Account;
  accounts: Account[];
  onClose: () => void;
  onSave: (ccId: string, fromId: string, amount: number, date: string) => void;
  defaultAmount?: number;
}

export default function PayBillModal({ cc, accounts, onClose, onSave, defaultAmount }: PayBillModalProps) {
  const [fromId, setFromId] = useState(accounts[0]?.id || '');
  const [amount, setAmount] = useState((defaultAmount ?? Math.abs(cc.balance)).toFixed(2));
  const [date, setDate] = useState(dateFns.format(new Date(), 'yyyy-MM-dd'));

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="glass-input w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1">Payment Amount</label>
              <input 
                type="number" 
                value={amount} 
                onChange={e => setAmount(e.target.value)}
                className="glass-input w-full text-lg font-bold"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setAmount(Math.abs(cc.balance).toFixed(2))}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                Math.abs(parseFloat(amount) - Math.abs(cc.balance)) < 0.01
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300'
              }`}
            >
              Pay Full ({formatCurrency(Math.abs(cc.balance))})
            </button>
            <button 
              onClick={() => {}}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                Math.abs(parseFloat(amount) - Math.abs(cc.balance)) >= 0.01
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        <button 
          onClick={() => {
            onSave(cc.id, fromId, parseFloat(amount), date);
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
