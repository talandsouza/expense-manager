import { motion } from 'motion/react';
import { AlertTriangle, X, Trash2, RefreshCcw, Bomb } from 'lucide-react';

interface ResetModalProps {
  onClose: () => void;
  onReset: (type: 'transactions' | 'balances' | 'nuclear') => void;
}

export default function ResetModal({ onClose, onReset }: ResetModalProps) {
  const options = [
    {
      id: 'transactions',
      title: 'Clear Transactions',
      description: 'Delete all transaction history. Account balances will remain as they are.',
      icon: <RefreshCcw size={20} />,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      id: 'balances',
      title: 'Reset Balances',
      description: 'Set all account balances to zero. Transaction history will be preserved.',
      icon: <Trash2 size={20} />,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    {
      id: 'nuclear',
      title: 'Nuclear Reset',
      description: 'Delete EVERYTHING. All accounts and all transactions will be permanently removed.',
      icon: <Bomb size={20} />,
      color: 'text-red-600',
      bg: 'bg-red-50'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-card w-full max-w-md p-6 space-y-6"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100 text-red-600">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-xl font-bold">Reset All Data</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <p className="text-neutral-500 text-sm">
          Choose how you want to reset your data. This action is permanent and cannot be undone.
        </p>

        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onReset(opt.id as any)}
              className="w-full flex items-start gap-4 p-4 rounded-2xl border border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50 transition-all text-left group"
            >
              <div className={`p-3 rounded-xl ${opt.bg} ${opt.color} group-hover:scale-110 transition-transform`}>
                {opt.icon}
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-neutral-900">{opt.title}</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="w-full glass-button py-4 font-bold"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
