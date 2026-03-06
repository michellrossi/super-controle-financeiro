import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, TransactionStatus, FilterState } from '../types';
import { formatCurrency } from '../services/storage';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUp, ArrowDown, CreditCard, Edit2, Trash2, Calendar, DollarSign, Receipt } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { motion, useAnimation, PanInfo } from 'framer-motion';

interface TransactionsProps {
  transactions: Transaction[];
  filter: FilterState;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onSortChange: (field: 'date' | 'amount') => void;
}

const TransactionItem = ({ 
  t, 
  onEdit, 
  onDelete, 
  onToggleStatus 
}: { 
  t: Transaction; 
  onEdit: (t: Transaction) => void; 
  onDelete: (id: string) => void; 
  onToggleStatus: (id: string) => void;
}) => {
  const controls = useAnimation();
  const [isOpen, setIsOpen] = useState(false);

  const getStatusInfo = (t: Transaction) => {
     const isCompleted = t.status === TransactionStatus.COMPLETED;
     const today = startOfDay(new Date());
     const txDate = startOfDay(new Date(t.date));
     const isOverdue = !isCompleted && isBefore(txDate, today);

     if (isCompleted) {
         return {
             label: t.type === TransactionType.INCOME ? 'Recebido' : 'Pago',
             style: 'bg-emerald-100 text-emerald-600 border-emerald-200'
         };
     }
     
     if (isOverdue) {
         return {
             label: 'Vencido',
             style: 'bg-rose-100 text-rose-600 border-rose-200'
         };
     }

     return {
         label: t.type === TransactionType.INCOME ? 'A Receber' : 'A Pagar',
         style: 'bg-orange-100 text-orange-600 border-orange-200'
     };
  };

  const statusInfo = getStatusInfo(t);
  const isVirtual = t.isVirtual === true;

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -60) {
      controls.start({ x: -80 });
      setIsOpen(true);
    } else {
      controls.start({ x: 0 });
      setIsOpen(false);
    }
  };

  const handleCardClick = () => {
      if (isOpen) {
          controls.start({ x: 0 });
          setIsOpen(false);
      } else {
          onEdit(t);
      }
  };

  // Determine Icon Colors
  let iconBg = 'bg-slate-100';
  let iconColor = 'text-slate-500';

  if (t.type === TransactionType.INCOME) {
      iconBg = 'bg-emerald-100';
      iconColor = 'text-emerald-600';
  } else if (isVirtual) {
      iconBg = 'bg-indigo-100';
      iconColor = 'text-indigo-600';
  } else {
      iconBg = 'bg-rose-100';
      iconColor = 'text-rose-600';
  }

  return (
    <div className="relative mb-3">
      {/* Background Actions (Delete) */}
      {!isVirtual && (
        <div className="absolute inset-y-0 right-0 w-20 bg-red-500 rounded-2xl flex items-center justify-center z-0">
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(t.id);
                }} 
                className="w-full h-full flex items-center justify-center text-white"
            >
                <Trash2 size={24} />
            </button>
        </div>
      )}

      {/* Foreground Card */}
      <motion.div
        drag={!isVirtual ? "x" : false}
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        className={`relative bg-white rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm border ${isVirtual ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-100'} z-10 cursor-pointer active:scale-[0.99] transition-transform`}
        onClick={handleCardClick}
        style={{ touchAction: 'pan-y' }} // Allow vertical scroll while dragging
      >
          {/* Left Section: Icon & Details */}
          <div className="flex items-center gap-4 w-full sm:w-auto min-w-0 pointer-events-none"> {/* pointer-events-none to prevent interfering with click */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
                {isVirtual ? <Receipt size={24} /> : <CategoryIcon category={t.category} size={24} />}
              </div>

              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="font-bold text-slate-800 text-base flex items-center gap-2 truncate">
                    <span className="truncate">{t.description}</span>
                    {isVirtual && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase shrink-0">Fatura</span>}
                </span>
                <div className="flex items-center flex-wrap gap-2 text-xs">
                  <span className="text-slate-400 shrink-0">{format(new Date(t.date), 'dd/MM/yyyy')}</span>
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-slate-500 uppercase font-semibold text-[10px] tracking-wide truncate max-w-[140px]">
                    <CategoryIcon category={t.category} size={10} className="text-slate-400" />
                    <span className="truncate">{t.category}</span>
                  </span>
                  {t.installments && (
                    <span className="text-slate-400 shrink-0">({t.installments.current}/{t.installments.total})</span>
                  )}
                </div>
              </div>
          </div>

          {/* Right Section: Amount & Actions */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 sm:gap-2 mt-2 sm:mt-0 pl-[4rem] sm:pl-0 pointer-events-none">
              <span className={`text-xl font-bold whitespace-nowrap ${
                t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-slate-700'
              }`}>
                {t.type === TransactionType.INCOME ? '+ ' : ''} {formatCurrency(t.amount)}
              </span>
              
              <div className="flex items-center gap-2 pointer-events-auto"> {/* Re-enable pointer events for buttons */}
                <button 
                  onClick={(e) => {
                      e.stopPropagation();
                      onToggleStatus(t.id);
                  }}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border ${statusInfo.style} hover:opacity-80 active:scale-95 whitespace-nowrap`}
                  title={isVirtual ? "Marcar todas as despesas desta fatura como pagas/pendentes" : "Alternar status"}
                >
                    {statusInfo.label}
                </button>
              </div>
          </div>
      </motion.div>
    </div>
  );
};

export const Transactions: React.FC<TransactionsProps> = ({ 
  transactions, filter, onEdit, onDelete, onToggleStatus, onSortChange 
}) => {
  const { sortBy, sortOrder } = filter;

  const filteredTransactions = useMemo(() => {
    return transactions.sort((a, b) => {
        let valA = sortBy === 'date' ? new Date(a.date).getTime() : a.amount;
        let valB = sortBy === 'date' ? new Date(b.date).getTime() : b.amount;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [transactions, sortBy, sortOrder]);

  return (
    <div className="space-y-4 animate-fade-in pb-12 md:pb-0">
      
      {/* Header Sort Toggle */}
      <div className="flex justify-end mb-2">
         <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
           <button 
             onClick={() => onSortChange('date')}
             className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${sortBy === 'date' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <Calendar size={14} /> Data {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
           </button>
           <button 
             onClick={() => onSortChange('amount')}
             className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${sortBy === 'amount' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <DollarSign size={14} /> Valor {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
           </button>
         </div>
      </div>

      <div className="flex flex-col gap-1">
        {filteredTransactions.length === 0 ? (
           <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
               <Calendar size={32} />
             </div>
             <p className="text-slate-500 font-medium">Nenhuma transação neste período.</p>
           </div>
        ) : filteredTransactions.map((t) => (
            <TransactionItem 
                key={t.id} 
                t={t} 
                onEdit={onEdit} 
                onDelete={onDelete} 
                onToggleStatus={onToggleStatus} 
            />
        ))}
      </div>
    </div>
  );
};
