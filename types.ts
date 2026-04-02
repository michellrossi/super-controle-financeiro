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
  isVirtual?: boolean;
  installments?: {
    current: number;
    total: number;
    groupId: string;
  };
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export type ViewState = 'DASHBOARD' | 'INCOMES' | 'EXPENSES' | 'CARDS' | 'DEBTS';

export interface FilterState {
  month: number;
  year: number;
  sortBy: 'date' | 'amount';
  sortOrder: 'asc' | 'desc';
}

export enum DebtType {
  CRÉDITO_PESSOAL = 'CRÉDITO_PESSOAL',
  FINANCIAMENTO = 'FINANCIAMENTO',
  CONSÓRCIO = 'CONSÓRCIO',
  DÍVIDAS_CARTÃO = 'DÍVIDAS_CARTÃO',
  DÍVIDAS_INFORMAIS = 'DÍVIDAS_INFORMAIS',
  OUTRAS = 'OUTRAS'
}

export enum DebtFormat {
  INSTALLMENTS = 'INSTALLMENTS',
  SINGLE_PAYMENT = 'SINGLE_PAYMENT',
  FIXED_INSTALLMENTS = 'FIXED_INSTALLMENTS',
  WITH_INTEREST = 'WITH_INTEREST'
}

export enum InterestType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  COMPOUND = 'COMPOUND'
}

export enum InterestSystem {
  SIMPLE = 'SIMPLE',
  COMPOUND = 'COMPOUND',
  NONE = 'NONE',
  PRICE = 'PRICE'
}

export enum DebtFrequency {
  MONTHLY = 'MONTHLY',
  WEEKLY = 'WEEKLY',
  YEARLY = 'YEARLY'
}

export interface DebtInstallment {
  id: string;
  number: number;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
  status: TransactionStatus;
  paidDate?: string | null;
}

export interface Debt {
  id: string;
  name: string;
  creditor: string;
  totalAmount: number;
  totalOriginalAmount: number;
  principal: number;
  interestTotal: number;
  interestRate: number;
  installmentsCount: number;
  startDate: string;
  firstInstallmentDate: string;
  type: DebtType;
  format: DebtFormat;
  interestType: InterestType;
  interestValue: number;
  interestSystem: InterestSystem;
  frequency: DebtFrequency;
  installments: DebtInstallment[];
  status: TransactionStatus;
  description?: string;
  observations?: string;
  installmentAmount?: number;
}

export const INCOME_CATEGORIES = [
  '13°',
  'Bonificação',
  'Empréstimo',
  'ISK',
  'Periculosidade',
  'Saldo Anterior',
  'Salário',
  'Vale Alimentação',
  'Vale Refeição'
];

export const EXPENSE_CATEGORIES = [
  'Alimentação',
  'Apê',
  'Assinatura',
  'Besteira',
  'Carro',
  'Comemoração',
  'Compra',
  'Doação e Oferta',
  'Educação',
  'Estudo',
  'Farmácia',
  'Ifood',
  'Imposto',
  'Investimento',
  'Lazer',
  'Lucas',
  'Mercado',
  'Moradia',
  'Pessoal',
  'Pet',
  'Presente',
  'Saúde',
  'Serviço',
  'Transporte',
  'Vestuário',
  'Viagem'
];
