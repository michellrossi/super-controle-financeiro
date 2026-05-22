import { Transaction, CreditCard, TransactionType, TransactionStatus, User, INCOME_CATEGORIES, EXPENSE_CATEGORIES, Debt, Category, Budget } from '../types';
import { parseLocalDate, toDateString } from '../utils/date';

export const getEmojiForCategoryName = (categoryName: string): string => {
  switch (categoryName) {
    // Despesas
    case 'Alimentação': return '🍔';
    case 'Apê':
    case 'Moradia': return '🏠';
    case 'Assinatura': return '📱';
    case 'Besteira': return '🍕';
    case 'Carro':
    case 'Transporte': return '🚗';
    case 'Comemoração': return '🥳';
    case 'Educação':
    case 'Estudo': return '📚';
    case 'Farmácia':
    case 'Saúde': return '💊';
    case 'Ifood': return '🥡';
    case 'Investimento': return '📈';
    case 'Lazer': return '🎮';
    case 'Mercado':
    case 'Compra': return '🛍️';
    case 'Pessoal':
    case 'Lucas': return '👤';
    case 'Presente': return '🎁';
    case 'Viagem': return '✈️';
    case 'Vestuário': return '👕';
    case 'Serviço': return '💡';
    case 'Imposto': return '📋';
    case 'Doação e Oferta': return '🙌';
    case 'Pet': return '🐾';
    
    // Receitas
    case 'Salário': return '💰';
    case 'Bonificação':
    case '13°': return '🧧';
    case 'Empréstimo': return '🤝';
    case 'Vale Alimentação':
    case 'Vale Refeição': return '🍱';
    case 'Saldo Anterior': return '🔙';
    case 'ISK': return '💼';
    case 'Periculosidade': return '⚠️';
    
    default: return '🏷️';
  }
};
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  writeBatch
} from "firebase/firestore";
import { addMonths, isBefore, startOfMonth } from 'date-fns';

// Firebase Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
export const db = getFirestore(app);

// Helpers
export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const getInvoiceMonth = (date: Date, closingDay: number, dueDay: number): Date => {
  const d = new Date(date);
  const m = d.getMonth();
  const y = d.getFullYear();
  
  const closingDateOfThisMonth = new Date(y, m, closingDay, 23, 59, 59);
  
  if (closingDay < dueDay) {
    if (d > closingDateOfThisMonth) {
      d.setMonth(m + 1);
    }
  } else {
    if (d <= closingDateOfThisMonth) {
      d.setMonth(m + 1);
    } else {
      d.setMonth(m + 2);
    }
  }
  return d;
};

/**
 * Calcula o saldo devedor total de um cartão em relação a um mês específico.
 * Considera todas as transações de cartão que pertencem à fatura do mês alvo ou faturas futuras.
 */
export const getRemainingDebtForMonth = (transactions: Transaction[], card: CreditCard, targetMonth: Date): number => {
  const startOfTarget = startOfMonth(targetMonth);
  
  return transactions
    .filter(t => {
      if (t.type !== TransactionType.CARD_EXPENSE || t.cardId !== card.id) return false;
      
      const invoiceMonth = getInvoiceMonth(parseLocalDate(t.date), card.closingDay, card.dueDay);
      const startOfInvoice = startOfMonth(invoiceMonth);
      
      // O saldo devedor no mês X é a soma de tudo que vence no mês X e nos meses seguintes
      return !isBefore(startOfInvoice, startOfTarget);
    })
    .reduce((acc, t) => acc + t.amount, 0);
};

// Helper to remove undefined keys which Firestore rejects
const cleanPayload = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(item => cleanPayload(item));
  }
  if (data !== null && typeof data === 'object') {
    return Object.entries(data).reduce((acc, [k, v]) => {
      if (v !== undefined) {
        acc[k] = cleanPayload(v);
      }
      return acc;
    }, {} as any);
  }
  return data;
};

