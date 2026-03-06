import { Transaction, CreditCard, TransactionType, TransactionStatus, User, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../types';
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
import { addMonths } from 'date-fns';

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

// ✅ CORRIGIDO: Função agora retorna sempre o primeiro dia do mês para comparação consistente
export const getInvoiceMonth = (date: Date, closingDay: number): Date => {
  const d = new Date(date);
  if (d.getDate() > closingDay) {
    // Retornar o primeiro dia do próximo mês para comparação consistente
    return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  // Retornar o primeiro dia do mês atual
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

// ✅ NOVA FUNÇÃO: Calcula o limite disponível real do cartão
/**
 * Calcula o limite disponível real do cartão considerando:
 * - Todas as parcelas futuras comprometidas (parcelamentos)
 * - Compras únicas não parceladas
 */
export const calculateAvailableLimit = (
  card: CreditCard, 
  allTransactions: Transaction[]
): number => {
  // Agrupar parcelamentos por groupId para evitar contagem duplicada
  const installmentGroups = new Map<string, {
    amount: number,
    current: number,
    total: number
  }>();

  // Coletar informações de todas as parcelas
  allTransactions
    .filter(t => 
      t.type === TransactionType.CARD_EXPENSE && 
      t.cardId === card.id &&
      t.installments
    )
    .forEach(t => {
      if (t.installments) {
        const existing = installmentGroups.get(t.installments.groupId);
        
        // Guardar sempre a primeira parcela (current = 1) que tem todas as informações
        if (!existing || t.installments.current === 1) {
          installmentGroups.set(t.installments.groupId, {
            amount: t.amount,
            current: t.installments.current,
            total: t.installments.total
          });
        }
      }
    });

  // Calcular total comprometido por parcelamentos
  let totalCommitted = 0;
  installmentGroups.forEach(group => {
    // Total da compra = valor da parcela * número total de parcelas
    const purchaseTotal = group.amount * group.total;
    totalCommitted += purchaseTotal;
  });

  // Adicionar compras únicas (não parceladas) 
  // Consideramos apenas compras futuras e do mês atual
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const singlePurchases = allTransactions
    .filter(t => 
      t.type === TransactionType.CARD_EXPENSE && 
      t.cardId === card.id &&
      !t.installments && // Sem parcelamento
      new Date(t.date) >= currentMonthStart // Do mês atual em diante
    )
    .reduce((acc, t) => acc + t.amount, 0);

  totalCommitted += singlePurchases;

  return Math.max(0, card.limit - totalCommitted);
};

// Helper to remove undefined keys which Firestore rejects
const cleanPayload = (data: any) => {
  return Object.entries(data).reduce((acc, [k, v]) => {
    if (v !== undefined) {
      acc[k] = v;
    }
    return acc;
  }, {} as any);
};

export const generateInstallments = (baseTransaction: Transaction, totalInstallments: number, amountType: 'total' | 'installment' = 'installment'): Transaction[] => {
  // Fix: Parse input date (YYYY-MM-DD string) explicitly to local time noon to avoid timezone rollovers
  const [y, m, d] = baseTransaction.date.split('T')[0].split('-').map(Number);
  const baseDateObj = new Date(y, m - 1, d, 12, 0, 0);

  if (totalInstallments <= 1) {
    return [{
        ...baseTransaction,
        date: baseDateObj.toISOString()
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
      date: newDateObj.toISOString(), 
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

  // Batch Update for Installments
  updateTransactionSeries: async (userId: string, groupId: string, baseTransaction: Transaction, startFromDate: string) => {
    // 1. Find all transactions in the group belonging to user
    const q = query(
      collection(db, "transactions"), 
      where("userId", "==", userId),
      where("installments.groupId", "==", groupId)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    // This is the date of the SPECIFIC transaction being edited (the "start" of our update window)
    const targetDateStr = startFromDate.split('T')[0];
    
    // Parse the NEW date from the form (baseTransaction.date)
    const [ny, nm, nd] = baseTransaction.date.split('T')[0].split('-').map(Number);
    const newBaseDateObj = new Date(ny, nm - 1, nd, 12, 0, 0);

    // Get the installment index of the item being edited to calculate offsets
    // We need to find the doc that corresponds to startFromDate (or the ID, but we passed date)
    // Actually, relying on date string comparison can be tricky. Ideally we pass the edited ID.
    // However, assuming logic: We update everything where installment.current >= edited.installment.current
    
    // Let's first map all docs to memory to sort and find the pivot
    const allDocs = snapshot.docs.map(d => ({ id: d.id, data: d.data() as Transaction }));
    const sortedDocs = allDocs.sort((a, b) => (a.data.installments?.current || 0) - (b.data.installments?.current || 0));

    // Find the current installment index of the transaction that triggered the update
    // We can identify it by matching the OLD date (targetDateStr) roughly, 
    // BUT since we don't have the old date passed explicitly in a robust way if it changed, 
    // we rely on the logic: The user clicked "Update Series" from a specific transaction.
    // The "startFromDate" param passed is the OLD date of that transaction.
    
    // Better approach: Calculate offsets based on installment index relative to the NEW base date.
    // Use the `baseTransaction.installments.current` as the anchor.
    const anchorIndex = baseTransaction.installments?.current || 1;

    sortedDocs.forEach(docItem => {
        const currentIdx = docItem.data.installments?.current || 1;
        
        // Only update if this installment is equal to or after the one being edited
        if (currentIdx >= anchorIndex) {
            const ref = doc(db, "transactions", docItem.id);
            
            // Calculate new date for this specific installment
            // Offset = currentIdx - anchorIndex (0 for the edited one, 1 for next, etc)
            const monthOffset = currentIdx - anchorIndex;
            const computedDate = addMonths(newBaseDateObj, monthOffset);

            batch.update(ref, {
                description: baseTransaction.description,
                amount: baseTransaction.amount,
                category: baseTransaction.category,
                type: baseTransaction.type,
                cardId: baseTransaction.cardId || null,
                date: computedDate.toISOString() // Update date!
                // Don't update installment numbers/ids
            });
        }
    });

    await batch.commit();
  },

  deleteTransaction: async (userId: string, id: string) => {
    await deleteDoc(doc(db, "transactions", id));
  },

  // Batch Delete for Installments
  deleteTransactionSeries: async (userId: string, groupId: string, startFromDate: string) => {
     const q = query(
      collection(db, "transactions"), 
      where("userId", "==", userId),
      where("installments.groupId", "==", groupId)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    const targetDate = new Date(startFromDate);

    snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const itemDate = new Date(data.date);
        
        // Delete if date is equal or after target
        // Note: Compare timestamps or ISO strings to avoid timezone drift issues
        // Simpler: Delete where installment.current >= current
        if (itemDate >= targetDate) {
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

  // Batch toggle status (used for Invoice Payment)
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
  }
};