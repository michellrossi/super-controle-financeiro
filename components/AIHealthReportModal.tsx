import React from 'react';
import { Modal } from './ui/Modal';
import { Sparkles, Loader2, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';

interface AIHealthReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  reportText: string;
  error: string;
  onGenerate: () => void;
}

export const AIHealthReportModal: React.FC<AIHealthReportModalProps> = ({
  isOpen,
  onClose,
  loading,
  reportText,
  error,
  onGenerate
}) => {
  const parseInline = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-slate-800">{part}</strong>;
      }
      return part;
    });
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;

    // Grouping consecutive list items together
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Check if it's a list item
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.substring(2);
        currentList.push(
          <li key={`li-${idx}`} className="text-slate-600 text-sm leading-relaxed mb-1.5 list-disc ml-4">
            {parseInline(content)}
          </li>
        );
      } else {
        // If we have a list accumulated, push it first
        if (currentList.length > 0) {
          elements.push(
            <ul key={`ul-${idx}`} className="mb-4 space-y-1">
              {currentList}
            </ul>
          );
          currentList = [];
        }

        // Parse other elements
        if (trimmed.startsWith('### ')) {
          elements.push(
            <h4 key={idx} className="text-sm font-bold text-slate-800 mt-5 mb-2 flex items-center gap-1.5">
              <ChevronRight size={14} className="text-indigo-500" /> {parseInline(trimmed.substring(4))}
            </h4>
          );
        } else if (trimmed.startsWith('## ')) {
          elements.push(
            <h3 key={idx} className="text-base font-extrabold text-indigo-900 mt-6 mb-3 border-b border-indigo-50/50 pb-1.5">
              {parseInline(trimmed.substring(3))}
            </h3>
          );
        } else if (trimmed.startsWith('# ')) {
          elements.push(
            <h2 key={idx} className="text-lg font-black text-indigo-950 mt-8 mb-4">
              {parseInline(trimmed.substring(2))}
            </h2>
          );
        } else if (trimmed === '---' || trimmed === '***') {
          elements.push(<hr key={idx} className="my-5 border-slate-100" />);
        } else if (trimmed.length > 0) {
          elements.push(
            <p key={idx} className="text-slate-600 text-sm leading-relaxed mb-4">
              {parseInline(line)}
            </p>
          );
        }
      }
    });

    // In case the list was at the end of the text
    if (currentList.length > 0) {
      elements.push(
        <ul key="ul-end" className="mb-4 space-y-1">
          {currentList}
        </ul>
      );
    }

    return elements;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Análise Financeira com IA" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 animate-pulse border border-indigo-100 shadow-sm">
                <Sparkles size={32} className="animate-spin-slow text-indigo-500" />
              </div>
              <Loader2 className="absolute -bottom-1 -right-1 text-indigo-600 animate-spin bg-white rounded-full p-0.5 border border-indigo-100" size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 text-lg">Gerando Diagnóstico...</h3>
              <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                Nossa Inteligência Artificial está analisando seus hábitos de consumo, comparando com o mês anterior e calculando a cobertura de suas reservas. Isso pode levar alguns segundos.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 mx-auto">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-rose-800">Falha ao Gerar Diagnóstico</h4>
              <p className="text-sm text-rose-600">{error === 'API_KEY_MISSING' ? 'Chave de API do Gemini não configurada.' : error}</p>
            </div>
            <button
              onClick={onGenerate}
              className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-rose-100 text-sm mx-auto"
            >
              <RefreshCw size={16} /> Tentar Novamente
            </button>
          </div>
        ) : reportText ? (
          <div className="space-y-6">
            {/* Header intro info */}
            <div className="p-4 bg-indigo-50/70 border border-indigo-100/50 rounded-2xl flex items-start gap-3">
              <Sparkles className="text-indigo-600 shrink-0 mt-0.5" size={18} />
              <div className="text-xs text-indigo-800 leading-relaxed font-medium">
                Esta análise foi criada de forma personalizada com base nas suas movimentações registradas neste mês e nos dados do seu histórico financeiro.
              </div>
            </div>

            {/* Generated report */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm max-h-[55vh] overflow-y-auto custom-scrollbar">
              {renderMarkdown(reportText)}
            </div>

            {/* Close / Regen actions */}
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={onGenerate}
                className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <RefreshCw size={16} /> Recalcular Análise
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-colors text-sm"
              >
                Fechar Relatório
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 space-y-4">
            <p className="text-sm text-slate-500">Nenhuma análise gerada para o período selecionado.</p>
            <button
              onClick={onGenerate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-100 transition-all text-sm"
            >
              Gerar Relatório de Saúde Financeira
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