export const generateInstallments = (baseTransaction: Transaction, totalInstallments: number, amountType: 'total' | 'installment' = 'installment'): Transaction[] => {
  const baseDateObj = parseLocalDate(baseTransaction.date);

  if (totalInstallments <= 1) {
    return [{
        ...baseTransaction,
        date: `${toDateString(baseDateObj)}T12:00:00`
    }];
  }

  const transactions: Transaction[] = [];
  const groupId = crypto.randomUUID();

  // Calculate amount per installment
  const installmentValue = amountType === 'total' 
    ? baseTransaction.amount / totalInstallments 
    : baseTransaction.amount;

  for (let i = 0; i < totalInstallments; i++) {
    const newDateObj = addMonths(baseDateObj, i);

    transactions.push({
      ...baseTransaction,
      id: crypto.randomUUID(), // Temp ID
      amount: parseFloat(installmentValue.toFixed(2)),
      date: `${toDateString(newDateObj)}T12:00:00`, 
      installments: {
        current: i + 1,
        total: totalInstallments,
        groupId
      }
    });
  }
  return transactions;
};

// Async Service Layer
export const StorageService = {
  // --- Auth ---
  authInstance: auth,
  
  observeAuth: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        callback({
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário',
          email: fbUser.email || '',
          avatar: fbUser.photoURL || `https://ui-avatars.com/api/?name=${fbUser.displayName || 'U'}&background=10B981&color=fff`
        });
      } else {
        callback(null);
      }
    });
  },

  loginGoogle: async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  },

  loginEmail: async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  },

  registerEmail: async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await updateProfile(cred.user, { displayName: name });
    }
  },

  logout: async () => {
    await signOut(auth);
  },

  // --- Transactions ---
  
  getTransactions: async (userId: string): Promise<Transaction[]> => {
    const q = query(collection(db, "transactions"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
  },

  addTransaction: async (userId: string, t: Transaction) => {
    const { id, ...data } = t; 
    const payload = cleanPayload({ ...data, userId });
    await addDoc(collection(db, "transactions"), payload);
  },

  addTransactionsBatch: async (userId: string, txs: Transaction[]) => {
    const batch = writeBatch(db);
    txs.forEach(tx => {
      const { id, ...data } = tx;
      const ref = doc(collection(db, "transactions"));
      const payload = cleanPayload({ ...data, userId });
      batch.set(ref, payload);
    });
    await batch.commit();
  },

  updateTransaction: async (userId: string, t: Transaction) => {
    const { id, ...data } = t;
    const ref = doc(db, "transactions", id);
    const payload = cleanPayload(data);
    await updateDoc(ref, payload);
  },

  updateTransactionSeries: async (userId: string, groupId: string, baseTransaction: Transaction) => {
    const q = query(
      collection(db, "transactions"), 
      where("userId", "==", userId),
      where("installments.groupId", "==", groupId)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    const anchorIdx = baseTransaction.installments?.current || 1;
    const [ny, nm, nd] = baseTransaction.date.split('T')[0].split('-').map(Number);
    const newBaseDateObj = new Date(ny, nm - 1, nd, 12, 0, 0);

    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data() as Transaction;
      const currentIdx = data.installments?.current || 1;
      
      if (currentIdx >= anchorIdx) {
        const ref = doc(db, "transactions", docSnap.id);
        const monthOffset = currentIdx - anchorIdx;
        const computedDate = addMonths(newBaseDateObj, monthOffset);

        batch.update(ref, {
          description: baseTransaction.description,
          amount: baseTransaction.amount,
          category: baseTransaction.category,
          type: baseTransaction.type,
          cardId: baseTransaction.cardId || null,
          date: computedDate.toISOString()
        });
      }
    });

    await batch.commit();
  },

  deleteTransaction: async (userId: string, id: string) => {
    await deleteDoc(doc(db, "transactions", id));
  },

  deleteTransactionSeries: async (userId: string, groupId: string, currentInstallment: number) => {
    const q = query(
      collection(db, "transactions"), 
      where("userId", "==", userId),
      where("installments.groupId", "==", groupId)
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (data.installments && data.installments.current >= currentInstallment) {
        batch.delete(doc(db, "transactions", docSnap.id));
      }
    });

    await batch.commit();
  },

  toggleStatus: async (userId: string, t: Transaction) => {
    const newStatus = t.status === TransactionStatus.COMPLETED ? TransactionStatus.PENDING : TransactionStatus.COMPLETED;
    const ref = doc(db, "transactions", t.id);
    await updateDoc(ref, { status: newStatus });
  },

  batchUpdateStatus: async (userId: string, transactionIds: string[], newStatus: TransactionStatus) => {
    const batch = writeBatch(db);
    transactionIds.forEach(id => {
      const ref = doc(db, "transactions", id);
      batch.update(ref, { status: newStatus });
    });
    await batch.commit();
  },

  // --- Cards ---

  getCards: async (userId: string): Promise<CreditCard[]> => {
    const q = query(collection(db, "cards"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditCard));
  },

  addCard: async (userId: string, c: CreditCard) => {
    const { id, ...data } = c;
    const payload = cleanPayload({ ...data, userId });
    await addDoc(collection(db, "cards"), payload);
  },

  updateCard: async (userId: string, c: CreditCard) => {
    const { id, ...data } = c;
    const ref = doc(db, "cards", id);
    const payload = cleanPayload(data);
    await updateDoc(ref, payload);
  },

  deleteCard: async (userId: string, id: string) => {
    await deleteDoc(doc(db, "cards", id));
  },

  // --- Debts ---

  getDebts: async (userId: string): Promise<Debt[]> => {
    const q = query(collection(db, "debts"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt));
  },

  addDebt: async (userId: string, d: Debt) => {
    const { id, ...data } = d;
    const payload = cleanPayload({ ...data, userId });
    await addDoc(collection(db, "debts"), payload);
  },

  updateDebt: async (userId: string, d: Debt) => {
    const { id, ...data } = d;
    const ref = doc(db, "debts", id);
    const payload = cleanPayload(data);
    await updateDoc(ref, payload);
  },

  deleteDebt: async (userId: string, id: string) => {
    await deleteDoc(doc(db, "debts", id));
  },

  // --- Categories ---

  getCategories: async (userId: string): Promise<Category[]> => {
    const q = query(collection(db, "categories"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      // Seed default categories
      const batch = writeBatch(db);
      const seededCategories: Category[] = [];

      INCOME_CATEGORIES.forEach(name => {
        const ref = doc(collection(db, "categories"));
        const cat: Category = { id: ref.id, name, type: TransactionType.INCOME, userId, emoji: getEmojiForCategoryName(name) };
        batch.set(ref, { name, type: TransactionType.INCOME, userId, emoji: cat.emoji });
        seededCategories.push(cat);
      });

      EXPENSE_CATEGORIES.forEach(name => {
        const ref = doc(collection(db, "categories"));
        const cat: Category = { id: ref.id, name, type: TransactionType.EXPENSE, userId, emoji: getEmojiForCategoryName(name) };
        batch.set(ref, { name, type: TransactionType.EXPENSE, userId, emoji: cat.emoji });
        seededCategories.push(cat);
      });

      await batch.commit();
      return seededCategories;
    }
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  },

  addCategory: async (userId: string, c: Omit<Category, 'id' | 'userId'>) => {
    const ref = doc(collection(db, "categories"));
    const payload = cleanPayload({ ...c, userId });
    await addDoc(collection(db, "categories"), payload);
    return { id: ref.id, ...payload } as Category;
  },

  updateCategory: async (userId: string, categoryId: string, c: Partial<Category>) => {
    const ref = doc(db, "categories", categoryId);
    const payload = cleanPayload(c);
    await updateDoc(ref, payload);
  },

  deleteCategory: async (userId: string, categoryId: string) => {
    await deleteDoc(doc(db, "categories", categoryId));
  },

  updateCategoryAndTransactions: async (userId: string, categoryId: string, oldName: string, newName: string, newEmoji: string) => {
    const batch = writeBatch(db);
    const catRef = doc(db, "categories", categoryId);
    batch.update(catRef, { name: newName, emoji: newEmoji });

    const q = query(collection(db, "transactions"), where("userId", "==", userId), where("category", "==", oldName));
    const txSnapshot = await getDocs(q);
    txSnapshot.docs.forEach(docSnap => {
      batch.update(docSnap.ref, { category: newName });
    });

    await batch.commit();
  },

  // --- Budgets ---

  getBudgets: async (userId: string): Promise<Budget[]> => {
    const q = query(collection(db, "budgets"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));
  },

  saveBudget: async (userId: string, category: string, limit: number): Promise<void> => {
    const q = query(
      collection(db, "budgets"), 
      where("userId", "==", userId), 
      where("category", "==", category)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const budgetDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, "budgets", budgetDoc.id), { limit });
    } else {
      await addDoc(collection(db, "budgets"), { category, limit, userId });
    }
  },

  deleteBudget: async (userId: string, budgetId: string) => {
    await deleteDoc(doc(db, "budgets", budgetId));
  }
};