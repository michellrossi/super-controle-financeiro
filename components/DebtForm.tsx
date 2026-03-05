import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Info, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Debt, DebtType, DebtFormat, InterestType, InterestSystem, DebtFrequency, 
  TransactionStatus, DebtInstallment 
} from '../types';
import { toDateString, parseLocalDate } from '../utils/date';
import { addMonths, addWeeks, addYears } from 'date-fns';

const CurrencyInput: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  required?: boolean;
  placeholder?: string;
}> = ({ label, value, onChange, required, placeholder }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numberValue = parseInt(rawValue || '0', 10) / 100;
    onChange(numberValue);
  };

  const formattedValue = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
        <input
          type="text"
          required={required}
          value={formattedValue}
          onChange={handleChange}
          placeholder={placeholder || '0,00'}
          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-slate-700"
        />
      </div>
    </div>
  );
};

interface DebtFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (debt: Debt) => void;
  initialData?: Debt | null;
}

export const DebtForm: React.FC<DebtFormProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Debt & { installmentAmount?: number }>>({
    name: '',
    creditor: '',
    totalOriginalAmount: 0,
    installmentsCount: 1,
    installmentAmount: 0,
    interestRate: 0,
    interestType: InterestType.COMPOUND,
    interestSystem: InterestSystem.PRICE,
    firstInstallmentDate: toDateString(new Date()),
    frequency: DebtFrequency.MONTHLY,
    format: DebtFormat.FIXED_INSTALLMENTS,
    type: DebtType.PERSONAL_LOAN,
    observations: '',
    installments: []
  });

  const [paidBefore, setPaidBefore] = useState(0);

  useEffect(() => {
    if (initialData) {
      const firstInstallmentAmount = initialData.installmentAmount || initialData.installments[0]?.amount || 0;
      setFormData({ ...initialData, installmentAmount: firstInstallmentAmount });
      const paid = initialData.installments.filter(i => i.status === TransactionStatus.COMPLETED).length;
      setPaidBefore(paid);
      setStep(3); // Go straight to details if editing
    } else {
      setFormData({
        name: '',
        creditor: '',
        totalOriginalAmount: 0,
        installmentsCount: 1,
        installmentAmount: 0,
        interestRate: 0,
        interestType: InterestType.COMPOUND,
        interestSystem: InterestSystem.PRICE,
        firstInstallmentDate: toDateString(new Date()),
        frequency: DebtFrequency.MONTHLY,
        format: DebtFormat.FIXED_INSTALLMENTS,
        type: DebtType.PERSONAL_LOAN,
        observations: '',
        installments: []
      });
      setPaidBefore(0);
      setStep(1);
    }
  }, [initialData, isOpen]);

  const calculateInstallments = () => {
    const installments: DebtInstallment[] = [];
    const count = formData.installmentsCount || 1;
    const rate = (formData.interestRate || 0) / 100;
    const totalPrincipal = formData.totalOriginalAmount || 0;
    const startDate = parseLocalDate(formData.firstInstallmentDate || toDateString(new Date()));

    if (formData.format === DebtFormat.FIXED_INSTALLMENTS) {
      // Fixed installments: user provides the amount
      const amount = formData.installmentAmount || (totalPrincipal / count);
      const totalAmount = amount * count;
      const totalInterest = Math.max(0, totalAmount - totalPrincipal);
      const interestPerInstallment = totalInterest / count;
      const principalPerInstallment = totalPrincipal / count;

      for (let i = 0; i < count; i++) {
        let dueDate = addMonths(startDate, i);
        if (formData.frequency === DebtFrequency.WEEKLY) dueDate = addWeeks(startDate, i);
        if (formData.frequency === DebtFrequency.YEARLY) dueDate = addYears(startDate, i);

        installments.push({
          id: crypto.randomUUID(),
          number: i + 1,
          dueDate: toDateString(dueDate),
          amount: parseFloat(amount.toFixed(2)),
          principal: parseFloat(principalPerInstallment.toFixed(2)),
          interest: parseFloat(interestPerInstallment.toFixed(2)),
          status: i < paidBefore ? TransactionStatus.COMPLETED : TransactionStatus.PENDING,
          paidDate: i < paidBefore ? toDateString(dueDate) : null
        });
      }
    } else {
      // With Interest
      if (formData.interestSystem === InterestSystem.PRICE) {
        // Price System (Fixed Installments with interest)
        // PMT = PV * [i * (1 + i)^n] / [(1 + i)^n - 1]
        const pmt = rate === 0 
          ? totalPrincipal / count 
          : totalPrincipal * (rate * Math.pow(1 + rate, count)) / (Math.pow(1 + rate, count) - 1);
        
        let remainingBalance = totalPrincipal;

        for (let i = 0; i < count; i++) {
          const interest = remainingBalance * rate;
          let principal = pmt - interest;
          
          // Adjust last installment to avoid rounding errors
          if (i === count - 1) {
            principal = remainingBalance;
          }
          
          const currentAmount = principal + interest;
          remainingBalance -= principal;

          let dueDate = addMonths(startDate, i);
          if (formData.frequency === DebtFrequency.WEEKLY) dueDate = addWeeks(startDate, i);
          if (formData.frequency === DebtFrequency.YEARLY) dueDate = addYears(startDate, i);

          installments.push({
            id: crypto.randomUUID(),
            number: i + 1,
            dueDate: toDateString(dueDate),
            amount: parseFloat(currentAmount.toFixed(2)),
            principal: parseFloat(principal.toFixed(2)),
            interest: parseFloat(interest.toFixed(2)),
            status: i < paidBefore ? TransactionStatus.COMPLETED : TransactionStatus.PENDING,
            paidDate: i < paidBefore ? toDateString(dueDate) : null
          });
        }
      } else {
        // SAC System (Decreasing Installments)
        // Principal = PV / n
        const principalPerMonth = totalPrincipal / count;
        let remainingBalance = totalPrincipal;

        for (let i = 0; i < count; i++) {
          const interest = remainingBalance * rate;
          
          // Adjust last installment principal to avoid rounding errors
          const currentPrincipal = i === count - 1 ? remainingBalance : principalPerMonth;
          const amount = currentPrincipal + interest;
          remainingBalance -= currentPrincipal;

          let dueDate = addMonths(startDate, i);
          if (formData.frequency === DebtFrequency.WEEKLY) dueDate = addWeeks(startDate, i);
          if (formData.frequency === DebtFrequency.YEARLY) dueDate = addYears(startDate, i);

          installments.push({
            id: crypto.randomUUID(),
            number: i + 1,
            dueDate: toDateString(dueDate),
            amount: parseFloat(amount.toFixed(2)),
            principal: parseFloat(currentPrincipal.toFixed(2)),
            interest: parseFloat(interest.toFixed(2)),
            status: i < paidBefore ? TransactionStatus.COMPLETED : TransactionStatus.PENDING,
            paidDate: i < paidBefore ? toDateString(dueDate) : null
          });
        }
      }
    }
    return installments;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const installments = calculateInstallments();
    onSubmit({
      ...formData,
      id: formData.id || crypto.randomUUID(),
      installments
    } as Debt);
    onClose();
  };

  if (!isOpen) return null;
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? 'Editar Dívida' : 'Nova Dívida'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-center font-bold text-slate-700 text-lg">Tipo da Dívida</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.values(DebtType).map((type) => (
                    <button
                      key={type}
                      onClick={() => { setFormData({ ...formData, type }); setStep(2); }}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center ${
                        formData.type === type ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 hover:border-emerald-200 text-slate-600'
                      }`}
                    >
                      <span className="text-2xl">{getDebtIcon(type)}</span>
                      <span className="text-xs font-bold">{type}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-center font-bold text-slate-700 text-lg">Formato da Dívida</h3>
                <div className="space-y-4">
                  <button
                    onClick={() => { setFormData({ ...formData, format: DebtFormat.FIXED_INSTALLMENTS }); setStep(3); }}
                    className={`w-full p-6 rounded-2xl border-2 transition-all text-left flex items-start gap-4 ${
                      formData.format === DebtFormat.FIXED_INSTALLMENTS ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'
                    }`}
                  >
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">💵</div>
                    <div>
                      <h4 className="font-bold text-slate-800">Parcelas Fixas</h4>
                      <p className="text-xs text-slate-500">Sei o valor de cada parcela (ex: 12x de R$ 500)</p>
                    </div>
                  </button>

                  <button
                    onClick={() => { setFormData({ ...formData, format: DebtFormat.WITH_INTEREST }); setStep(3); }}
                    className={`w-full p-6 rounded-2xl border-2 transition-all text-left flex items-start gap-4 ${
                      formData.format === DebtFormat.WITH_INTEREST ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'
                    }`}
                  >
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">📊</div>
                    <div>
                      <h4 className="font-bold text-slate-800">Com Taxa de Juros</h4>
                      <p className="text-xs text-slate-500">Sei a taxa de juros e quero calcular as parcelas</p>
                    </div>
                  </button>
                </div>
                <div className="flex justify-center">
                  <button onClick={() => setStep(1)} className="text-slate-400 text-sm font-bold flex items-center gap-1">
                    <ChevronLeft size={16} /> Voltar
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.form 
                key="step3"
                onSubmit={handleSubmit}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da dívida *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Financiamento do carro"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Credor</label>
                  <input 
                    type="text" 
                    value={formData.creditor}
                    onChange={e => setFormData({ ...formData, creditor: e.target.value })}
                    placeholder="Ex: Banco Itaú"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CurrencyInput 
                    label="Valor total original *"
                    value={formData.totalOriginalAmount || 0}
                    onChange={val => setFormData({ ...formData, totalOriginalAmount: val })}
                    required
                  />
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nº de parcelas *</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      value={formData.installmentsCount || ''}
                      onChange={e => setFormData({ ...formData, installmentsCount: parseInt(e.target.value) })}
                      placeholder="Ex: 12"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {formData.format === DebtFormat.FIXED_INSTALLMENTS && (
                  <div className="space-y-1">
                    <CurrencyInput 
                      label="Valor da parcela *"
                      value={formData.installmentAmount || 0}
                      onChange={val => setFormData({ ...formData, installmentAmount: val })}
                      required
                    />
                    {formData.totalOriginalAmount && formData.installmentsCount && formData.installmentAmount ? (
                      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Total a pagar:</span>
                          <span className="font-bold text-slate-700">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.installmentAmount * formData.installmentsCount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-slate-500">Total de juros:</span>
                          <span className="font-bold text-rose-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((formData.installmentAmount * formData.installmentsCount) - formData.totalOriginalAmount)}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {formData.format === DebtFormat.WITH_INTEREST && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="flex items-center gap-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Taxa de juros (%) <HelpCircle size={12} className="text-slate-300" />
                        </label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(formData.interestRate || 0)}
                            onChange={e => {
                              const raw = e.target.value.replace(/\D/g, '');
                              setFormData({ ...formData, interestRate: parseInt(raw || '0') / 100 });
                            }}
                            placeholder="2,50"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-slate-700"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo da taxa</label>
                        <select 
                          value={formData.frequency}
                          onChange={e => setFormData({ ...formData, frequency: e.target.value as DebtFrequency })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
                        >
                          {Object.values(DebtFrequency).map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="flex items-center gap-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Tipo de juros <HelpCircle size={12} className="text-slate-300" />
                        </label>
                        <select 
                          value={formData.interestType}
                          onChange={e => setFormData({ ...formData, interestType: e.target.value as InterestType })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
                        >
                          {Object.values(InterestType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="flex items-center gap-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Sistema <HelpCircle size={12} className="text-slate-300" />
                        </label>
                        <select 
                          value={formData.interestSystem}
                          onChange={e => setFormData({ ...formData, interestSystem: e.target.value as InterestSystem })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
                        >
                          {Object.values(InterestSystem).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data da 1ª parcela *</label>
                    <input 
                      type="date" 
                      required
                      value={formData.firstInstallmentDate}
                      onChange={e => setFormData({ ...formData, firstInstallmentDate: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Frequência</label>
                    <select 
                      value={formData.frequency}
                      onChange={e => setFormData({ ...formData, frequency: e.target.value as DebtFrequency })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
                    >
                      {Object.values(DebtFrequency).map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parcelas já pagas antes do cadastro</label>
                  <input 
                    type="number" 
                    min="0"
                    max={formData.installmentsCount}
                    value={paidBefore}
                    onChange={e => setPaidBefore(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <textarea 
                    value={formData.observations}
                    onChange={e => setFormData({ ...formData, observations: e.target.value })}
                    placeholder="Anotações opcionais..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  {!initialData && (
                    <button 
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all"
                    >
                      Voltar
                    </button>
                  )}
                  <button 
                    type="submit"
                    className="flex-[2] bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    {initialData ? 'Salvar Alterações' : 'Criar Dívida'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

const getDebtIcon = (type: DebtType) => {
  switch (type) {
    case DebtType.PERSONAL_LOAN: return '💰';
    case DebtType.FINANCING: return '🏠';
    case DebtType.CONSORTIUM: return '🤝';
    case DebtType.INSTALLMENT_CARD: return '💳';
    case DebtType.INFORMAL_DEBT: return '☝️';
    default: return '📄';
  }
};
