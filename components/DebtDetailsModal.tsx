import React, { useState, useMemo } from 'react';
import { Debt, DebtInstallment, TransactionStatus } from '../types';
import { formatCurrency } from '../services/storage';
import { X, CheckCircle2, Clock, AlertCircle, Calculator, Trash2, Edit2, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '../utils/date';

interface DebtDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
  onUpdateInstallment: (debtId: string, installmentId: string, status: TransactionStatus, amount?: number) => void;
  onPayoffDebt: (debtId: string, discountPercentage: number) => void;
  onEditDebt: (debt: Debt) => void;
  onDeleteDebt: (id: string) => void;
}

export const DebtDetailsModal: React.FC<DebtDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  debt, 
  onUpdateInstallment,
  onPayoffDebt,
  onEditDebt,
  onDeleteDebt
}) => {
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulationDiscount, setSimulationDiscount] = useState(100); // Default to 100% discount on interest for early payoff
  const [anticipateInstallment, setAnticipateInstallment] = useState<DebtInstallment | null>(null);
  const [anticipateAmount, setAnticipateAmount] = useState<string>('');

  const stats = useMemo(() => {
    if (!debt) return null;
    const paid = debt.installments.filter(i => i.status === TransactionStatus.COMPLETED);
    const unpaid = debt.installments.filter(i => i.status !== TransactionStatus.COMPLETED);
    const totalPaid = paid.reduce((acc, i) => acc + i.amount, 0);
    const totalOutstanding = unpaid.reduce((acc, i) => acc + i.amount, 0);
    const totalInterestPaid = paid.reduce((acc, i) => acc + i.interest, 0);
    const progress = Math.round((paid.length / debt.installments.length) * 100) || 0;

    return { paidCount: paid.length, totalCount: debt.installments.length, totalPaid, totalOutstanding, totalInterestPaid, progress };
  }, [debt]);

  const simulation = useMemo(() => {
    if (!debt || !showSimulator) return null;
    const unpaid = debt.installments.filter(i => i.status !== TransactionStatus.COMPLETED);
    const totalPrincipal = unpaid.reduce((acc, i) => acc + i.principal, 0);
    const totalInterest = unpaid.reduce((acc, i) => acc + i.interest, 0);
    const discountedInterest = totalInterest * (1 - simulationDiscount / 100);
    const finalAmount = totalPrincipal + discountedInterest;

    return { totalPrincipal, totalInterest, discountedInterest, finalAmount, savings: totalInterest - discountedInterest };
  }, [debt, showSimulator, simulationDiscount]);

  if (!isOpen || !debt) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm border border-slate-100">
              {getDebtIcon(debt.type)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{debt.name}</h2>
              <p className="text-xs text-slate-400">{debt.creditor}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onEditDebt(debt)}
              className="p-2 hover:bg-emerald-50 rounded-full text-slate-400 hover:text-emerald-600 transition-colors"
            >
              <Edit2 size={18} />
            </button>
            <button 
              onClick={() => { if(window.confirm('Excluir esta dívida?')) onDeleteDebt(debt.id); onClose(); }}
              className="p-2 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={18} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Progress & Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Valor Original</p>
              <p className="text-sm font-bold text-slate-800">{formatCurrency(debt.totalOriginalAmount)}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Saldo Devedor</p>
              <p className="text-sm font-bold text-red-500">{formatCurrency(stats?.totalOutstanding || 0)}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Total Pago</p>
              <p className="text-sm font-bold text-emerald-500">{formatCurrency(stats?.totalPaid || 0)}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Juros Pago</p>
              <p className="text-sm font-bold text-amber-500">{formatCurrency(stats?.totalInterestPaid || 0)}</p>
            </div>
          </div>

          {/* Metadata Info */}
          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Taxa</p>
              <p className="text-xs font-bold text-slate-700">{debt.interestRate}% {debt.frequency === 'Mensal' ? 'a.m.' : 'a.a.'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Sistema</p>
              <p className="text-xs font-bold text-slate-700">{debt.interestSystem?.split(' ')[0] || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Parcelas</p>
              <p className="text-xs font-bold text-slate-700">{debt.installmentsCount}x</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Tipo</p>
              <p className="text-xs font-bold text-slate-700">{debt.type}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400 uppercase tracking-wider">Progresso da Quitação</span>
              <span className="text-emerald-600">{stats?.progress}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats?.progress}%` }}
                className="h-full bg-emerald-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button 
              onClick={() => setShowSimulator(!showSimulator)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                showSimulator ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              <Calculator size={18} />
              Simulador de Quitação
            </button>
          </div>

          {/* Simulator Panel */}
          <AnimatePresence>
            {showSimulator && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-indigo-900">Simulação de Quitação Antecipada</h3>
                    <TrendingDown className="text-indigo-400" size={20} />
                  </div>
                  <p className="text-xs text-indigo-700">
                    Ao quitar antecipadamente, você pode economizar nos juros. Ajuste o desconto esperado sobre os juros futuros:
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-indigo-900">
                      <span>Desconto nos Juros</span>
                      <span>{simulationDiscount}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={simulationDiscount}
                      onChange={e => setSimulationDiscount(parseInt(e.target.value))}
                      className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-white p-3 rounded-xl border border-indigo-100">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Principal</p>
                      <p className="text-sm font-bold text-slate-800">{formatCurrency(simulation?.totalPrincipal || 0)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-indigo-100">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Juros com Desconto</p>
                      <p className="text-sm font-bold text-slate-800">{formatCurrency(simulation?.discountedInterest || 0)}</p>
                    </div>
                  </div>

                  <div className="bg-indigo-600 p-4 rounded-2xl text-white flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">Valor para Quitar Hoje</p>
                      <p className="text-xl font-bold">{formatCurrency(simulation?.finalAmount || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">Economia</p>
                      <p className="text-lg font-bold text-emerald-300">-{formatCurrency(simulation?.savings || 0)}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => onPayoffDebt(debt.id, simulationDiscount)}
                    className="w-full bg-white text-indigo-600 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    Confirmar Quitação de Todas as Parcelas
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Installments List */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Clock size={18} className="text-slate-400" />
              Cronograma de Parcelas
            </h3>
            <div className="space-y-2">
              {debt.installments.map((inst) => (
                <InstallmentItem 
                  key={inst.id} 
                  inst={inst} 
                  onToggle={() => onUpdateInstallment(debt.id, inst.id, inst.status === TransactionStatus.COMPLETED ? TransactionStatus.PENDING : TransactionStatus.COMPLETED)}
                  onEarlyPay={() => {
                    setAnticipateInstallment(inst);
                    setAnticipateAmount(inst.principal.toString());
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Anticipate Dialog */}
        <AnimatePresence>
          {anticipateInstallment && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">Antecipar Parcela {anticipateInstallment.number}</h3>
                  <button onClick={() => setAnticipateInstallment(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Valor Realmente Pago</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      autoFocus
                      value={anticipateAmount}
                      onChange={e => setAnticipateAmount(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Valor original: {formatCurrency(anticipateInstallment.amount)} (Principal: {formatCurrency(anticipateInstallment.principal)})
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setAnticipateInstallment(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      const amount = parseFloat(anticipateAmount);
                      if (!isNaN(amount)) {
                        onUpdateInstallment(debt.id, anticipateInstallment.id, TransactionStatus.COMPLETED, amount);
                        setAnticipateInstallment(null);
                      }
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    Confirmar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const InstallmentItem: React.FC<{ inst: DebtInstallment, onToggle: () => void, onEarlyPay: () => void }> = ({ inst, onToggle, onEarlyPay }) => {
  const isPaid = inst.status === TransactionStatus.COMPLETED;
  const isOverdue = !isPaid && isBefore(startOfDay(parseLocalDate(inst.dueDate)), startOfDay(new Date()));

  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
      isPaid ? 'bg-emerald-50/30 border-emerald-100' : isOverdue ? 'bg-red-50/30 border-red-100' : 'bg-white border-slate-100'
    }`}>
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
          isPaid ? 'bg-emerald-100 text-emerald-600' : isOverdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
        }`}>
          {inst.number}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800">{formatCurrency(inst.amount)}</p>
            <span className="text-[10px] text-slate-400 font-medium">({formatCurrency(inst.principal)} + {formatCurrency(inst.interest)})</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-slate-400">{format(parseLocalDate(inst.dueDate), 'dd/MM/yyyy')}</p>
            {isOverdue && <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Atrasada</span>}
            {isPaid && <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Paga</span>}
            {isPaid && inst.interest === 0 && <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider ml-1">Antecipada (S/ Juros)</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isPaid && (
          <button 
            onClick={onEarlyPay}
            className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-100 transition-all flex items-center gap-1"
            title="Pagar sem juros"
          >
            <TrendingDown size={12} />
            Antecipar
          </button>
        )}
        <button 
          onClick={onToggle}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            isPaid ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 size={20} />
        </button>
      </div>
    </div>
  );
};

const getDebtIcon = (type: string) => {
  switch (type) {
    case 'Empréstimo Pessoal': return '💰';
    case 'Financiamento': return '🏠';
    case 'Consórcio': return '🤝';
    case 'Cartão Parcelado': return '💳';
    case 'Dívida Informal': return '☝️';
    default: return '📄';
  }
};
