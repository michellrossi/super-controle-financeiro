import React, { useMemo, useState } from 'react';
import { Debt, TransactionStatus, DebtType } from '../types';
import { formatCurrency } from '../services/storage';
import { Plus, TrendingDown, CheckCircle2, AlertCircle, Clock, ChevronRight, Calculator } from 'lucide-react';
import { motion } from 'framer-motion';
import { parseLocalDate } from '../utils/date';
import { format, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DebtsProps {
  debts: Debt[];
  onAddDebt: () => void;
  onEditDebt: (debt: Debt) => void;
  onDeleteDebt: (id: string) => void;
  onViewInstallments: (debt: Debt) => void;
}

export const DebtsView: React.FC<DebtsProps> = ({ 
  debts, 
  onAddDebt, 
  onEditDebt, 
  onDeleteDebt,
  onViewInstallments
}) => {
  const stats = useMemo(() => {
    let activeDebts = 0;
    let totalOutstanding = 0;
    let totalPaid = 0;
    let totalInterestPaid = 0;

    debts.forEach(debt => {
      const paidInstallments = debt.installments.filter(i => i.status === TransactionStatus.COMPLETED);
      const unpaidInstallments = debt.installments.filter(i => i.status !== TransactionStatus.COMPLETED);
      
      if (unpaidInstallments.length > 0) {
        activeDebts++;
      }

      totalOutstanding += unpaidInstallments.reduce((acc, i) => acc + i.principal + i.interest, 0);
      totalPaid += paidInstallments.reduce((acc, i) => acc + i.principal, 0);
      totalInterestPaid += paidInstallments.reduce((acc, i) => acc + i.interest, 0);
    });

    return { activeDebts, totalOutstanding, totalPaid, totalInterestPaid };
  }, [debts]);

  const overallProgress = useMemo(() => {
    if (debts.length === 0) return 0;
    const totalInstallments = debts.reduce((acc, d) => acc + d.installments.length, 0);
    const paidInstallments = debts.reduce((acc, d) => acc + d.installments.filter(i => i.status === TransactionStatus.COMPLETED).length, 0);
    return Math.round((paidInstallments / totalInstallments) * 100) || 0;
  }, [debts]);

  const nextInstallment = useMemo(() => {
    const allUnpaid = debts.flatMap(d => d.installments.filter(i => i.status !== TransactionStatus.COMPLETED).map(i => ({ ...i, debtName: d.name })));
    if (allUnpaid.length === 0) return null;
    return allUnpaid.sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime())[0];
  }, [debts]);

  return (
    <div className="space-y-6 pb-24">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Dívidas Ativas" value={stats.activeDebts.toString()} icon={<TrendingDown className="text-slate-400" size={18} />} />
        <StatCard title="Saldo Devedor" value={formatCurrency(stats.totalOutstanding)} icon={<TrendingDown className="text-red-400" size={18} />} valueColor="text-red-500" />
        <StatCard title="Total Pago" value={formatCurrency(stats.totalPaid)} icon={<CheckCircle2 className="text-emerald-400" size={18} />} valueColor="text-emerald-500" />
        <StatCard title="Juros Pagos" value={formatCurrency(stats.totalInterestPaid)} icon={<Calculator className="text-orange-400" size={18} />} valueColor="text-orange-500" />
      </div>

      {/* Overall Progress */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-500 text-sm font-medium">Progresso Geral</h3>
          <span className="text-slate-800 font-bold">{overallProgress}%</span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-4">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            className="h-full bg-orange-500"
          />
        </div>
        {nextInstallment && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock size={14} />
              <span>Próxima parcela: {format(parseLocalDate(nextInstallment.dueDate), 'dd/MM/yyyy')} — {formatCurrency(nextInstallment.amount)} ({nextInstallment.debtName})</span>
            </div>
          </div>
        )}
      </div>

      {/* Debt List */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Minhas Dívidas</h2>
        <button 
          onClick={onAddDebt}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
        >
          <Plus size={18} />
          Nova Dívida
        </button>
      </div>

      <div className="space-y-4">
        {debts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
            <TrendingDown className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500">Nenhuma dívida cadastrada.</p>
          </div>
        ) : (
          debts.map(debt => (
            <DebtListItem 
              key={debt.id} 
              debt={debt} 
              onClick={() => onViewInstallments(debt)}
            />
          ))
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, valueColor = "text-slate-800" }: { title: string, value: string, icon: React.ReactNode, valueColor?: string }) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
    <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
      {icon}
      <span>{title}</span>
    </div>
    <span className={`text-lg md:text-xl font-bold truncate ${valueColor}`}>{value}</span>
  </div>
);

const DebtListItem: React.FC<{ debt: Debt, onClick: () => void }> = ({ debt, onClick }) => {
  const paidCount = debt.installments.filter(i => i.status === TransactionStatus.COMPLETED).length;
  const totalCount = debt.installments.length;
  const progress = Math.round((paidCount / totalCount) * 100) || 0;
  
  const unpaidInstallments = debt.installments.filter(i => i.status !== TransactionStatus.COMPLETED);
  const outstanding = unpaidInstallments.reduce((acc, i) => acc + i.principal + i.interest, 0);
  const totalPaid = debt.installments.filter(i => i.status === TransactionStatus.COMPLETED).reduce((acc, i) => acc + i.principal, 0);
  
  const next = unpaidInstallments.sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime())[0];

  const getIcon = (type: DebtType) => {
    switch (type) {
      case DebtType.CRÉDITO_PESSOAL: return '💰';
      case DebtType.FINANCIAMENTO: return '🏠';
      case DebtType.CONSÓRCIO: return '🤝';
      case DebtType.DÍVIDAS_CARTÃO: return '💳';
      case DebtType.DÍVIDAS_INFORMAIS: return '☝️';
      default: return '📄';
    }
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-3">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl">
            {getIcon(debt.type)}
          </div>
          <div>
            <h4 className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{debt.name}</h4>
            <p className="text-xs text-slate-400">{debt.creditor || 'Credor não informado'}</p>
          </div>
        </div>
        <ChevronRight className="text-slate-300 group-hover:text-emerald-500 transition-colors" size={20} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Saldo devedor</p>
          <p className="text-sm font-bold text-red-500">{formatCurrency(outstanding)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Total pago</p>
          <p className="text-sm font-bold text-emerald-500">{formatCurrency(totalPaid)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold">
          <span className="text-slate-400 uppercase tracking-wider">Progresso</span>
          <span className="text-slate-800">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>{paidCount}/{totalCount} parcelas</span>
          {next && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              Próx: {format(parseLocalDate(next.dueDate), 'dd/MM')} — {formatCurrency(next.amount)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
