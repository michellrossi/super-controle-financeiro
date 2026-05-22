import React from 'react';
import { Transaction, CreditCard, TransactionType, TransactionStatus, FilterState, Budget } from '../types';
import { formatCurrency, getInvoiceMonth } from '../services/storage';
import { parseLocalDate } from '../utils/date';
import { TrendingUp, TrendingDown, Wallet, CreditCard as CreditCardIcon, Sparkles } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar
} from 'recharts';
import { format, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CategoryIcon } from './CategoryIcon';

interface DashboardProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  cards: CreditCard[];
  filter: FilterState;
  onViewDetails: (type: 'INCOME' | 'EXPENSE' | 'BALANCE') => void;
  budgets: Budget[];
  onSaveBudget: (category: string, limit: number) => Promise<void>;
  onCategoryClick: (categoryName: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  allTransactions, 
  filter, 
  cards, 
  onViewDetails,
  budgets,
  onSaveBudget,
  onCategoryClick
}) => {
  const handleSetBudgetPrompt = async (categoryName: string, currentLimit?: number) => {
    const res = window.prompt(`Defina o limite mensal de gastos para a categoria "${categoryName}":`, currentLimit ? currentLimit.toString() : '');
    if (res === null) return;
    const limitNum = parseFloat(res);
    if (isNaN(limitNum) || limitNum <= 0) {
      alert("Por favor, insira um valor numérico válido maior que zero.");
      return;
    }
    await onSaveBudget(categoryName, limitNum);
  };
  // 1. Cálculos de Sumário
  const income = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);

  const expenses = transactions
    .filter(t => t.type !== TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);

  const incomePending = transactions
    .filter(t => t.type === TransactionType.INCOME && t.status === TransactionStatus.PENDING)
    .reduce((acc, t) => acc + t.amount, 0);
  
  const expensePending = transactions
    .filter(t => t.type !== TransactionType.INCOME && t.status === TransactionStatus.PENDING)
    .reduce((acc, t) => acc + t.amount, 0);

  // 2. Gráfico: Histórico de 6 meses (Entradas vs Saídas)
  const historyData = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(new Date(), 5 - i);
    
    const monthIncome = allTransactions
        .filter(t => t.type === TransactionType.INCOME && isSameMonth(parseLocalDate(t.date), d))
        .reduce((sum, t) => sum + t.amount, 0);

    let monthInvoiceTotal = 0;
    allTransactions
        .filter(t => t.type === TransactionType.CARD_EXPENSE && t.cardId)
        .forEach(t => {
            const card = cards.find(c => c.id === t.cardId);
            if (card) {
                const invoiceDate = getInvoiceMonth(parseLocalDate(t.date), card.closingDay);
                if (isSameMonth(invoiceDate, d)) monthInvoiceTotal += t.amount;
            }
        });

    const monthStandardExpense = allTransactions
        .filter(t => t.type === TransactionType.EXPENSE && isSameMonth(parseLocalDate(t.date), d))
        .reduce((sum, t) => sum + t.amount, 0);

    return {
        name: format(d, 'MMM', { locale: ptBR }).toUpperCase(),
        Entradas: monthIncome,
        Saidas: monthStandardExpense + monthInvoiceTotal
    };
  });

  // 3. Gráfico: Evolução de Faturas de Cartão (Restaurado)
  const cardEvolutionData = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(new Date(), 5 - i);
    let totalInvoice = 0;
    allTransactions
        .filter(t => t.type === TransactionType.CARD_EXPENSE && t.cardId)
        .forEach(t => {
            const card = cards.find(c => c.id === t.cardId);
            if (card) {
                const invoiceDate = getInvoiceMonth(parseLocalDate(t.date), card.closingDay);
                if (isSameMonth(invoiceDate, d)) totalInvoice += t.amount;
            }
        });
    return {
        name: format(d, 'MMM', { locale: ptBR }).toUpperCase(),
        Fatura: totalInvoice
    };
  });

  // 4. Dados por Categoria (Lista com Barras horizontais)
  const categoryMap = new Map<string, number>();
  transactions
    .filter(t => t.type !== TransactionType.INCOME)
    .forEach(t => {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
    });
  
  const totalExpense = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0);
  const categoryData = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ 
      name, 
      value, 
      percent: totalExpense > 0 ? ((value / totalExpense) * 100).toFixed(1) : "0" 
    }))
    .sort((a,b) => b.value - a.value);

  const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#F43F5E', '#64748b'];

  const StatCard = ({ title, value, sub, icon: Icon, color, bg, borderColor, onClick }: any) => (
    <div onClick={onClick} className={`bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group border-2 ${borderColor}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
           <p className="text-sm font-semibold text-slate-500 group-hover:text-slate-700">{title}</p>
           <h3 className={`text-4xl font-extrabold mt-2 tracking-tight ${color}`}>{formatCurrency(value)}</h3>
        </div>
        <div className={`p-3 rounded-xl ${bg} group-hover:scale-110 transition-transform`}>
          <Icon className={color} size={28} />
        </div>
      </div>
      {sub && <p className="text-xs font-medium text-slate-400 bg-slate-50 inline-block px-2 py-1 rounded-md">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in w-full">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Receitas Recebidas" value={income - incomePending} sub={`Pendente: ${formatCurrency(incomePending)}`} icon={TrendingUp} color="text-emerald-500" bg="bg-emerald-50" borderColor="border-emerald-100" onClick={() => onViewDetails('INCOME')} />
        <StatCard title="Despesas Pagas" value={expenses - expensePending} sub={`Pendente: ${formatCurrency(expensePending)}`} icon={TrendingDown} color="text-rose-500" bg="bg-rose-50" borderColor="border-rose-100" onClick={() => onViewDetails('EXPENSE')} />
        <StatCard title="Saldo (Realizado)" value={(income - incomePending) - (expenses - expensePending)} sub={`Pendente: ${formatCurrency(incomePending - expensePending)}`} icon={Wallet} color="text-blue-500" bg="bg-blue-50" borderColor="border-blue-100" onClick={() => onViewDetails('BALANCE')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Coluna da Esquerda: Gráficos (Entradas vs Saídas & Evolução de Faturas) */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {/* Gráfico de Entradas vs Saídas */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-w-0">
             <h3 className="text-lg font-bold text-slate-800 mb-6">Entradas vs Saídas (6 Meses)</h3>
             <div className="h-72 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F43F5E" stopOpacity={0.1}/><stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(value: any) => formatCurrency(Number(value))} />
                    <Area type="monotone" dataKey="Entradas" stroke="#10B981" fillOpacity={1} fill="url(#colorInc)" strokeWidth={3} dot={{r:4, fill:'#10B981'}} />
                    <Area type="monotone" dataKey="Saidas" stroke="#F43F5E" fillOpacity={1} fill="url(#colorExp)" strokeWidth={3} dot={{r:4, fill:'#F43F5E'}} />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Evolução de Faturas (Recuperado) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-w-0">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600"><CreditCardIcon size={18} /></div>
                    <h3 className="text-lg font-bold text-slate-800">Evolução de Faturas de Cartão</h3>
                </div>
             </div>
             <div className="h-64 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={cardEvolutionData} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(value: any) => formatCurrency(Number(value))} />
                      <Bar dataKey="Fatura" fill="#6366f1" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Lista de Categorias (Estilo solicitado anteriormente) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-w-0 h-full">
           <h3 className="text-lg font-bold text-slate-800 mb-6">Gastos por Categoria</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {categoryData.length > 0 ? (
                <div className="space-y-6">
                  {categoryData.map((item, idx) => {
                    const budget = budgets.find(b => b.category === item.name);
                    const budgetLimit = budget ? budget.limit : 0;
                    const hasBudget = budgetLimit > 0;
                    const budgetPercent = hasBudget ? (item.value / budgetLimit) * 100 : 0;
                    
                    let progressBarColor = COLORS[idx % COLORS.length];
                    let badgeColor = "bg-slate-100 text-slate-500";
                    let widthPercent = item.percent;

                    if (hasBudget) {
                      widthPercent = Math.min(budgetPercent, 100).toFixed(1);
                      if (budgetPercent <= 80) {
                        progressBarColor = "#10B981"; // Emerald
                        badgeColor = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                      } else if (budgetPercent <= 100) {
                        progressBarColor = "#F59E0B"; // Amber
                        badgeColor = "bg-amber-50 text-amber-700 border border-amber-100";
                      } else {
                        progressBarColor = "#EF4444"; // Red
                        badgeColor = "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse";
                      }
                    }

                    return (
                      <div key={item.name} className="space-y-2 p-2 hover:bg-slate-50/80 rounded-xl transition-all duration-200">
                        <div 
                          className="space-y-2 cursor-pointer group/item" 
                          onClick={() => onCategoryClick(item.name)}
                          title="Clique para ver transações desta categoria"
                        >
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              <div className="transition-transform group-hover/item:scale-110 duration-200">
                                <CategoryIcon category={item.name} size={18} />
                              </div>
                              <span className="font-semibold text-slate-700 group-hover/item:text-indigo-600 transition-colors duration-200">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-900 group-hover/item:text-indigo-600 transition-colors duration-200">{formatCurrency(item.value)}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 transition-all duration-200">{item.percent}%</span>
                            </div>
                          </div>
                          
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500 group-hover/item:opacity-90" style={{ width: `${widthPercent}%`, backgroundColor: progressBarColor }} />
                          </div>
                        </div>

                        {/* Budget Info */}
                        <div className="flex justify-between items-center text-[11px] px-0.5">
                          {hasBudget ? (
                            <>
                              <span className="text-slate-400 font-medium">
                                Gasto de <span className="font-bold text-slate-500">{formatCurrency(budgetLimit)}</span>
                              </span>
                              <button 
                                onClick={() => handleSetBudgetPrompt(item.name, budgetLimit)}
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all hover:scale-105 ${badgeColor}`}
                              >
                                {budgetPercent > 100 ? 'Orçamento Estourado!' : `${budgetPercent.toFixed(0)}% consumido`}
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-400 font-medium">Sem orçamento</span>
                              <button
                                onClick={() => handleSetBudgetPrompt(item.name)}
                                className="text-[9px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 px-1.5 py-0.5 rounded transition-all"
                              >
                                + Definir Limite
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};