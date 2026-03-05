import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, TransactionStatus, INCOME_CATEGORIES, EXPENSE_CATEGORIES, CreditCard } from '../types';
import { DollarSign, Type, Layers } from 'lucide-react';
import { Modal } from './ui/Modal';
import { CategoryIcon } from './CategoryIcon';
import { parseLocalDate, toDateString } from '../utils/date';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (t: Transaction, installments: number, amountType: 'total' | 'installment') => void;
  initialData?: Transaction | null;
  cards: CreditCard[];
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ isOpen, onClose, onSubmit, initialData, cards }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [category, setCategory] = useState('');
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState(1);
  const [amountType, setAmountType] = useState<'total' | 'installment'>('installment');
  const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.COMPLETED);

  const isEditing = !!(initialData && initialData.id);

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description);
      
      if (!initialData.id && initialData.amount === 0) {
        setAmount('');
      } else {
        setAmount(initialData.amount.toString());
      }

      setDate(initialData.date.split('T')[0]);
      setType(initialData.type);
      setCategory(initialData.category);
      setCardId(initialData.cardId || (cards.length > 0 ? cards[0].id : ''));
      setStatus(initialData.status);
      setInstallments(1);
      setAmountType('installment');
    } else {
      resetForm();
    }
  }, [initialData, isOpen, cards]);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setType(TransactionType.EXPENSE);
    setCategory(EXPENSE_CATEGORIES[0]);
    setCardId(cards.length > 0 ? cards[0].id : '');
    setStatus(type === TransactionType.CARD_EXPENSE ? TransactionStatus.PENDING : TransactionStatus.COMPLETED);
    setInstallments(1);
    setAmountType('installment');
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === TransactionType.INCOME) {
      setCategory(INCOME_CATEGORIES[0]);
    } else {
      setCategory(EXPENSE_CATEGORIES[0]);
    }
    
    if (newType === TransactionType.CARD_EXPENSE) {
      if (!cardId && cards.length > 0) {
        setCardId(cards[0].id);
      }
      setStatus(TransactionStatus.PENDING);
    } else {
      setStatus(TransactionStatus.COMPLETED);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !category) return;

    if (type === TransactionType.CARD_EXPENSE && !cardId) {
      alert("Por favor, selecione um cartão.");
      return;
    }

    const dateObj = parseLocalDate(date);

    const newTransaction: Transaction = {
      id: initialData?.id || Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      description,
      amount: parseFloat(amount),
      date: toDateString(dateObj), 
      type,
      category,
      status,
    };

    if (type === TransactionType.CARD_EXPENSE) {
      newTransaction.cardId = cardId;
    }

    onSubmit(newTransaction, installments, amountType);
    onClose();
  };

  const categories = type === TransactionType.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Transação' : 'Nova Transação'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="flex p-1 bg-slate-100 rounded-xl">
          {[
            { id: TransactionType.INCOME, label: 'Receita', color: 'bg-emerald-500 text-white' },
            { id: TransactionType.EXPENSE, label: 'Despesa', color: 'bg-rose-500 text-white' },
            { id: TransactionType.CARD_EXPENSE, label: 'Cartão', color: 'bg-indigo-500 text-white' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTypeChange(t.id as TransactionType)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                type === t.id ? `${t.color} shadow-md` : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Descrição</label>
          <div className="relative">
            <Type className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              placeholder="Ex: Supermercado"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Valor</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Data</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Categoria</label>
            <div className="relative">
              <div className="absolute left-3 top-2.5 text-slate-500 pointer-events-none">
                <CategoryIcon category={category} size={18} />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {type === TransactionType.CARD_EXPENSE && (
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Cartão</label>
              <select
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              >
                <option value="" disabled>Selecione</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Parcelas</label>
                <div className="relative">
                  <Layers className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={installments}
                    onChange={(e) => setInstallments(parseInt(e.target.value) || 1)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              
              {installments > 1 && (
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Valor refere-se a</label>
                  <select
                    value={amountType}
                    onChange={(e) => setAmountType(e.target.value as 'total' | 'installment')}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  >
                    <option value="installment">Valor da Parcela</option>
                    <option value="total">Valor Total</option>
                  </select>
                </div>
              )}
            </div>
            {installments > 1 && (
              <div className="text-xs text-slate-500 bg-blue-50 text-blue-600 p-2 rounded-lg">
                {amountType === 'total' 
                  ? `Serão criadas ${installments} parcelas de ${((parseFloat(amount) || 0) / installments).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}` 
                  : `Total final será ${((parseFloat(amount) || 0) * installments).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`
                }
              </div>
            )}
          </div>
        )}
          
        {type !== TransactionType.CARD_EXPENSE && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
            <button
              type="button"
              onClick={() => setStatus(status === TransactionStatus.COMPLETED ? TransactionStatus.PENDING : TransactionStatus.COMPLETED)}
              className={`w-full py-2.5 rounded-xl text-sm font-medium border transition-all ${
                status === TransactionStatus.COMPLETED 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-orange-50 text-orange-700 border-orange-200'
              }`}
            >
              {status === TransactionStatus.COMPLETED ? 'Concluído' : 'Pendente'}
            </button>
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-200 transition-all transform active:scale-95"
          >
            Salvar Transação
          </button>
        </div>
      </form>
    </Modal>
  );
};