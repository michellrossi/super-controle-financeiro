export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  CARD_EXPENSE = 'CARD_EXPENSE'
}

export enum TransactionStatus {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING'
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: TransactionType;
  category: string;
  status: TransactionStatus;
  cardId?: string;
  groupId?: string; // Identificador para agrupar parcelas
  installmentNumber?: number;
  totalInstallments?: number;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
}

export const INCOME_CATEGORIES = [
  'Salário',
  'Investimentos',
  'Presente',
  'Outros'
];

export const EXPENSE_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Lazer',
  'Saúde',
  'Educação',
  'Moradia',
  'Vestuário',
  'Assinaturas',
  'Outros'
];
