import React, { useState, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { Transaction, TransactionType } from '../types';
import { formatCurrency } from '../services/storage';
import { format } from 'date-fns';
import { Trash2, Calendar, DollarSign } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { motion, useAnimation, PanInfo } from 'framer-motion';

interface TransactionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  transactions: Transaction[];
  onEdit?: (t: Transaction) => void;
  onDelete?: (id: string) => void;
}

const TransactionListItem = ({ 
  t, 
  onEdit, 
  onDelete 
}: { 
  t: Transaction; 
  onEdit?: (t: Transaction) => void; 
  onDelete?: (id: string) => void; 
}) => {
  const controls = useAnimation();
  const [isOpen, setIsOpen] = useState(false);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!onDelete) return;
    
    if (info.offset.x < -60) {
      controls.start({ x: -80 });
      setIsOpen(true);
    } else {
      controls.start({ x: 0 });
      setIsOpen(false);
    }
  };

  const handleClick = () => {
      if (isOpen) {
          controls.start({ x: 0 });
          setIsOpen(false);
      } else if (onEdit) {
          onEdit(t);
      }
  };

  // Determine Icon Colors
  let iconBg = 'bg-slate-100';
  let iconColor = 'text-slate-500';

  if (t.type === TransactionType.INCOME) {
      iconBg = 'bg-emerald-100';
      iconColor = 'text-emerald-600';
  } else if (t.type === TransactionType.CARD_EXPENSE) {
      iconBg = 'bg-indigo-100';
      iconColor = 'text-indigo-600';
  } else {
      iconBg = 'bg-rose-100';
      iconColor = 'text-rose-600';
  }

  return (
    <div className="relative mb-3">
      {/* Background Actions (Delete) */}
      {onDelete && (
        <div className="absolute inset-y-0 right-0 w-20 bg-red-500 rounded-xl flex items-center justify-center z-0">
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(t.id);
                }} 
                className="w-full h-full flex items-center justify-center text-white"
            >
                <Trash2 size={20} />
            </button>
        </div>
      )}

      {/* Foreground Card */}
      <motion.div
        drag={onDelete ? "x" : false}
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="relative bg-white rounded-xl p-3 flex items-center justify-between shadow-sm border border-slate-100 z-10 cursor-pointer active:scale-[0.99] transition-transform"
        onClick={handleClick}
        style={{ touchAction: 'pan-y' }}
      >
          {/* Left: Icon & Description */}
          <div className="flex items-center gap-3 flex-1 min-w-0 pointer-events-none">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
                <CategoryIcon category={t.category} size={20} />
              </div>
              
              <div className="min-w-0 flex flex-col gap-0.5">
                <p className="font-bold text-slate-800 text-sm truncate">
                    {t.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{format(new Date(t.date), 'dd/MM')}</span>
                  <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide truncate max-w-[100px]">
                    {t.category}
                  </span>
                  {t.installments && (
                    <span className="shrink-0">({t.installments.current}/{t.installments.total})</span>
                  )}
                </div>
              </div>
          </div>
          
          {/* Right: Amount */}
          <div className="pl-3 pointer-events-none">
            <p className={`font-bold text-sm whitespace-nowrap ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-800'}`}>
              {t.type === TransactionType.INCOME ? '+' : ''} {formatCurrency(t.amount)}
            </p>
          </div>
      </motion.div>
    </div>
  );
};

export const TransactionListModal: React.FC<TransactionListModalProps> = ({ 
  isOpen, onClose, title, transactions, onEdit, onDelete 
}) => {
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Sort transactions based on user selection
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
        const valA = sortBy === 'date' ? new Date(a.date).getTime() : a.amount;
        const valB = sortBy === 'date' ? new Date(b.date).getTime() : b.amount;

        if (sortOrder === 'asc') {
            return valA - valB;
        }
        return valB - valA;
    });
  }, [transactions, sortBy, sortOrder]);

  const handleSortChange = (field: 'date' | 'amount') => {
    if (sortBy === field) {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
        setSortBy(field);
        setSortOrder('desc');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      {/* Sort Controls */}
      <div className="flex justify-end mb-4 sticky top-0 bg-white pt-2 pb-2 z-10">
         <div className="flex bg-slate-50 p-1 rounded-xl shadow-sm border border-slate-100">
           <button 
             onClick={() => handleSortChange('date')}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${sortBy === 'date' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <Calendar size={14} /> Data {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
           </button>
           <button 
             onClick={() => handleSortChange('amount')}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${sortBy === 'amount' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <DollarSign size={14} /> Valor {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
           </button>
         </div>
      </div>

      <div className="space-y-1 pb-4">
        {sortedTransactions.length === 0 ? (
          <div className="text-center py-12">
             <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
               <Calendar size={24} />
             </div>
             <p className="text-slate-400 text-sm">Nenhuma transação encontrada.</p>
          </div>
        ) : (
          sortedTransactions.map(t => (
            <TransactionListItem 
                key={t.id} 
                t={t} 
                onEdit={onEdit} 
                onDelete={onDelete} 
            />
          ))
        )}
      </div>
    </Modal>
  );
};