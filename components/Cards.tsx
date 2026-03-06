import React from 'react';
import { CreditCard, Transaction, TransactionType, TransactionStatus } from '../types';
import { formatCurrency, getInvoiceMonth } from '../services/storage';
import { isSameMonth } from 'date-fns';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface CardsProps {
  cards: CreditCard[];
  transactions: Transaction[];
  filterMonth: number;
  filterYear: number;
  onCardClick: (cardId: string) => void;
  onAddTransaction: (cardId: string) => void;
  onEditCard: (card: CreditCard) => void;
  onDeleteCard: (id: string) => void;
  onAddNewCard: () => void;
}

export const CardsView: React.FC<CardsProps> = ({ 
  cards, transactions, filterMonth, filterYear, 
  onCardClick, onAddTransaction, onEditCard, onDeleteCard, onAddNewCard
}) => {
  const targetDate = new Date(filterYear, filterMonth, 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {cards.map(card => {
  // 1. Total da Fatura do Mês Selecionado (apenas para exibição do valor principal)
  const invoiceTotal = transactions
    .filter(t => 
      t.type === TransactionType.CARD_EXPENSE && 
      t.cardId === card.id &&
      isSameMonth(getInvoiceMonth(new Date(t.date), card.closingDay), targetDate)
    )
    .reduce((acc, t) => acc + t.amount, 0);

  // 2. Saldo Devedor Total (Soma de TODAS as parcelas que ainda não foram pagas)
  // Isso garante que compras parceladas bloqueiem o limite total
  const totalDebt = transactions
    .filter(t => 
      t.type === TransactionType.CARD_EXPENSE && 
      t.cardId === card.id &&
      t.status !== TransactionStatus.COMPLETED // Filtra o que ainda deve ser pago
    )
    .reduce((acc, t) => acc + t.amount, 0);

  // O limite disponível agora é o Limite Total menos a Dívida Total pendente
  const availableLimit = card.limit - totalDebt;
  const progress = Math.min((totalDebt / card.limit) * 100, 100);

  return (
    <div key={card.id} ...>
      {/* ... restante do código do card ... */}
      
      {/* Na parte de exibição do limite disponível: */}
      <div className="flex justify-between text-[10px] font-medium text-white/90 uppercase tracking-wide">
          <span>Disp: {formatCurrency(availableLimit)}</span>
          <span>Lim: {formatCurrency(card.limit)}</span>
      </div>
    </div>
  );
})}

        <button onClick={onAddNewCard} className="flex flex-col items-center justify-center h-[200px] rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all bg-white">
          <Plus size={32} />
          <span className="font-medium mt-2">Adicionar Cartão</span>
        </button>
      </div>
    </div>
  );
};