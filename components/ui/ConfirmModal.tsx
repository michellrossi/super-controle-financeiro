import React from 'react';
import { Modal } from './Modal';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Sim',
  cancelLabel = 'Não',
  type = 'info'
}) => {
  const getColors = () => {
    switch (type) {
      case 'danger': return { bg: 'bg-rose-50', text: 'text-rose-600', icon: XCircle, btn: 'bg-rose-600 hover:bg-rose-700' };
      case 'warning': return { bg: 'bg-orange-50', text: 'text-orange-600', icon: AlertCircle, btn: 'bg-orange-600 hover:bg-orange-700' };
      default: return { bg: 'bg-blue-50', text: 'text-blue-600', icon: CheckCircle2, btn: 'bg-blue-600 hover:bg-blue-700' };
    }
  };

  const colors = getColors();
  const Icon = colors.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center text-center p-2">
        <div className={`w-16 h-16 ${colors.bg} ${colors.text} rounded-full flex items-center justify-center mb-4`}>
          <Icon size={32} />
        </div>
        
        <p className="text-slate-600 mb-8 leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-3 px-4 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 ${colors.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
