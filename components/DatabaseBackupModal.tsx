import React from 'react';
import { Modal } from './ui/Modal';
import { exportToJSON, exportToCSV } from '../utils/export';
import { Transaction, CreditCard, Debt, Category, Budget } from '../types';
import { Database, FileJson, FileSpreadsheet, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface DatabaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  cards: CreditCard[];
  debts: Debt[];
  categories: Category[];
  budgets: Budget[];
}

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({
  isOpen,
  onClose,
  transactions,
  cards,
  debts,
  categories,
  budgets
}) => {

  const getConsolidatedData = () => {
    return {
      backupDate: new Date().toISOString(),
      transactions,
      cards,
      debts,
      categories,
      budgets
    };
  };

  const handleDownloadJSON = () => {
    try {
      const data = getConsolidatedData();
      const filename = `backup_financeiro_${new Date().toISOString().split('T')[0]}.json`;
      exportToJSON(data, filename);
      toast.success('Backup em JSON baixado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar backup JSON.');
    }
  };

  const handleDownloadCSV = (type: 'transactions' | 'cards' | 'debts' | 'categories' | 'budgets' | 'all') => {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      
      if (type === 'transactions' || type === 'all') {
        exportToCSV(transactions, `backup_transacoes_${dateStr}.csv`);
      }
      if (type === 'cards' || type === 'all') {
        exportToCSV(cards, `backup_cartoes_${dateStr}.csv`);
      }
      if (type === 'debts' || type === 'all') {
        // Remove a lista aninhada de parcelas para evitar formatação complexa no CSV básico ou exporta do jeito que está
        const cleanedDebts = debts.map(({ installments, ...d }) => d);
        exportToCSV(cleanedDebts, `backup_dividas_${dateStr}.csv`);
      }
      if (type === 'categories' || type === 'all') {
        exportToCSV(categories, `backup_categorias_${dateStr}.csv`);
      }
      if (type === 'budgets' || type === 'all') {
        exportToCSV(budgets, `backup_orcamentos_${dateStr}.csv`);
      }
      
      toast.success('Backup(s) em CSV baixado(s) com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar backup CSV.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Backup de Dados" maxWidth="max-w-md">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-100">
            <Database size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Exportar Banco de Dados</h3>
            <p className="text-xs text-slate-500">Baixe uma cópia de segurança de todas as suas informações locais e do Firebase.</p>
          </div>
        </div>

        {/* Resumo de Dados */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5 text-xs text-slate-600">
          <div className="font-bold text-slate-700 mb-1.5 text-sm">Resumo do Backup:</div>
          <div className="flex justify-between">
            <span>Transações:</span>
            <span className="font-bold text-slate-800">{transactions.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Cartões de Crédito:</span>
            <span className="font-bold text-slate-800">{cards.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Dívidas cadastradas:</span>
            <span className="font-bold text-slate-800">{debts.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Categorias personalizadas:</span>
            <span className="font-bold text-slate-800">{categories.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Metas de Orçamento:</span>
            <span className="font-bold text-slate-800">{budgets.length}</span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-3">
          <button
            onClick={handleDownloadJSON}
            className="w-full flex items-center justify-between bg-white border border-slate-200 hover:border-emerald-500 hover:bg-slate-50 p-4 rounded-xl shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <FileJson className="text-amber-500 group-hover:scale-110 transition-transform" size={24} />
              <div className="text-left">
                <div className="font-bold text-slate-800 text-sm">Download Completo (JSON)</div>
                <div className="text-xs text-slate-400">Todos os dados consolidados em um único arquivo</div>
              </div>
            </div>
            <Download size={18} className="text-slate-400 group-hover:text-emerald-600" />
          </button>

          <button
            onClick={() => handleDownloadCSV('all')}
            className="w-full flex items-center justify-between bg-white border border-slate-200 hover:border-emerald-500 hover:bg-slate-50 p-4 rounded-xl shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="text-blue-500 group-hover:scale-110 transition-transform" size={24} />
              <div className="text-left">
                <div className="font-bold text-slate-800 text-sm">Download Completo (CSV)</div>
                <div className="text-xs text-slate-400">Arquivos CSV individuais para cada tabela</div>
              </div>
            </div>
            <Download size={18} className="text-slate-400 group-hover:text-emerald-600" />
          </button>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="text-slate-500 font-bold mb-2.5 text-xs">Downloads individuais em CSV:</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDownloadCSV('transactions')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-100 transition-colors"
            >
              <FileSpreadsheet size={14} className="text-blue-500" /> Transações
            </button>
            <button
              onClick={() => handleDownloadCSV('cards')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-100 transition-colors"
            >
              <FileSpreadsheet size={14} className="text-blue-500" /> Cartões
            </button>
            <button
              onClick={() => handleDownloadCSV('debts')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-100 transition-colors"
            >
              <FileSpreadsheet size={14} className="text-blue-500" /> Dívidas
            </button>
            <button
              onClick={() => handleDownloadCSV('categories')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-100 transition-colors"
            >
              <FileSpreadsheet size={14} className="text-blue-500" /> Categorias
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
