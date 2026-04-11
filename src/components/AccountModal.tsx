import { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Account } from '@/src/types';

interface AccountModalProps {
  onClose: () => void;
  onSave: (account: Omit<Account, 'id'>) => void;
  initialData?: Account | null;
}

export default function AccountModal({ onClose, onSave, initialData }: AccountModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<Account['type']>(initialData?.type || 'Bank');
  const [balance, setBalance] = useState(initialData?.balance?.toString() || '');
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
              onChange={e => setType(e.target.value as any)}
              className="glass-input w-full"
            >
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
              <option value="Investment">Investment</option>
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
