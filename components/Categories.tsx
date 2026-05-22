import React, { useState } from 'react';
import { Category, Budget, TransactionType } from '../types';
import { Trash2, Edit2, Plus, DollarSign, X, Check, FolderHeart, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../services/storage';
import toast from 'react-hot-toast';

interface CategoriesViewProps {
  categories: Category[];
  budgets: Budget[];
  onAddCategory: (name: string, type: TransactionType, emoji: string) => Promise<void>;
  onUpdateCategory: (id: string, oldName: string, newName: string, emoji: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onSaveBudget: (category: string, limit: number) => Promise<void>;
  onDeleteBudget: (id: string) => Promise<void>;
}

const EMOJI_PALETTE = [
  '🍔', '🏠', '🚗', '📱', '🍕', '📚', '💊', '🥡', '📈', '🎮', '🛍️', 
  '👤', '🎁', '✈️', '👕', '💡', '📋', '🙌', '🐾', '💰', '🧧', '🤝', 
  '🍱', '🔙', '💼', '⚠️', '🏷️', '💵', '🛒', '🚲', '🍿', '🎸', '💈'
];

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  budgets,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onSaveBudget,
  onDeleteBudget
}) => {
  const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
  
  // States for Category Form (Add/Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('🏷️');
  const [categoryType, setCategoryType] = useState<TransactionType>(TransactionType.EXPENSE);

  // States for Budget Form (Inline or modal-like per category)
  const [editingBudgetCategory, setEditingBudgetCategory] = useState<string | null>(null);
  const [budgetLimit, setBudgetLimit] = useState('');

  const handleOpenAddModal = (type: TransactionType) => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryEmoji(type === TransactionType.INCOME ? '💰' : '🏷️');
    setCategoryType(type);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryEmoji(cat.emoji || '🏷️');
    setCategoryType(cat.type);
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    try {
      if (editingCategory) {
        await onUpdateCategory(editingCategory.id, editingCategory.name, categoryName.trim(), categoryEmoji);
      } else {
        await onAddCategory(categoryName.trim(), categoryType, categoryEmoji);
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteClick = async (cat: Category) => {
    await onDeleteCategory(cat.id);
  };

  const handleOpenBudgetEdit = (categoryName: string, currentLimit?: number) => {
    setEditingBudgetCategory(categoryName);
    setBudgetLimit(currentLimit ? currentLimit.toString() : '');
  };

  const handleSaveBudget = async (categoryName: string) => {
    const limitNum = parseFloat(budgetLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      toast.error("Por favor, insira um valor válido maior que zero.");
      return;
    }
    await onSaveBudget(categoryName, limitNum);
    setEditingBudgetCategory(null);
  };

  const handleDeleteBudgetClick = async (budgetId: string, categoryName: string) => {
    await onDeleteBudget(budgetId);
  };

  const filteredCategories = categories
    .filter(c => c.type === activeTab)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-4xl mx-auto pb-12">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
            <FolderHeart size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Categorias e Orçamentos</h2>
            <p className="text-sm text-slate-500">Personalize o controle de suas receitas e defina limites para despesas.</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenAddModal(activeTab)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-100 text-sm w-full sm:w-auto justify-center"
        >
          <Plus size={16} strokeWidth={2.5} /> Nova Categoria
        </button>
      </div>

      {/* Tabs Selector */}
      <div className="flex p-1 bg-white border border-slate-100 rounded-xl max-w-md shadow-sm">
        <button
          onClick={() => setActiveTab(TransactionType.EXPENSE)}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === TransactionType.EXPENSE
              ? 'bg-rose-500 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Despesas
        </button>
        <button
          onClick={() => setActiveTab(TransactionType.INCOME)}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === TransactionType.INCOME
              ? 'bg-emerald-500 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Receitas
        </button>
      </div>

      {/* Category List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCategories.map(cat => {
          const budget = budgets.find(b => b.category === cat.name);
          const isEditingBudget = editingBudgetCategory === cat.name;

          return (
            <div key={cat.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-3xl p-2 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-inner">
                    {cat.emoji || '🏷️'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{cat.name}</h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {cat.type === TransactionType.INCOME ? 'Receita' : 'Despesa'}
                    </p>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(cat)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                    title="Editar Categoria"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(cat)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-colors"
                    title="Excluir Categoria"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Budget Option (Expenses only) */}
              {cat.type === TransactionType.EXPENSE && (
                <div className="pt-3 border-t border-slate-50 flex items-center justify-between gap-4 min-h-[44px]">
                  {isEditingBudget ? (
                    <div className="flex items-center gap-2 w-full">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-2.5 top-2 text-slate-400" size={14} />
                        <input
                          type="number"
                          placeholder="Limite R$"
                          value={budgetLimit}
                          onChange={e => setBudgetLimit(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={() => handleSaveBudget(cat.name)}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                        title="Salvar Limite"
                      >
                        <Check size={14} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => setEditingBudgetCategory(null)}
                        className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                        title="Cancelar"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      {budget ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                            💵 Limite: <strong className="text-slate-700">{formatCurrency(budget.limit)}</strong>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenBudgetEdit(cat.name, budget.limit)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors"
                            >
                              Alterar
                            </button>
                            <button
                              onClick={() => handleDeleteBudgetClick(budget.id, cat.name)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Remover Limite"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenBudgetEdit(cat.name)}
                          className="text-[10px] text-emerald-600 hover:text-white border border-emerald-200 hover:bg-emerald-600 font-bold px-3 py-1 rounded-full transition-all flex items-center gap-1"
                        >
                          <Plus size={10} strokeWidth={2.5} /> Definir Orçamento
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Category Creation/Edition Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100 animate-scale-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-5">
              {/* Type toggle inside form if creating */}
              {!editingCategory && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo de Transação</label>
                  <div className="flex p-1 bg-slate-50 border border-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => { setCategoryType(TransactionType.EXPENSE); setCategoryEmoji('🏷️'); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        categoryType === TransactionType.EXPENSE ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCategoryType(TransactionType.INCOME); setCategoryEmoji('💰'); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        categoryType === TransactionType.INCOME ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Receita
                    </button>
                  </div>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nome da Categoria</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-800"
                  placeholder="Ex: Assinaturas, Freelance..."
                />
              </div>

              {/* Emoji Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Ícone / Emoji Selecionado: <span className="text-xl ml-1">{categoryEmoji}</span>
                </label>
                
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl max-h-36 overflow-y-auto grid grid-cols-7 gap-2">
                  {EMOJI_PALETTE.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCategoryEmoji(emoji)}
                      className={`text-2xl p-1 hover:scale-125 transition-transform rounded-lg flex items-center justify-center ${
                        categoryEmoji === emoji ? 'bg-indigo-50 border border-indigo-200 shadow-sm' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {editingCategory && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2">
                  <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    <strong>Atenção:</strong> Renomear a categoria atualizará automaticamente todas as transações correspondentes do seu histórico.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
