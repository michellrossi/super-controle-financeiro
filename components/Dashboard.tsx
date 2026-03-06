import React from 'react';
import { Transaction, CreditCard, TransactionType, TransactionStatus, FilterState } from '../types';
import { formatCurrency, getInvoiceMonth } from '../services/storage';
import { TrendingUp, TrendingDown, Wallet, CreditCard as CreditCardIcon } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, LabelList
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
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, allTransactions, filter, cards, onViewDetails }) => {
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

  // 2. Dados do Gráfico de Histórico (Inalterado)
  const historyData = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const monthIncome = allTransactions
        .filter(t => t.type === TransactionType.INCOME && isSameMonth(new Date(t.date), d))
        .reduce((sum, t) => sum + t.amount, 0);

    let monthInvoiceTotal = 0;
    allTransactions
        .filter(t => t.type === TransactionType.CARD_EXPENSE && t.cardId)
        .forEach(t => {
            const card = cards.find(c => c.id === t.cardId);
            if (card) {
                const invoiceDate = getInvoiceMonth(new Date(t.date), card.closingDay);
                if (isSameMonth(invoiceDate, d)) monthInvoiceTotal += t.amount;
            }
        });

    const monthStandardExpense = allTransactions
        .filter(t => t.type === TransactionType.EXPENSE && isSameMonth(new Date(t.date), d))
        .reduce((sum, t) => sum + t.amount, 0);

    return {
        name: format(d, 'MMM', { locale: ptBR }).toUpperCase(),
        Entradas: monthIncome,
        Saidas: monthStandardExpense + monthInvoiceTotal
    };
  });

  // 3. Dados por Categoria (Novo Formato de Barras)
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Receitas Recebidas" value={income - incomePending} sub={`Pendente: ${formatCurrency(incomePending)}`} icon={TrendingUp} color="text-emerald-500" bg="bg-emerald-50" borderColor="border-emerald-100" onClick={() => onViewDetails('INCOME')} />
        <StatCard title="Despesas Pagas" value={expenses - expensePending} sub={`Pendente: ${formatCurrency(expensePending)}`} icon={TrendingDown} color="text-rose-500" bg="bg-rose-50" borderColor="border-rose-100" onClick={() => onViewDetails('EXPENSE')} />
        <StatCard title="Saldo (Realizado)" value={(income - incomePending) - (expenses - expensePending)} sub={`Pendente: ${formatCurrency(incomePending - expensePending)}`} icon={Wallet} color="text-blue-500" bg="bg-blue-50" borderColor="border-blue-100" onClick={() => onViewDetails('BALANCE')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Histórico */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-w-0">
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
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(value: number) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="Entradas" stroke="#10B981" fillOpacity={1} fill="url(#colorInc)" strokeWidth={3} dot={{r:4, fill:'#10B981'}} />
                  <Area type="monotone" dataKey="Saidas" stroke="#F43F5E" fillOpacity={1} fill="url(#colorExp)" strokeWidth={3} dot={{r:4, fill:'#F43F5E'}} />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* LISTA DE CATEGORIAS (IGUAL À IMAGEM) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-w-0">
           <h3 className="text-lg font-bold text-slate-800 mb-6">Gastos por Categoria</h3>
           <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {categoryData.length > 0 ? (
                <div className="space-y-6">
                  {categoryData.map((item, idx) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <CategoryIcon category={item.name} size={18} />
                          <span className="font-semibold text-slate-700">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900">{formatCurrency(item.value)}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {item.percent}%
                          </span>
                        </div>
                      </div>
                      {/* Barra de Progresso */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${item.percent}%`, 
                            backgroundColor: COLORS[idx % COLORS.length] 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados no período</div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};