import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { CardsView } from './components/Cards';
import { DebtsView } from './components/Debts';
import { CategoriesView } from './components/Categories';
import { AIHealthReportModal } from './components/AIHealthReportModal';
import { AIImportModal } from './components/AIImportModal';
import { TransactionForm } from './components/TransactionForm';
import { TransactionListModal } from './components/TransactionListModal';
import { CardForm } from './components/CardForm';
import { DebtForm } from './components/DebtForm';
import { DebtDetailsModal } from './components/DebtDetailsModal';
import { StorageService, generateInstallments, getInvoiceMonth } from './services/storage';
import { AIService } from './services/ai';
import { User, Transaction, ViewState, FilterState, CreditCard, TransactionType, TransactionStatus, Debt, Category, Budget } from './types';
import { Plus, ChevronLeft, ChevronRight, Loader2, LogOut, Sparkles } from 'lucide-react';
import { format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate, toDateString } from './utils/date';
import { ConfirmModal } from './components/ui/ConfirmModal';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  // --- Global State ---
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // UX State - Transaction Form
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // UX State - Card Form
  const [isCardFormOpen, setIsCardFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  // UX State - Debt Form
  const [isDebtFormOpen, setIsDebtFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [isDebtDetailsOpen, setIsDebtDetailsOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  // UX State - List Modal
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listModalTitle, setListModalTitle] = useState('');
  const [listModalTransactions, setListModalTransactions] = useState<Transaction[]>([]);

  // UX State - AI Import
  const [isAIImportOpen, setIsAIImportOpen] = useState(false);

  // UX State - AI Health Report
  const [isAIReportOpen, setIsAIReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  const [filter, setFilter] = useState<FilterState>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    type?: 'danger' | 'warning' | 'info';
    confirmLabel?: string;
    cancelLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (config: Omit<typeof confirmConfig, 'isOpen'>) => {
    setConfirmConfig({ ...config, isOpen: true });
  };

  // Auth State (Inputs)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [regName, setRegName] = useState('');
  const [authError, setAuthError] = useState('');

  // --- Effects ---
  useEffect(() => {
    // Auth Observer
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
      const [txs, cds, dts, cats, bgts] = await Promise.all([
        StorageService.getTransactions(userId),
        StorageService.getCards(userId),
        StorageService.getDebts(userId),
        StorageService.getCategories(userId),
        StorageService.getBudgets(userId)
      ]);
      setTransactions(txs);
      setCards(cds);
      setDebts(dts);
      setCategories(cats);
      setBudgets(bgts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- Core Logic: Aggregation for Display ---
  const processedTransactions = useMemo(() => {
    const targetDate = new Date(filter.year, filter.month, 1);
    
    // 1. Filter Standard Transactions (Income/Expense) for current month
    const standardTxs = transactions.filter(t => {
      if (t.type === TransactionType.CARD_EXPENSE) return false;
      return isSameMonth(parseLocalDate(t.date), targetDate);
    });

    // 2. Aggregate Card Transactions into Invoices
    const invoiceMap = new Map<string, { amount: number, card: CreditCard, items: Transaction[] }>();

      transactions.filter(t => t.type === TransactionType.CARD_EXPENSE).forEach(t => {
        const card = cards.find(c => c.id === t.cardId);
        if (card) {
          // Calculate which invoice this transaction belongs to
          const invoiceDate = getInvoiceMonth(parseLocalDate(t.date), card.closingDay);
          
          // If this invoice belongs to the currently filtered month, add to total
          if (isSameMonth(invoiceDate, targetDate)) {
          const current = invoiceMap.get(card.id) || { amount: 0, card, items: [] };
          current.amount += t.amount;
          current.items.push(t);
          invoiceMap.set(card.id, current);
        }
      }
    });

    // 3. Create "Virtual" Transactions for the Invoices
    const invoiceTxs: Transaction[] = Array.from(invoiceMap.values()).map(({ amount, card, items }) => {
       // Determine Due Date for this invoice
       const dueDate = new Date(filter.year, filter.month, card.dueDay);
       
       // Calculate Status based on items: If ALL are completed, status is completed. Else Pending.
       const allCompleted = items.length > 0 && items.every(t => t.status === TransactionStatus.COMPLETED);

       return {
         id: `virtual-invoice-${card.id}-${filter.month}-${filter.year}`,
         description: `Fatura: ${card.name}`,
         amount: amount,
         date: dueDate.toISOString(),
         type: TransactionType.EXPENSE, // Treat invoice as an expense to pay
         category: 'Cartão de Crédito',
         status: allCompleted ? TransactionStatus.COMPLETED : TransactionStatus.PENDING,
         isVirtual: true,
         cardId: card.id // Reference for clicking
       };
    });

    return [...standardTxs, ...invoiceTxs];

  }, [transactions, cards, filter.month, filter.year]);


  // --- Auth Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await StorageService.loginEmail(loginEmail, loginPass);
      toast.success('Login realizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      setAuthError('Erro ao fazer login. Verifique suas credenciais.');
      toast.error('Erro ao fazer login. Verifique suas credenciais.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await StorageService.registerEmail(loginEmail, loginPass, regName);
      toast.success('Conta criada com sucesso!');
    } catch (err: any) {
      console.error(err);
      setAuthError('Erro ao criar conta. Tente novamente.');
      toast.error('Erro ao criar conta. Tente novamente.');
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    try {
      await StorageService.loginGoogle();
      toast.success('Login com Google realizado!');
    } catch (err: any) {
      console.error(err);
      setAuthError('Erro no login com Google.');
      toast.error('Erro no login com Google.');
    }
  };

  const handleLogout = async () => {
    try {
      await StorageService.logout();
      toast.success('Logout realizado.');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao fazer logout.');
    }
  };

  // --- Transaction Handlers ---
  const handleOpenNewTransaction = () => {
      // Determine default type based on current view
      let defaultType = TransactionType.EXPENSE;
      let defaultCategory = '';
      let defaultCardId = undefined;

      const incomeCats = categories.filter(c => c.type === TransactionType.INCOME).map(c => c.name);
      const expenseCats = categories.filter(c => c.type === TransactionType.EXPENSE).map(c => c.name);

      if (currentView === 'INCOMES') {
          defaultType = TransactionType.INCOME;
          defaultCategory = incomeCats[0] || '';
      } else if (currentView === 'CARDS') {
          defaultType = TransactionType.CARD_EXPENSE;
          defaultCategory = expenseCats[0] || '';
          if (cards.length > 0) defaultCardId = cards[0].id;
      } else {
          defaultCategory = expenseCats[0] || '';
      }

      setEditingTransaction({
        id: '',
        description: '',
        amount: 0,
        date: new Date().toISOString(),
        type: defaultType,
        category: defaultCategory,
        status: defaultType === TransactionType.CARD_EXPENSE ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
        cardId: defaultCardId
      });
      setIsTxModalOpen(true);
  };

  const handleTransactionSubmit = async (t: Transaction, installments: number, amountType: 'total' | 'installment') => {
    if (!user) return;
    
    // Check if ID exists to determine if it's an Update or Create
    if (editingTransaction && editingTransaction.id) {
      // UPDATE LOGIC
      if (editingTransaction.installments?.groupId) {
         // Ask user about series update
         showConfirm({
           title: "Atualizar Série?",
           message: "Esta transação faz parte de um parcelamento. Deseja aplicar as alterações para todas as parcelas futuras desta série?",
           confirmLabel: "Sim, todas",
           cancelLabel: "Não, apenas esta",
           onConfirm: async () => {
              if (!user) return;
              try {
                await StorageService.updateTransactionSeries(user.id, editingTransaction.installments!.groupId, t);
                toast.success('Série de transações atualizada com sucesso!');
                fetchData(user.id);
                setIsTxModalOpen(false);
              } catch (err) {
                console.error(err);
                toast.error('Erro ao atualizar série de transações.');
              }
           },
           onCancel: async () => {
              if (!user) return;
              try {
                await StorageService.updateTransaction(user.id, t);
                toast.success('Transação atualizada com sucesso!');
                fetchData(user.id);
                setIsTxModalOpen(false);
              } catch (err) {
                console.error(err);
                toast.error('Erro ao atualizar transação.');
              }
           }
         });
      } else {
         try {
           await StorageService.updateTransaction(user.id, t);
           toast.success('Transação atualizada com sucesso!');
           await fetchData(user.id);
           setIsTxModalOpen(false);
         } catch (err) {
           console.error(err);
           toast.error('Erro ao atualizar transação.');
         }
      }
    } else {
      // CREATE LOGIC
      try {
        const allT = generateInstallments(t, installments, amountType);
        await StorageService.addTransactionsBatch(user.id, allT);
        toast.success(installments > 1 ? `${installments} parcelas criadas com sucesso!` : 'Transação criada com sucesso!');
        await fetchData(user.id);
        setIsTxModalOpen(false);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao criar transação.');
      }
    }
  };

  const handleDelete = async (txToDelete: Transaction) => {
    if (!user) return;
    
    // Block deleting virtual transactions
    if (txToDelete.id.startsWith('virtual-invoice')) {
      alert("Para alterar o valor da fatura, edite ou exclua as transações individuais na aba 'Cartões'.");
      return;
    }

    if (txToDelete.installments?.groupId) {
      showConfirm({
        title: "Excluir Parcelamento",
        message: `Esta é a parcela ${txToDelete.installments.current}/${txToDelete.installments.total}. Deseja excluir apenas esta parcela ou esta e todas as futuras?`,
        type: 'danger',
        confirmLabel: 'Esta e futuras',
        cancelLabel: 'Apenas esta',
        onConfirm: async () => {
          try {
            await StorageService.deleteTransactionSeries(user.id, txToDelete.installments!.groupId, txToDelete.installments!.current);
            toast.success('Série de transações excluída com sucesso!');
            await fetchData(user.id);
            setIsListModalOpen(false);
          } catch (err) {
            console.error(err);
            toast.error('Erro ao excluir série de transações.');
          }
        },
        onCancel: async () => {
          try {
            await StorageService.deleteTransaction(user.id, txToDelete.id);
            toast.success('Parcela excluída com sucesso!');
            await fetchData(user.id);
            setIsListModalOpen(false);
          } catch (err) {
            console.error(err);
            toast.error('Erro ao excluir parcela.');
          }
        }
      });
    } else {
      showConfirm({
        title: 'Excluir Transação?',
        message: 'Tem certeza que deseja excluir esta transação?',
        type: 'danger',
        confirmLabel: 'Sim, excluir',
        cancelLabel: 'Cancelar',
        onConfirm: async () => {
          try {
            await StorageService.deleteTransaction(user.id, txToDelete.id);
            toast.success('Transação excluída com sucesso!');
            await fetchData(user.id);
            setIsListModalOpen(false);
          } catch (err) {
            console.error(err);
            toast.error('Erro ao excluir transação.');
          }
        }
      });
    }
  };

  const handleToggleStatus = async (id: string) => {
    if (!user) return;

    // Handle Virtual Invoice "Payment"
    if (id.startsWith('virtual-invoice')) {
      const virtualTx = processedTransactions.find(t => t.id === id);
      if (!virtualTx || !virtualTx.cardId) return;

      const newStatus = virtualTx.status === TransactionStatus.COMPLETED 
        ? TransactionStatus.PENDING 
        : TransactionStatus.COMPLETED;

      // Find underlying transactions for this invoice
      const targetDate = new Date(filter.year, filter.month, 1);
      const card = cards.find(c => c.id === virtualTx.cardId);
      if (!card) return;

      const txsToUpdate = transactions.filter(t => {
        if (t.type !== TransactionType.CARD_EXPENSE || t.cardId !== virtualTx.cardId) return false;
        const invoiceDate = getInvoiceMonth(parseLocalDate(t.date), card.closingDay);
        return isSameMonth(invoiceDate, targetDate);
      });
      
      const idsToUpdate = txsToUpdate.map(t => t.id);
      
      if (idsToUpdate.length > 0) {
        try {
          await StorageService.batchUpdateStatus(user.id, idsToUpdate, newStatus);
          toast.success(newStatus === TransactionStatus.COMPLETED ? 'Fatura marcada como paga!' : 'Fatura marcada como pendente.');
          await fetchData(user.id);
        } catch (err) {
          console.error(err);
          toast.error('Erro ao atualizar status da fatura.');
        }
      }
      return;
    }

    // Standard Toggle
    const t = transactions.find(tx => tx.id === id);
    if (t) {
      try {
        const nextStatus = t.status === TransactionStatus.COMPLETED ? 'pendente' : 'paga';
        await StorageService.toggleStatus(user.id, t);
        toast.success(`Transação marcada como ${nextStatus}.`);
        await fetchData(user.id);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao atualizar status da transação.');
      }
    }
  };

  // --- Card Handlers ---
  const handleCardSubmit = async (c: CreditCard) => {
    if (!user) return;
    try {
      if (editingCard) {
        await StorageService.updateCard(user.id, c);
        toast.success('Cartão atualizado com sucesso!');
      } else {
        await StorageService.addCard(user.id, c);
        toast.success('Cartão criado com sucesso!');
      }
      fetchData(user.id);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar cartão.');
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!user) return;
    showConfirm({
      title: 'Excluir Cartão?',
      message: 'Tem certeza que deseja excluir este cartão?',
      type: 'danger',
      confirmLabel: 'Sim',
      cancelLabel: 'Não',
      onConfirm: async () => {
        try {
          await StorageService.deleteCard(user.id, id);
          toast.success('Cartão excluído com sucesso!');
          fetchData(user.id);
        } catch (err) {
          console.error(err);
          toast.error('Erro ao excluir cartão.');
        }
      }
    });
  };

  // --- Debt Handlers ---
  const handleDebtSubmit = async (d: Debt) => {
    if (!user) return;
    try {
      if (editingDebt) {
        await StorageService.updateDebt(user.id, d);
        toast.success('Dívida atualizada com sucesso!');
      } else {
        await StorageService.addDebt(user.id, d);
        toast.success('Dívida criada com sucesso!');
      }
      fetchData(user.id);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar dívida.');
    }
  };

  const handleDeleteDebt = async (id: string) => {
    if (!user) return;
    try {
      await StorageService.deleteDebt(user.id, id);
      toast.success('Dívida excluída com sucesso!');
      fetchData(user.id);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir dívida.');
    }
  };

  const handleUpdateDebtInstallment = async (debtId: string, installmentId: string, status: TransactionStatus, customAmount?: number) => {
    if (!user) return;
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const updatedInstallments = debt.installments.map(i => {
      if (i.id === installmentId) {
        let newAmount = i.amount;
        let newInterest = i.interest;
        
        if (customAmount !== undefined && status === TransactionStatus.COMPLETED) {
          // If custom amount is provided, we assume it's an early payment
          // We need to adjust interest based on the custom amount
          // New Interest = Custom Amount - Principal (if custom amount > principal)
          // But usually, "Antecipar" means paying less than the full amount (waiving interest)
          // The user enters what they REALLY paid.
          newAmount = customAmount;
          newInterest = Math.max(0, customAmount - i.principal);
        }

        return { 
          ...i, 
          status, 
          amount: newAmount,
          interest: newInterest,
          paidDate: status === TransactionStatus.COMPLETED ? toDateString(new Date()) : null 
        };
      }
      return i;
    });

    const updatedDebt = { ...debt, installments: updatedInstallments };
    try {
      await StorageService.updateDebt(user.id, updatedDebt);
      toast.success(status === TransactionStatus.COMPLETED ? 'Parcela quitada!' : 'Parcela reaberta.');
      
      // Update local state immediately for better UX
      setDebts(prev => prev.map(d => d.id === debtId ? updatedDebt : d));
      if (selectedDebt?.id === debtId) {
        setSelectedDebt(updatedDebt);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar parcela.');
    }
  };

  const handlePayoffDebt = async (debtId: string, discountPercentage: number) => {
    if (!user) return;
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    showConfirm({
      title: 'Confirmar Quitação?',
      message: `Deseja quitar todas as parcelas restantes com ${discountPercentage}% de desconto nos juros?`,
      confirmLabel: 'Sim, Quitar',
      cancelLabel: 'Não',
      onConfirm: async () => {
        const updatedInstallments = debt.installments.map(i => {
          if (i.status !== TransactionStatus.COMPLETED) {
            const discountedInterest = i.interest * (1 - discountPercentage / 100);
            return {
              ...i,
              status: TransactionStatus.COMPLETED,
              interest: parseFloat(discountedInterest.toFixed(2)),
              amount: parseFloat((i.principal + discountedInterest).toFixed(2)),
              paidDate: toDateString(new Date())
            };
          }
          return i;
        });

        try {
          await StorageService.updateDebt(user.id, { ...debt, installments: updatedInstallments });
          toast.success('Dívida quitada com sucesso!');
          fetchData(user.id);
          setIsDebtDetailsOpen(false);
        } catch (err) {
          console.error(err);
          toast.error('Erro ao quitar dívida.');
        }
      }
    });
  };

  // --- AI Report Handler ---
  const handleOpenAIReport = async () => {
    if (!user) return;
    setIsAIReportOpen(true);
    setReportLoading(true);
    setReportError('');
    setReportText('');

    try {
      const targetDate = new Date(filter.year, filter.month, 1);
      const prevMonthDate = new Date(filter.year, filter.month - 1, 1);

      const currentMonthTransactions = transactions.filter(t => {
        if (t.type === TransactionType.CARD_EXPENSE) {
          const card = cards.find(c => c.id === t.cardId);
          if (card) {
            const invoiceDate = getInvoiceMonth(parseLocalDate(t.date), card.closingDay);
            return isSameMonth(invoiceDate, targetDate);
          }
          return false;
        }
        return isSameMonth(parseLocalDate(t.date), targetDate);
      });

      const prevMonthTransactions = transactions.filter(t => {
        if (t.type === TransactionType.CARD_EXPENSE) {
          const card = cards.find(c => c.id === t.cardId);
          if (card) {
            const invoiceDate = getInvoiceMonth(parseLocalDate(t.date), card.closingDay);
            return isSameMonth(invoiceDate, prevMonthDate);
          }
          return false;
        }
        return isSameMonth(parseLocalDate(t.date), prevMonthDate);
      });

      const currentIncome = currentMonthTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);
      const currentExpense = currentMonthTransactions
        .filter(t => t.type !== TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);

      const prevIncome = prevMonthTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);
      const prevExpense = prevMonthTransactions
        .filter(t => t.type !== TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);

      const catMapCurrent = new Map<string, number>();
      currentMonthTransactions
        .filter(t => t.type !== TransactionType.INCOME)
        .forEach(t => {
          catMapCurrent.set(t.category, (catMapCurrent.get(t.category) || 0) + t.amount);
        });
      const categoryCurrent = Array.from(catMapCurrent.entries()).map(([name, value]) => ({ name, value }));

      const catMapPrev = new Map<string, number>();
      prevMonthTransactions
        .filter(t => t.type !== TransactionType.INCOME)
        .forEach(t => {
          catMapPrev.set(t.category, (catMapPrev.get(t.category) || 0) + t.amount);
        });
      const categoryPrev = Array.from(catMapPrev.entries()).map(([name, value]) => ({ name, value }));

      const allIncome = transactions
        .filter(t => t.type === TransactionType.INCOME && t.status === TransactionStatus.COMPLETED)
        .reduce((sum, t) => sum + t.amount, 0);
      const allExpense = transactions
        .filter(t => t.type !== TransactionType.INCOME && t.status === TransactionStatus.COMPLETED)
        .reduce((sum, t) => sum + t.amount, 0);
      const totalSavings = allIncome - allExpense;

      const last3MonthsExpenses: number[] = [];
      for (let i = 1; i <= 3; i++) {
        const d = new Date(filter.year, filter.month - i, 1);
        const mExpenses = transactions.filter(t => {
          if (t.type === TransactionType.CARD_EXPENSE) {
            const card = cards.find(c => c.id === t.cardId);
            if (card) {
              const invoiceDate = getInvoiceMonth(parseLocalDate(t.date), card.closingDay);
              return isSameMonth(invoiceDate, d);
            }
            return false;
          }
          return isSameMonth(parseLocalDate(t.date), d);
        })
        .filter(t => t.type !== TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);
        last3MonthsExpenses.push(mExpenses);
      }
      const averageExpense = last3MonthsExpenses.reduce((sum, val) => sum + val, 0) / 3 || currentExpense || 1;

      const currentMonthName = format(targetDate, 'MMMM yyyy', { locale: ptBR });

      const report = await AIService.generateHealthReport(
        currentMonthName,
        currentIncome,
        currentExpense,
        categoryCurrent,
        prevIncome,
        prevExpense,
        categoryPrev,
        totalSavings,
        averageExpense
      );

      setReportText(report);
    } catch (err: any) {
      console.error("Erro ao gerar relatório:", err);
      setReportError(err.message || "Erro desconhecido ao chamar IA.");
    } finally {
      setReportLoading(false);
    }
  };

  // --- Category Handlers ---
  const handleSaveCategory = async (cat: Omit<Category, 'userId'>) => {
    if (!user) return;
    try {
      if (cat.id) {
        const oldCat = categories.find(c => c.id === cat.id);
        if (oldCat && oldCat.name !== cat.name) {
          await StorageService.updateCategoryAndTransactions(user.id, cat.id, oldCat.name, cat.name, cat.emoji || '🏷️');
          toast.success('Categoria e transações atualizadas!');
        } else {
          await StorageService.updateCategory(user.id, cat.id, { name: cat.name, emoji: cat.emoji });
          toast.success('Categoria atualizada com sucesso!');
        }
      } else {
        await StorageService.addCategory(user.id, cat);
        toast.success('Categoria criada com sucesso!');
      }
      await fetchData(user.id);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar categoria.');
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!user) return;
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    
    showConfirm({
      title: 'Excluir Categoria?',
      message: `Tem certeza que deseja excluir a categoria "${cat.name}"? As transações associadas serão mantidas com essa categoria como texto.`,
      type: 'danger',
      confirmLabel: 'Sim, excluir',
      cancelLabel: 'Cancelar',
      onConfirm: async () => {
        try {
          await StorageService.deleteCategory(user.id, catId);
          toast.success('Categoria excluída com sucesso!');
          await fetchData(user.id);
        } catch (err) {
          console.error(err);
          toast.error('Erro ao excluir categoria.');
        }
      }
    });
  };

  // --- Budget Handlers ---
  const handleSaveBudget = async (categoryName: string, limit: number) => {
    if (!user) return;
    try {
      await StorageService.saveBudget(user.id, categoryName, limit);
      toast.success('Orçamento salvo com sucesso!');
      await fetchData(user.id);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar orçamento.');
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (!user) return;
    try {
      await StorageService.deleteBudget(user.id, budgetId);
      toast.success('Orçamento removido com sucesso!');
      await fetchData(user.id);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover orçamento.');
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

  // --- Render ---

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
             <p className="text-slate-500 mt-2">Controle sua vida financeira.</p>
           </div>
           
           {authError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">{authError}</div>}

           <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
             {isRegister && (
               <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Seu Nome" required />
             )}
             <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="seu@email.com" required />
             <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="••••••••" required />
             
             <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
               {isRegister ? 'Criar Conta' : 'Entrar'}
             </button>
           </form>

           <div className="my-6 flex items-center gap-4">
             <div className="h-px bg-slate-100 flex-1"></div>
             <span className="text-xs text-slate-400">ou</span>
             <div className="h-px bg-slate-100 flex-1"></div>
           </div>

           <button 
             onClick={handleGoogleLogin} 
             className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
           >
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
  if (currentView === 'DEBTS') viewTitle = 'Minhas Dívidas';
  if (currentView === 'CATEGORIES') viewTitle = 'Minhas Categorias';

  // Filter view logic for Income/Expense tabs
  const getFilteredTransactionsForView = () => {
    // processedTransactions already contains properly filtered standard txs + invoice aggregates
    if (currentView === 'INCOMES') {
       return processedTransactions.filter(t => t.type === TransactionType.INCOME);
    }
    // For Expenses, show Standard Expenses AND Virtual Invoices
    return processedTransactions.filter(t => t.type !== TransactionType.INCOME);
  };

  return (
    <Layout currentView={currentView} setView={setCurrentView} user={user} onLogout={handleLogout}>
      
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8 pt-4 md:pt-0">
        {/* Top Row: Title & User (Mobile) / Title (Desktop) */}
        <div className="flex items-center justify-between">
            <div>
               <h1 className="text-2xl font-bold text-slate-800 capitalize tracking-tight">{viewTitle}</h1>
               <p className="text-slate-500 text-sm font-medium">Bem vindo de volta, {user.name.split(' ')[0]}</p>
            </div>
            
            {/* Mobile Logout */}
            <div className="md:hidden">
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><LogOut size={20}/></button>
            </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between md:justify-end gap-3">
           {loading && <Loader2 className="animate-spin text-emerald-500 mr-2" />}
           
           {/* Importar Fatura com IA */}
           {currentView === 'CARDS' && (
             <button
               onClick={() => setIsAIImportOpen(true)}
               className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-sm transition-all active:scale-95 shrink-0"
             >
               <Sparkles size={16} className="text-indigo-600 animate-pulse" />
               <span>Importar Fatura</span>
             </button>
           )}

           {/* Month Selector */}
           <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm w-full md:w-auto justify-between md:justify-start">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft size={20} /></button>
              <span className="min-w-[120px] md:min-w-[140px] text-center font-bold text-slate-700 capitalize select-none text-sm md:text-base">{currentDateDisplay}</span>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight size={20} /></button>
           </div>

           {/* Mobile Add Button */}
           <div className="md:hidden shrink-0">
               <button 
                  onClick={handleOpenNewTransaction}
                  className="w-10 h-10 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors shadow-sm"
                  title="Nova Transação"
                >
                  <Plus size={20} strokeWidth={2.5} />
                </button>
           </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-8 md:pt-0"> {/* Add padding top on mobile for custom header */}
        {currentView === 'DASHBOARD' && (
          <Dashboard 
            transactions={processedTransactions} 
            allTransactions={transactions} // Pass raw txs for history
            filter={filter} 
            cards={cards}
            budgets={budgets}
            onSaveBudget={handleSaveBudget}
            onOpenAIReport={handleOpenAIReport}
            onViewDetails={(type) => { 
              const filteredT = processedTransactions.filter(t => {
                  // For Dashboard stats (which show "Realized"), only show COMPLETED items
                  if (t.status !== TransactionStatus.COMPLETED) return false;

                  if (type === 'INCOME') return t.type === TransactionType.INCOME;
                  if (type === 'EXPENSE') return t.type !== TransactionType.INCOME;
                  return true;
              });

              if (type === 'INCOME') setListModalTitle('Receitas Realizadas');
              else if (type === 'EXPENSE') setListModalTitle('Despesas e Faturas Pagas');
              else setListModalTitle('Extrato Realizado');

              setListModalTransactions(filteredT);
              setIsListModalOpen(true);
            }}
          />
        )}

        {currentView === 'CATEGORIES' && (
          <CategoriesView 
            categories={categories}
            budgets={budgets}
            onAddCategory={async (name, type, emoji) => handleSaveCategory({ id: '', name, type: type as TransactionType.INCOME | TransactionType.EXPENSE, emoji })}
            onUpdateCategory={async (id, oldName, newName, emoji) => {
              const cat = categories.find(c => c.id === id);
              if (cat) {
                await handleSaveCategory({ id, name: newName, emoji, type: cat.type });
              }
            }}
            onDeleteCategory={handleDeleteCategory}
            onSaveBudget={handleSaveBudget}
            onDeleteBudget={handleDeleteBudget}
          />
        )}
        
        {(currentView === 'INCOMES' || currentView === 'EXPENSES') && (
          <Transactions 
            transactions={getFilteredTransactionsForView()} 
            filter={filter} 
            onEdit={(t) => { 
              if (t.isVirtual) {
                  const card = cards.find(c => c.id === t.cardId);
                  if (card) {
                    setCurrentView('CARDS');
                  }
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
                isSameMonth(getInvoiceMonth(parseLocalDate(t.date), card.closingDay), targetDate)
              );
              setListModalTitle(`Fatura: ${card.name}`);
              // Show ALL transactions for the invoice (Pending + Completed) so user can see what's coming
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

        {currentView === 'DEBTS' && (
          <DebtsView 
            debts={debts}
            onAddDebt={() => { setEditingDebt(null); setIsDebtFormOpen(true); }}
            onEditDebt={(d) => { setEditingDebt(d); setIsDebtFormOpen(true); }}
            onDeleteDebt={handleDeleteDebt}
            onViewInstallments={(d) => { setSelectedDebt(d); setIsDebtDetailsOpen(true); }}
          />
        )}
      </div>

      {/* Floating Action Button (FAB) for Web Only - Now uses smart open */}
      <button
        onClick={handleOpenNewTransaction}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl hover:bg-emerald-700 hover:scale-105 transition-all items-center justify-center z-40 group hidden md:flex"
        title="Nova Transação"
      >
        <Plus size={32} strokeWidth={2.5} />
      </button>

      {/* Modals */}
      <TransactionForm 
        isOpen={isTxModalOpen} 
        onClose={() => setIsTxModalOpen(false)} 
        onSubmit={handleTransactionSubmit}
        initialData={editingTransaction}
        cards={cards}
        categoriesList={categories}
      />

      <CardForm 
        isOpen={isCardFormOpen}
        onClose={() => setIsCardFormOpen(false)}
        onSubmit={handleCardSubmit}
        initialData={editingCard}
      />

      <DebtForm 
        isOpen={isDebtFormOpen}
        onClose={() => { setIsDebtFormOpen(false); setEditingDebt(null); }}
        onSubmit={handleDebtSubmit}
        initialData={editingDebt}
      />

      <DebtDetailsModal 
        isOpen={isDebtDetailsOpen}
        onClose={() => setIsDebtDetailsOpen(false)}
        debt={selectedDebt}
        onUpdateInstallment={handleUpdateDebtInstallment}
        onPayoffDebt={handlePayoffDebt}
        onEditDebt={(d) => { setIsDebtDetailsOpen(false); setEditingDebt(d); setIsDebtFormOpen(true); }}
        onDeleteDebt={handleDeleteDebt}
      />

      <TransactionListModal 
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        title={listModalTitle}
        transactions={listModalTransactions}
        // Only allow Edit/Delete if we are in CARDS view (Invoice details)
        // Dashboard popups are read-only to save space
        onEdit={currentView === 'CARDS' ? (t) => { 
            setIsListModalOpen(false); 
            setTimeout(() => {
                setEditingTransaction(t); 
                setIsTxModalOpen(true); 
            }, 100);
        } : undefined}
        onDelete={currentView === 'CARDS' ? handleDelete : undefined}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        onCancel={confirmConfig.onCancel}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        confirmLabel={confirmConfig.confirmLabel}
        cancelLabel={confirmConfig.cancelLabel}
      />

      <AIImportModal
        isOpen={isAIImportOpen}
        onClose={() => setIsAIImportOpen(false)}
        cards={cards}
        categories={categories}
        onImport={async (importedTxs) => {
          if (!user) return;
          try {
            await StorageService.addTransactionsBatch(user.id, importedTxs);
            toast.success('Transações importadas com sucesso!');
            await fetchData(user.id);
          } catch (err) {
            console.error(err);
            toast.error('Erro ao importar transações.');
          }
        }}
      />

      <AIHealthReportModal
        isOpen={isAIReportOpen}
        onClose={() => setIsAIReportOpen(false)}
        reportText={reportText}
        loading={reportLoading}
        error={reportError}
        onGenerate={handleOpenAIReport}
      />

      <Toaster position="top-right" />
    </Layout>
  );
}

export default App;