import { Transaction, CreditCard, TransactionType, TransactionStatus, User, INCOME_CATEGORIES, EXPENSE_CATEGORIES, Debt } from '../types';
import { parseLocalDate, toDateString } from '../utils/date';
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
  apiKey: "AIzaSyCe-tyLRk2tsV-_uVWhpUgIgF3b-Jz_F_0",
  authDomain: "controle-financeiro-definitivo.firebaseapp.com",
  projectId: "controle-financeiro-definitivo",
  storageBucket: "controle-financeiro-definitivo.firebasestorage.app",
  messagingSenderId: "659709682670",
  appId: "1:659709682670:web:e4898612b3f04948e9a4ff"
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

export const getInvoiceMonth = (date: Date, closingDay: number): Date => {
  const d = new Date(date);
  if (d.getDate() > closingDay) {
    d.setMonth(d.getMonth() + 1);
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
      
      const invoiceMonth = getInvoiceMonth(parseLocalDate(t.date), card.closingDay);
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
        date: toDateString(baseDateObj)
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
      date: toDateString(newDateObj), 
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
  }
};