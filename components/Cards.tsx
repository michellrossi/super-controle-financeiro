import React from 'react';
import { CreditCard, Transaction, TransactionType, TransactionStatus } from '../types';
import { formatCurrency, getInvoiceMonth, getRemainingDebtForMonth } from '../services/storage';
import { parseLocalDate } from '../utils/date';
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
          // 1. Total da Fatura do Mês Selecionado (Exibição principal)
          const invoiceTotal = transactions
            .filter(t => 
              t.type === TransactionType.CARD_EXPENSE && 
              t.cardId === card.id &&
              isSameMonth(getInvoiceMonth(parseLocalDate(t.date), card.closingDay), targetDate)
            )
            .reduce((acc, t) => acc + t.amount, 0);

          // 2. Saldo Devedor Dinâmico: 
          // Considera todas as parcelas que vencem no mês selecionado ou no futuro.
          // À medida que o usuário avança os meses, parcelas passadas deixam de ser contadas,
          // simulando o "restabelecimento" do limite.
          const currentRemainingDebt = getRemainingDebtForMonth(transactions, card, targetDate);

          const progress = Math.min((currentRemainingDebt / card.limit) * 100, 100);
          const availableLimit = card.limit - currentRemainingDebt;

          const bgColor = card.color; 

          return (
            <div 
              key={card.id} 
              onClick={() => onCardClick(card.id)}
              className={`group relative overflow-hidden rounded-2xl shadow-lg transition-transform hover:-translate-y-1 cursor-pointer ${bgColor} text-white`}
            >
              <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

              <div className="relative p-6 h-full flex flex-col justify-between min-h-[200px]">
                
                <div className="flex justify-between items-start">
                  <div>
                      <h3 className="font-bold text-xl tracking-wide">{card.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Fech. {card.closingDay}</span>
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Venc. {card.dueDay}</span>
                      </div>
                  </div>
                  
                  <div className="flex items-center bg-black/20 rounded-lg p-1 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
                      <button onClick={() => onAddTransaction(card.id)} className="p-1.5 hover:bg-white/20 rounded-md transition-colors" title="Adicionar"><Plus size={16} /></button>
                      <button onClick={() => onEditCard(card)} className="p-1.5 hover:bg-white/20 rounded-md transition-colors" title="Editar"><Edit2 size={16} /></button>
                      <button onClick={() => onDeleteCard(card.id)} className="p-1.5 hover:bg-white/20 hover:text-red-300 rounded-md transition-colors" title="Excluir"><Trash2 size={16} /></button>
                  </div>
                </div>

                <div className="space-y-4 mt-8">
                  <div className="flex justify-between items-end">
                      <div>
                          <p className="text-xs text-white/80 uppercase tracking-wider font-semibold mb-1">Fatura Atual</p>
                          <p className="text-3xl font-bold">{formatCurrency(invoiceTotal)}</p>
                      </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${progress > 90 ? 'bg-red-300' : 'bg-emerald-300'}`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-medium text-white/90 uppercase tracking-wide">
                        <span>Disp: {formatCurrency(availableLimit)}</span>
                        <span>Lim: {formatCurrency(card.limit)}</span>
                    </div>
                  </div>
                </div>
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