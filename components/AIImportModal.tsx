import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { CreditCard, Transaction, TransactionType, TransactionStatus } from '../types';
import { AIService, AIParsedTransaction } from '../services/ai';
import { Sparkles, Loader2, CheckCircle, AlertCircle, ArrowUp, ArrowDown, Key } from 'lucide-react';
import { formatCurrency } from '../services/storage';

interface AIImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CreditCard[];
  onImport: (transactions: Transaction[]) => void;
}

export const AIImportModal: React.FC<AIImportModalProps> = ({ isOpen, onClose, cards, onImport }) => {
  const [step, setStep] = useState<'INPUT' | 'PREVIEW'>('INPUT');
  const [text, setText] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<AIParsedTransaction[]>([]);
  const [error, setError] = useState('');
  const [needsApiKey, setNeedsApiKey] = useState(false);

  // Ensure a card is selected when the modal opens or cards are loaded
  useEffect(() => {
    if (isOpen && cards.length > 0) {
      // If no card is selected, or the selected card is no longer in the list (deleted)
      const currentCardExists = cards.find(c => c.id === selectedCardId);
      if (!selectedCardId || !currentCardExists) {
        setSelectedCardId(cards[0].id);
      }
    }
  }, [isOpen, cards, selectedCardId]);

  const handleSelectApiKey = async () => {
    try {
      // @ts-ignore
      if (window.aistudio && window.aistudio.openSelectKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setNeedsApiKey(false);
        setError('');
        // Retry process immediately if text is present
        if (text) handleProcess(); 
      } else {
        setError("API do Google AI Studio não disponível neste navegador. Verifique a documentação.");
      }
    } catch (e) {
      console.error(e);
      setError("Falha ao selecionar chave de API.");
    }
  };

  const handleProcess = async () => {
    console.log("Botão processar clicado. Texto length:", text.length, "CardID:", selectedCardId);
    
    if (!selectedCardId) {
      setError("Selecione um cartão de crédito para continuar.");
      return;
    }
    
    if (!text.trim()) {
      setError("Cole o texto da fatura para continuar.");
      return;
    }
    
    setLoading(true);
    setError('');
    setNeedsApiKey(false);
    
    try {
      const results = await AIService.parseStatement(text);
      console.log("Resultados parseados:", results);
      if (results.length === 0) {
        setError('Nenhuma transação identificada. Verifique o texto copiado.');
      } else {
        setParsedData(results);
        setStep('PREVIEW');
      }
    } catch (e: any) {
      console.error("Erro no frontend ao chamar AI:", e);
      if (e.message === 'API_KEY_MISSING') {
         setNeedsApiKey(true);
         setError("Chave de API necessária para usar a Inteligência Artificial.");
      } else {
         setError(`Erro: ${e.message || 'Falha ao processar'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const transactions: Transaction[] = parsedData.map(item => ({
      id: crypto.randomUUID(),
      description: item.description,
      amount: item.amount,
      date: new Date(item.date).toISOString(),
      // Map AI type to App type
      type: item.type === 'INCOME' ? TransactionType.INCOME : TransactionType.CARD_EXPENSE,
      category: item.category,
      status: TransactionStatus.COMPLETED,
      // Only attach card ID if it's a card expense. 
      // We will attach the cardId regardless for tracking.
      cardId: selectedCardId
    }));
    
    onImport(transactions);
    handleClose();
  };

  const handleClose = () => {
    setText('');
    setStep('INPUT');
    setParsedData([]);
    setError('');
    setNeedsApiKey(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Extrato com IA" maxWidth="max-w-2xl">
      {step === 'INPUT' ? (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
             <Sparkles className="text-indigo-600 shrink-0 mt-1" size={20} />
             <div className="text-sm text-indigo-800">
                <p className="font-bold">Como funciona?</p>
                <p>Copie o texto da fatura (PDF ou App do banco) e cole abaixo. A Inteligência Artificial identificará automaticamente entradas (créditos) e saídas (débitos), categorizando cada item.</p>
             </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Selecione o Cartão</label>
            <select 
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {cards.length === 0 && <option value="">Nenhum cartão cadastrado</option>}
              {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
             <label className="block text-xs font-semibold text-slate-500 mb-1">Texto da Fatura / Extrato</label>
             <textarea 
               value={text}
               onChange={(e) => setText(e.target.value)}
               className="w-full h-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-mono"
               placeholder="Ex: 25/02 UBER *VIAGEM R$ 15,90..."
             />
          </div>

          {error && (
            <div className="flex flex-col gap-3 bg-rose-50 p-4 rounded-lg border border-rose-100">
              <div className="text-rose-600 text-sm flex items-center gap-2 font-medium">
                <AlertCircle size={16} /> {error}
              </div>
              
              {needsApiKey && (
                <button 
                  onClick={handleSelectApiKey}
                  className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-rose-700 transition-colors flex items-center justify-center gap-2 w-full"
                >
                  <Key size={16} /> Conectar Conta Google (Grátis)
                </button>
              )}
            </div>
          )}

          {!needsApiKey && (
            <button 
              onClick={handleProcess}
              disabled={loading || !text.trim() || cards.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
              Processar Fatura
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
           <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-700">Revisão ({parsedData.length} itens)</h3>
              <button onClick={() => setStep('INPUT')} className="text-xs text-slate-500 hover:text-indigo-600">Voltar</button>
           </div>

           <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
              {parsedData.map((t, idx) => (
                <div key={idx} className="p-3 hover:bg-slate-50 flex justify-between items-center text-sm border-l-4 border-transparent hover:border-indigo-200">
                   <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded ${t.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                         {t.type === 'INCOME' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      </div>
                      <div>
                          <p className="font-bold text-slate-700">{t.description}</p>
                          <div className="flex gap-2 text-xs text-slate-500">
                            <span>{t.date}</span>
                            <span className="bg-slate-100 px-1.5 rounded">{t.category}</span>
                          </div>
                      </div>
                   </div>
                   <span className={`font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-800'}`}>
                     {t.type === 'INCOME' ? '+ ' : ''}{formatCurrency(t.amount)}
                   </span>
                </div>
              ))}
           </div>

           <div className="flex gap-3 pt-2">
             <button 
               onClick={handleClose}
               className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
             >
               Cancelar
             </button>
             <button 
               onClick={handleConfirm}
               className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
             >
               <CheckCircle size={18} /> Confirmar Importação
             </button>
           </div>
        </div>
      )}
    </Modal>
  );
};