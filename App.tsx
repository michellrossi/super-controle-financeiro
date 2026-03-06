import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { CardsView } from './components/Cards';
import { TransactionForm } from './components/TransactionForm';
import { TransactionListModal } from './components/TransactionListModal';
import { CardForm } from './components/CardForm';
import { StorageService, generateInstallments, getInvoiceMonth } from './services/storage';
import { User, Transaction, ViewState, FilterState, CreditCard, TransactionType, TransactionStatus, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from './types';
import { Plus, ChevronLeft, ChevronRight, Loader2, LogOut } from 'lucide-react';
import { format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isCardFormOpen, setIsCardFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listModalTitle, setListModalTitle] = useState('');
  const [listModalTransactions, setListModalTransactions] = useState<Transaction[]>([]);

  const [filter, setFilter] = useState<FilterState>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    sortBy: 'date',
    sortOrder: 'desc'
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [regName, setRegName] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = StorageService.observeAuth((u) => {
      setUser(u);
      if (u) {
        fetchData(u.id);
      } else {
        setTransactions([]);
        setCards([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async (userId: string) => {
    setLoading(true);
    try {
      const [txs, cds] = await Promise.all([
        StorageService.getTransactions(userId),
        StorageService.getCards(userId)
      ]);
      setTransactions(txs);
      setCards(cds);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const processedTransactions = useMemo(() => {
    const targetDate = new Date(filter.year, filter.month, 1);
    const standardTxs = transactions.filter(t => {
      if (t.type === TransactionType.CARD_EXPENSE) return false;
      return isSameMonth(new Date(t.date), targetDate);
    });

    const invoiceMap = new Map<string, { amount: number, card: CreditCard, items: Transaction[] }>();

    transactions.filter(t => t.type === TransactionType.CARD_EXPENSE).forEach(t => {
      const card = cards.find(c => c.id === t.cardId);
      if (card) {
        const invoiceDate = getInvoiceMonth(new Date(t.date), card.closingDay);
        if (isSameMonth(invoiceDate, targetDate)) {
          const current = invoiceMap.get(card.id) || { amount: 0, card, items: [] };
          current.amount += t.amount;
          current.items.push(t);
          invoiceMap.set(card.id, current);
        }
      }
    });

    const invoiceTxs: Transaction[] = Array.from(invoiceMap.values()).map(({ amount, card, items }) => {
       const dueDate = new Date(filter.year, filter.month, card.dueDay);
       const allCompleted = items.length > 0 && items.every(t => t.status === TransactionStatus.COMPLETED);

       return {
         id: `virtual-invoice-${card.id}-${filter.month}-${filter.year}`,
         description: `Fatura: ${card.name}`,
         amount: amount,
         date: dueDate.toISOString(),
         type: TransactionType.EXPENSE,
         category: 'Cartão de Crédito',
         status: allCompleted ? TransactionStatus.COMPLETED : TransactionStatus.PENDING,
         isVirtual: true,
         cardId: card.id
       };
    });

    return [...standardTxs, ...invoiceTxs];
  }, [transactions, cards, filter.month, filter.year]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await StorageService.loginEmail(loginEmail, loginPass);
    } catch (error: any) {
      setAuthError('Erro ao fazer login.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await StorageService.registerEmail(loginEmail, loginPass, regName);
    } catch (error: any) {
      setAuthError('Erro ao criar conta.');
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    try {
      await StorageService.loginGoogle();
    } catch (error: any) {
      setAuthError('Erro no login com Google.');
    }
  };

  const handleLogout = async () => {
    await StorageService.logout();
  };

  const handleOpenNewTransaction = () => {
      let defaultType = TransactionType.EXPENSE;
      let defaultCategory = EXPENSE_CATEGORIES[0];
      let defaultCardId = undefined;

      if (currentView === 'INCOMES') {
          defaultType = TransactionType.INCOME;
          defaultCategory = INCOME_CATEGORIES[0];
      } else if (currentView === 'CARDS') {
          defaultType = TransactionType.CARD_EXPENSE;
          defaultCategory = EXPENSE_CATEGORIES[0];
          if (cards.length > 0) defaultCardId = cards[0].id;
      }

      setEditingTransaction({
        id: '',
        description: '',
        amount: 0,
        date: new Date().toISOString(),
        type: defaultType,
        category: defaultCategory,
        status: TransactionStatus.COMPLETED,
        cardId: defaultCardId
      });
      setIsTxModalOpen(true);
  };

  const handleTransactionSubmit = async (t: Transaction, installments: number, amountType: 'total' | 'installment') => {
    if (!user) return;
    
    if (editingTransaction && editingTransaction.id) {
      if (editingTransaction.installments?.groupId) {
         const updateSeries = window.confirm("Deseja aplicar as alterações para todas as parcelas futuras?");
         if (updateSeries) {
            await StorageService.updateTransactionSeries(user.id, editingTransaction.installments.groupId, t);
         } else {
            await StorageService.updateTransaction(user.id, t);
         }
      } else {
         await StorageService.updateTransaction(user.id, t);
      }
    } else {
      const allT = generateInstallments(t, installments, amountType);
      for (const tx of allT) {
        await StorageService.addTransaction(user.id, tx);
      }
    }
    await fetchData(user.id);
    setIsTxModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    
    if (id.startsWith('virtual-invoice')) {
      alert("Edite as transações individuais na aba 'Cartões'.");
      return;
    }

    const txToDelete = transactions.find(t => t.id === id);

    if (window.confirm('Excluir esta transação?')) {
      if (txToDelete?.installments?.groupId) {
          const deleteSeries = window.confirm("Excluir todas as parcelas futuras?");
          if (deleteSeries) {
              await StorageService.deleteTransactionSeries(user.id, txToDelete.installments.groupId, txToDelete.installments.current);
          } else {
              await StorageService.deleteTransaction(user.id, id);
          }
      } else {
          await StorageService.deleteTransaction(user.id, id);
      }
      
      await fetchData(user.id);
      setIsListModalOpen(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    if (!user) return;

    if (id.startsWith('virtual-invoice')) {
      const virtualTx = processedTransactions.find(t => t.id === id);
      if (!virtualTx || !virtualTx.cardId) return;

      const newStatus = virtualTx.status === TransactionStatus.COMPLETED 
        ? TransactionStatus.PENDING 
        : TransactionStatus.COMPLETED;

      const targetDate = new Date(filter.year, filter.month, 1);
      const card = cards.find(c => c.id === virtualTx.cardId);
      if (!card) return;

      const txsToUpdate = transactions.filter(t => {
        if (t.type !== TransactionType.CARD_EXPENSE || t.cardId !== virtualTx.cardId) return false;
        const invoiceDate = getInvoiceMonth(new Date(t.date), card.closingDay);
        return isSameMonth(invoiceDate, targetDate);
      });
      
      const idsToUpdate = txsToUpdate.map(t => t.id);
      
      if (idsToUpdate.length > 0) {
        await StorageService.batchUpdateStatus(user.id, idsToUpdate, newStatus);
        fetchData(user.id);
      }
      return;
    }

    const t = transactions.find(tx => tx.id === id);
    if (t) {
      await StorageService.toggleStatus(user.id, t);
      fetchData(user.id);
    }
  };

  const handleCardSubmit = async (c: CreditCard) => {
    if (!user) return;
    if (editingCard) await StorageService.updateCard(user.id, c);
    else await StorageService.addCard(user.id, c);
    fetchData(user.id);
  };

  const handleDeleteCard = async (id: string) => {
    if (!user) return;
    if (window.confirm('Excluir cartão?')) {
      await StorageService.deleteCard(user.id, id);
      fetchData(user.id);
    }
  };

  const changeMonth = (increment: number) => {
    setFilter(prev => {
      let newMonth = prev.month + increment;
      let newYear = prev.year;
      if (newMonth > 11) { newMonth = 0; newYear++; }
      if (newMonth < 0) { newMonth = 11; newYear--; }
      return { ...prev, month: newMonth, year: newYear };
    });
  };

  const handleSortChange = (field: 'date' | 'amount') => {
    setFilter(prev => {
      if (prev.sortBy === field) {
        return { ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' };
      }
      return { ...prev, sortBy: field, sortOrder: 'desc' };
    });
  };

  if (loading && !user) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-500" size={48} /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-inter">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
           <div className="text-center mb-8">
             <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl shadow-lg shadow-emerald-200">F</div>
             <h1 className="text-2xl font-bold text-slate-800">Finanças 2026</h1>
           </div>
           
           {authError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">{authError}</div>}

           <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
             {isRegister && (
               <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Seu Nome" required />
             )}
             <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="seu@email.com" required />
             <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="••••••••" required />
             
             <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg">
               {isRegister ? 'Criar Conta' : 'Entrar'}
             </button>
           </form>

           <div className="my-6 flex items-center gap-4">
             <div className="h-px bg-slate-100 flex-1"></div>
             <span className="text-xs text-slate-400">ou</span>
             <div className="h-px bg-slate-100 flex-1"></div>
           </div>

           <button onClick={handleGoogleLogin} className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
             <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
             Entrar com Google
           </button>

           <div className="mt-6 text-center">
             <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-slate-400 hover:text-emerald-600">
               {isRegister ? 'Já tenho uma conta' : 'Criar nova conta'}
             </button>
           </div>
        </div>
      </div>
    );
  }

  const currentDateDisplay = format(new Date(filter.year, filter.month, 1), 'MMMM yyyy', { locale: ptBR });
  let viewTitle = 'Visão Geral';
  if (currentView === 'INCOMES') viewTitle = 'Minhas Entradas';
  if (currentView === 'EXPENSES') viewTitle = 'Minhas Saídas';
  if (currentView === 'CARDS') viewTitle = 'Meus Cartões';

  const getFilteredTransactionsForView = () => {
    if (currentView === 'INCOMES') return processedTransactions.filter(t => t.type === TransactionType.INCOME);
    return processedTransactions.filter(t => t.type !== TransactionType.INCOME);
  };

  return (
    <Layout currentView={currentView} setView={setCurrentView} user={user} onLogout={handleLogout}>
      <div className="flex flex-col gap-6 mb-8 pt-4 md:pt-0">
        <div className="flex items-center justify-between">
            <div>
               <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{viewTitle}</h1>
               <p className="text-slate-500 text-sm font-medium">Bem vindo, {user.name.split(' ')[0]}</p>
            </div>
            <div className="md:hidden">
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500"><LogOut size={20}/></button>
            </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3">
           {loading && <Loader2 className="animate-spin text-emerald-500 mr-2" />}
           <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm w-full md:w-auto justify-between">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft size={20} /></button>
              <span className="min-w-[120px] text-center font-bold text-slate-700 capitalize text-sm">{currentDateDisplay}</span>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight size={20} /></button>
           </div>
           <div className="md:hidden">
               <button onClick={handleOpenNewTransaction} className="w-10 h-10 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-xl"><Plus size={20} strokeWidth={2.5} /></button>
           </div>
        </div>
      </div>

      <div className="pt-8 md:pt-0">
        {currentView === 'DASHBOARD' && (
          <Dashboard 
            transactions={processedTransactions} 
            allTransactions={transactions}
            filter={filter} 
            cards={cards}
            onViewDetails={(type) => { 
              const filteredT = processedTransactions.filter(t => {
                  if (t.status !== TransactionStatus.COMPLETED) return false;
                  if (type === 'INCOME') return t.type === TransactionType.INCOME;
                  if (type === 'EXPENSE') return t.type !== TransactionType.INCOME;
                  return true;
              });
              setListModalTitle(type === 'INCOME' ? 'Receitas Realizadas' : type === 'EXPENSE' ? 'Despesas e Faturas Pagas' : 'Extrato Realizado');
              setListModalTransactions(filteredT);
              setIsListModalOpen(true);
            }}
          />
        )}
        
        {(currentView === 'INCOMES' || currentView === 'EXPENSES') && (
          <Transactions 
            transactions={getFilteredTransactionsForView()} 
            filter={filter} 
            onEdit={(t) => { 
              if (t.isVirtual) {
                  const card = cards.find(c => c.id === t.cardId);
                  if (card) setCurrentView('CARDS');
              } else {
                  setEditingTransaction(t); setIsTxModalOpen(true); 
              }
            }} 
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            onSortChange={handleSortChange}
          />
        )}
        
        {currentView === 'CARDS' && (
          <CardsView 
            cards={cards} 
            transactions={transactions} 
            filterMonth={filter.month} 
            filterYear={filter.year} 
            onCardClick={(cardId) => {
              const card = cards.find(c => c.id === cardId);
              if (!card) return;
              const targetDate = new Date(filter.year, filter.month, 1);
              const cardTx = transactions.filter(t => 
                t.cardId === cardId && 
                isSameMonth(getInvoiceMonth(new Date(t.date), card.closingDay), targetDate)
              );
              setListModalTitle(`Fatura: ${card.name}`);
              setListModalTransactions(cardTx);
              setIsListModalOpen(true);
            }}
            onAddTransaction={(cardId) => {
              setEditingTransaction({ 
                id: '', 
                description: '', amount: 0, date: new Date().toISOString(),
                type: TransactionType.CARD_EXPENSE, category: 'Outros', status: TransactionStatus.COMPLETED,
                cardId: cardId
              });
              setIsTxModalOpen(true);
            }}
            onEditCard={(c) => { setEditingCard(c); setIsCardFormOpen(true); }}
            onDeleteCard={handleDeleteCard}
            onAddNewCard={() => { setEditingCard(null); setIsCardFormOpen(true); }}
          />
        )}
      </div>

      <button onClick={handleOpenNewTransaction} className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl hover:bg-emerald-700 transition-all items-center justify-center hidden md:flex"><Plus size={32} strokeWidth={2.5} /></button>

      <TransactionForm 
        isOpen={isTxModalOpen} 
        onClose={() => setIsTxModalOpen(false)} 
        onSubmit={handleTransactionSubmit}
        initialData={editingTransaction}
        cards={cards}
      />

      <CardForm 
        isOpen={isCardFormOpen}
        onClose={() => setIsCardFormOpen(false)}
        onSubmit={handleCardSubmit}
        initialData={editingCard}
      />

      <TransactionListModal 
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        title={listModalTitle}
        transactions={listModalTransactions}
        onEdit={currentView === 'CARDS' ? (t) => { setIsListModalOpen(false); setTimeout(() => { setEditingTransaction(t); setIsTxModalOpen(true); }, 100); } : undefined}
        onDelete={currentView === 'CARDS' ? handleDelete : undefined}
      />
    </Layout>
  );
}

export default App;