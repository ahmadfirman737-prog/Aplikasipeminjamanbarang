import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const bgColors = {
          success: 'bg-emerald-600 text-white border-emerald-500',
          error: 'bg-rose-600 text-white border-rose-500',
          info: 'bg-[#074A69] text-white border-[#0c618c]',
          warning: 'bg-amber-500 text-white border-amber-400'
        };

        const icons = {
          success: <CheckCircle2 className="w-5 h-5 shrink-0" />,
          error: <XCircle className="w-5 h-5 shrink-0" />,
          info: <Info className="w-5 h-5 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 shrink-0" />
        };

        return (
          <div
            key={toast.id}
            onClick={() => onRemove(toast.id)}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border ${bgColors[toast.type]} transform transition-all duration-300 animate-slide-in cursor-pointer hover:opacity-90`}
          >
            {icons[toast.type]}
            <p className="text-xs sm:text-sm font-semibold leading-snug">{toast.message}</p>
          </div>
        );
      })}
    </div>
  );
};
