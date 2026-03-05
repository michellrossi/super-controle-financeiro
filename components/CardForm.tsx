import React, { useState, useEffect } from 'react';
import { CreditCard } from '../types';
import { Modal } from './ui/Modal';

interface CardFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (card: CreditCard) => void;
  initialData?: CreditCard | null;
}

export const CardForm: React.FC<CardFormProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [color, setColor] = useState('bg-slate-800');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setLimit(initialData.limit.toString());
      setClosingDay(initialData.closingDay.toString());
      setDueDay(initialData.dueDay.toString());
      setColor(initialData.color);
    } else {
      setName('');
      setLimit('');
      setClosingDay('');
      setDueDay('');
      setColor('bg-slate-800');
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCard: CreditCard = {
      id: initialData?.id || crypto.randomUUID(),
      name,
      limit: parseFloat(limit),
      closingDay: parseInt(closingDay),
      dueDay: parseInt(dueDay),
      color
    };
    onSubmit(newCard);
    onClose();
  };

  const colors = [
    { label: 'Preto', val: 'bg-slate-800' },
    { label: 'Roxo', val: 'bg-purple-600' },
    { label: 'Azul', val: 'bg-blue-600' },
    { label: 'Verde', val: 'bg-emerald-600' },
    { label: 'Vermelho', val: 'bg-rose-600' },
    { label: 'Laranja', val: 'bg-orange-600' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Cartão' : 'Novo Cartão'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Nome do Cartão</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Nubank" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Limite</label>
          <input type="number" required value={limit} onChange={e => setLimit(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0.00" />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
             <label className="block text-xs font-semibold text-slate-500 mb-1">Dia Fechamento</label>
             <input type="number" max="31" min="1" required value={closingDay} onChange={e => setClosingDay(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="flex-1">
             <label className="block text-xs font-semibold text-slate-500 mb-1">Dia Vencimento</label>
             <input type="number" max="31" min="1" required value={dueDay} onChange={e => setDueDay(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">Cor do Cartão</label>
          <div className="flex gap-2 flex-wrap">
             {colors.map(c => (
               <button 
                 key={c.val} 
                 type="button" 
                 onClick={() => setColor(c.val)}
                 className={`w-8 h-8 rounded-full ${c.val} ${color === c.val ? 'ring-2 ring-offset-2 ring-emerald-500' : ''}`}
                 title={c.label}
               />
             ))}
          </div>
        </div>
        <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg mt-4">
          Salvar Cartão
        </button>
      </form>
    </Modal>
  );
};