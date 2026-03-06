import React from 'react';
import { Transaction, CreditCard, TransactionType, TransactionStatus, FilterState } from '../types';
import { formatCurrency, getInvoiceMonth } from '../services/storage';
import { TrendingUp, TrendingDown, Wallet, CreditCard as CreditCardIcon } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CategoryIcon } from './CategoryIcon';

interface DashboardProps {
  transactions: Transaction[]; // These are Aggregated (Standard + Virtual Invoices) for current month summary
  allTransactions: Transaction[]; // RAW transactions for history calculation
  cards: CreditCard[];
  filter: FilterState;
  onViewDetails: (type: 'INCOME' | 'EXPENSE' | 'BALANCE') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, allTransactions, filter, cards, onViewDetails }) => {
  const { month, year } = filter;
  
  // 1. Calculate Summary (Using the aggregated list passed for the Current Month)
  const income = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);

  const expenses = transactions
    .filter(t => t.type !== TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);
  
  const balance = income - expenses;

  // Pending vs Paid
  const incomePending = transactions
    .filter(t => t.type === TransactionType.INCOME && t.status === TransactionStatus.PENDING)
    .reduce((acc, t) => acc + t.amount, 0);
  
  const expensePending = transactions
    .filter(t => t.type !== TransactionType.INCOME && t.status === TransactionStatus.PENDING)
    .reduce((acc, t) => acc + t.amount, 0);


  // 2. Chart Data: Semester History (Income vs Expenses+InvoiceTotals)
  const historyData = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);

    // Calculate Incomes
    const monthIncome = allTransactions
        .filter(t => t.type === TransactionType.INCOME && isSameMonth(new Date(t.date), d))
        .reduce((sum, t) => sum + t.amount, 0);

    // Calculate Standard Expenses (Non-Card)
    const monthStandardExpense = allTransactions
        .filter(t => t.type === TransactionType.EXPENSE && isSameMonth(new Date(t.date), d))
        .reduce((sum, t) => sum + t.amount, 0);

    // Calculate Invoice Totals for this month
    let monthInvoiceTotal = 0;
    allTransactions
        .filter(t => t.type === TransactionType.CARD_EXPENSE && t.cardId)
        .forEach(t => {
            const card = cards.find(c => c.id === t.cardId);
            if (card) {
                const invoiceDate = getInvoiceMonth(new Date(t.date), card.closingDay);
                if (isSameMonth(invoiceDate, d)) {
                    monthInvoiceTotal += t.amount;
                }
            }
        });

    return {
        name: format(d, 'MMM', { locale: ptBR }).toUpperCase(),
        Entradas: monthIncome,
        Saidas: monthStandardExpense + monthInvoiceTotal
    };
  });

  // 3. Chart Data: Card Evolution (Last 6 Months)
  const cardEvolutionData = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(new Date(), 5 - i);
    
    let totalInvoice = 0;
    allTransactions
        .filter(t => t.type === TransactionType.CARD_EXPENSE && t.cardId)
        .forEach(t => {
            const card = cards.find(c => c.id === t.cardId);
            if (card) {
                const invoiceDate = getInvoiceMonth(new Date(t.date), card.closingDay);
                if (isSameMonth(invoiceDate, d)) {
                    totalInvoice += t.amount;
                }
            }
        });

    return {
        name: format(d, 'MMM', { locale: ptBR }).toUpperCase(),
        Fatura: totalInvoice
    };
  });


  // 4. Chart Data: Categories (Donut) - Current Month
  const categoryMap = new Map<string, number>();
  transactions
    .filter(t => t.type !== TransactionType.INCOME)
    .forEach(t => {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
    });
  
  const categoryData = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a,b) => b.value - a.value)
    .slice(0, 5);

  const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#F43F5E'];


  const StatCard = ({ title, value, sub, icon: Icon, color, bg, borderColor, onClick }: any) => (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group border-2 ${borderColor}`}
    >
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
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Receitas Recebidas" 
          value={income - incomePending} 
          sub={`Pendente: ${formatCurrency(incomePending)}`}
          icon={TrendingUp} 
          color="text-emerald-500" 
          bg="bg-emerald-50" 
          borderColor="border-emerald-100"
          onClick={() => onViewDetails('INCOME')}
        />
        <StatCard 
          title="Despesas Pagas" 
          value={expenses - expensePending} 
          sub={`Pendente: ${formatCurrency(expensePending)}`}
          icon={TrendingDown} 
          color="text-rose-500" 
          bg="bg-rose-50" 
          borderColor="border-rose-100"
          onClick={() => onViewDetails('EXPENSE')}
        />
        <StatCard 
          title="Saldo (Realizado)" 
          value={(income - incomePending) - (expenses - expensePending)} 
          sub={`Pendente: ${formatCurrency(incomePending - expensePending)}`}
          icon={Wallet} 
          color="text-blue-500" 
          bg="bg-blue-50" 
          borderColor="border-blue-100"
          onClick={() => onViewDetails('BALANCE')}
        />
      </div>

      {/* Row 1: Income vs Expenses History + Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* History Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-w-0">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-slate-800">Entradas vs Saídas (6 Meses)</h3>
           </div>
           <div className="h-72 w-full min-w-0">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="Entradas" stroke="#10B981" fillOpacity={1} fill="url(#colorInc)" strokeWidth={3} dot={{r:4, fill:'#10B981', strokeWidth:0}} activeDot={{r:6}} />
                  <Area type="monotone" dataKey="Saidas" stroke="#F43F5E" fillOpacity={1} fill="url(#colorExp)" strokeWidth={3} dot={{r:4, fill:'#F43F5E', strokeWidth:0}} activeDot={{r:6}} />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Categories */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-w-0">
           <h3 className="text-lg font-bold text-slate-800 mb-4">Gastos do Mês (Categorias)</h3>
           <div className="w-full h-[250px]"> 
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="80%"
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
                )}
           </div>
           {/* Legend */}
           <div className="mt-4 grid grid-cols-2 gap-2">
               {categoryData.map((item, idx) => (
                 <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <CategoryIcon category={item.name} size={12} className="text-slate-400" />
                        <span className="text-xs text-slate-500 truncate">{item.name}</span>
                    </div>
                 </div>
               ))}
            </div>
        </div>
      </div>

      {/* Row 2: Card Evolution */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-w-0 w-full">
         <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600"><CreditCardIcon size={18} /></div>
                <h3 className="text-lg font-bold text-slate-800">Evolução de Faturas de Cartão</h3>
            </div>
         </div>
         <div className="h-64 w-full min-w-0">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={cardEvolutionData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="Fatura" fill="#6366f1" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
         </div>
      </div>

    </div>
  );
};
