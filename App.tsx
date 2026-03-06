import React, { useState, useEffect } from 'react';
import { Transaction, CreditCard, TransactionType, TransactionStatus } from './types';
import { loadTransactions, saveTransactions, loadCards, saveCards } from './services/storage';
import { CardsView } from './components/Cards';
import { TransactionForm } from './components/TransactionForm';
import { format, addMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Trash2, Edit2, CreditCard as CardIcon, DollarSign, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [filterDate, setFilterDate] = useState(new Date());
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  useEffect(() => {
    setTransactions(loadTransactions());
    setCards(loadCards());
  }, []);

  const handleAddTransaction = (t: Transaction, installments: number, amountType: 'total' | 'installment') => {
    let newTransactions: Transaction[] = [];
    
    if (installments > 1) {
      const groupId = crypto.randomUUID();
      const baseAmount = amountType === 'total' ? t.amount / installments : t.amount;
      const baseDate = new Date(t.date + 'T12:00:00');

      for (let i = 0; i < installments; i++) {
        const installmentDate = addMonths(baseDate, i);
        newTransactions.push({
          ...t,
          id: crypto.randomUUID(),
          amount: baseAmount,
          date: installmentDate.toISOString().split('T')[0],
          groupId,
          installmentNumber: i + 1,
          totalInstallments: installments,
          description: `${t.description} (${i + 1}/${installments})`
        });
      }
    } else {
      newTransactions = [t];
    }

    const updated = [...transactions, ...newTransactions];
    setTransactions(updated);
    saveTransactions(updated);
  };

  const handleDeleteTransaction = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    let updated: Transaction[] = transactions;

    if (transaction.groupId) {
      const deleteAll = window.confirm('Esta transação faz parte de um parcelamento. Deseja excluir TODAS as parcelas vinculadas?');
      if (deleteAll) {
        updated = transactions.filter(t => t.groupId !== transaction.groupId);
      } else {
        const deleteOnlyThis = window.confirm('Deseja excluir APENAS esta parcela selecionada?');
        if (deleteOnlyThis) {
          updated = transactions.filter(t => t.id !== id);
        } else {
          return; // Cancelou tudo
        }
      }
    } else {
      if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
        updated = transactions.filter(t => t.id !== id);
      } else {
        return;
      }
    }

    setTransactions(updated);
    saveTransactions(updated);
  };

  const handleUpdateTransactionStatus = (id: string) => {
    const updated = transactions.map(t => 
      t.id === id ? { ...t, status: t.status === TransactionStatus.COMPLETED ? TransactionStatus.PENDING : TransactionStatus.COMPLETED } : t
    );
    setTransactions(updated);
    saveTransactions(updated);
  };

  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.date + 'T12:00:00');
    return isSameMonth(tDate, filterDate);
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === TransactionType.EXPENSE || t.type === TransactionType.CARD_EXPENSE)
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-bottom border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <DollarSign size={20} />
            </div>
            <h1 className="font-bold text-xl text-slate-800">Finanças 2026</h1>
          </div>

          <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setFilterDate(addMonths(filterDate, -1))} className="p-1.5 hover:bg-white rounded-lg transition-all"><ChevronLeft size={20} /></button>
            <span className="text-sm font-bold min-w-[120px] text-center capitalize">
              {format(filterDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button onClick={() => setFilterDate(addMonths(filterDate, 1))} className="p-1.5 hover:bg-white rounded-lg transition-all"><ChevronRight size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ArrowUpCircle size={24} /></div>
              <span className="text-sm font-semibold text-slate-500">Receitas</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{totalIncome.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><ArrowDownCircle size={24} /></div>
              <span className="text-sm font-semibold text-slate-500">Despesas</span>
            </div>
            <p className="text-2xl font-bold text-rose-600">{totalExpense.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={24} /></div>
              <span className="text-sm font-semibold text-slate-500">Saldo</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{(totalIncome - totalExpense).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
          </div>
        </div>

        {/* Cartões */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CardIcon size={20} className="text-slate-400" /> Meus Cartões
            </h2>
          </div>
          <CardsView 
            cards={cards}
            transactions={transactions}
            filterMonth={filterDate.getMonth()}
            filterYear={filterDate.getFullYear()}
            onCardClick={(id) => setSelectedCardId(id)}
            onAddTransaction={(id) => { setSelectedCardId(id); setIsTransactionModalOpen(true); }}
            onEditCard={() => {}}
            onDeleteCard={() => {}}
            onAddNewCard={() => {}}
          />
        </section>

        {/* Transações Recentes */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Transações do Mês</h2>
            <button 
              onClick={() => { setEditingTransaction(null); setIsTransactionModalOpen(true); }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all"
            >
              <Plus size={18} /> Nova Transação
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">Nenhuma transação este mês.</div>
            ) : (
              filteredTransactions.map(t => (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      t.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 
                      t.type === TransactionType.CARD_EXPENSE ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {t.type === TransactionType.INCOME ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{t.description}</p>
                      <p className="text-xs text-slate-400 font-medium">{t.category} • {format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={`font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {t.type === TransactionType.INCOME ? '+' : '-'} {t.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                      </p>
                      <button 
                        onClick={() => handleUpdateTransactionStatus(t.id)}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          t.status === TransactionStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {t.status === TransactionStatus.COMPLETED ? 'Pago' : 'Pendente'}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleDeleteTransaction(t.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-all"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <TransactionForm 
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSubmit={handleAddTransaction}
        initialData={editingTransaction}
        cards={cards}
      />
    </div>
  );
};

export default App;
