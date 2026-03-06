
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  CARD_EXPENSE = 'CARD_EXPENSE'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE'
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO String YYYY-MM-DD
  type: TransactionType;
  category: string;
  status: TransactionStatus;
  cardId?: string; // If CARD_EXPENSE
  installments?: {
    current: number;
    total: number;
    groupId: string;
  };
  isVirtual?: boolean; // For aggregated invoice display
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export type ViewState = 'DASHBOARD' | 'INCOMES' | 'EXPENSES' | 'CARDS';

// Filter/Sort State
export interface FilterState {
  month: number; // 0-11
  year: number;
  sortBy: 'date' | 'amount';
  sortOrder: 'asc' | 'desc';
}

export const INCOME_CATEGORIES = [
  '13°', 
  'Bonificação', 
  'Empréstimo',
  'Investimentos',
  'ISK', 
  'Outros',
  'Periculosidade', 
  'Salário', 
  'Saldo Anterior', 
  'Vale Alimentação', 
  'Vale Refeição'
].sort();

export const EXPENSE_CATEGORIES = [
  'Alimentação', 
  'Apê', 
  'Assinaturas', 
  'Besteiras', 
  'Carro', 
  'Comemoração',
  'Educação',
  'Estudo', 
  'Farmácia',
  'Ifood',
  'Investimento', 
  'Lazer', 
  'Lucas', 
  'Mercado', 
  'Outros',
  'Pessoais', 
  'Presente', 
  'Saúde', 
  'Transporte', 
  'Viagem',
  'Vestuário'
].sort();
