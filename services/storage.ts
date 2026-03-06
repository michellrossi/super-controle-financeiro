import { Transaction, CreditCard, TransactionType, TransactionStatus } from '../types';

export const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export const getInvoiceMonth = (date: Date, closingDay: number): Date => {
  const d = new Date(date);
  // Se o dia da compra for maior ou igual ao dia de fechamento, cai na próxima fatura
  if (d.getDate() >= closingDay) {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
};

const STORAGE_KEYS = {
  TRANSACTIONS: 'financas_2026_transactions',
  CARDS: 'financas_2026_cards'
};

export const saveTransactions = (transactions: Transaction[]) => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
};

export const loadTransactions = (): Transaction[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  return data ? JSON.parse(data) : [];
};

export const saveCards = (cards: CreditCard[]) => {
  localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
};

export const loadCards = (): CreditCard[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CARDS);
  return data ? JSON.parse(data) : [];
};
