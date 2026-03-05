
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

export type ViewState = 'DASHBOARD' | 'INCOMES' | 'EXPENSES' | 'CARDS' | 'DEBTS';

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
  'Compras',
  'Doações e Ofertas',
  'Educação',
  'Estudo', 
  'Farmácia',
  'Ifood',
  'Impostos',
  'Investimento', 
  'Lazer', 
  'Lucas', 
  'Mercado', 
  'Moradia',
  'Outros',
  'Pet',
  'Pessoais', 
  'Presente', 
  'Saúde', 
  'Serviços',
  'Transporte', 
  'Viagem',
  'Viagens',
  'Vestuário'
].sort();

export enum DebtType {
  PERSONAL_LOAN = 'Empréstimo Pessoal',
  INSTALLMENT_CARD = 'Cartão Parcelado',
  FINANCING = 'Financiamento',
  CONSORTIUM = 'Consórcio',
  INFORMAL_DEBT = 'Dívida Informal',
  OTHER = 'Outro'
}

export enum DebtFormat {
  FIXED_INSTALLMENTS = 'Parcelas Fixas',
  WITH_INTEREST = 'Com Taxa de Juros'
}

export enum InterestType {
  SIMPLE = 'Simples',
  COMPOUND = 'Composto'
}

export enum InterestSystem {
  PRICE = 'Price (parcela fixa)',
  SAC = 'SAC (parcela decrescente)'
}

export enum DebtFrequency {
  MONTHLY = 'Mensal',
  WEEKLY = 'Semanal',
  BIWEEKLY = 'Quinzenal',
  YEARLY = 'Anual'
}

export interface DebtInstallment {
  id: string;
  number: number;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
  status: TransactionStatus;
  paidDate?: string;
  transactionId?: string;
}

export interface Debt {
  id: string;
  name: string;
  creditor?: string;
  totalOriginalAmount: number;
  installmentsCount: number;
  interestRate?: number;
  interestType?: InterestType;
  interestSystem?: InterestSystem;
  firstInstallmentDate: string;
  frequency: DebtFrequency;
  format: DebtFormat;
  type: DebtType;
  wallet?: string;
  observations?: string;
  installments: DebtInstallment[];
}
