import React from 'react';
import { useToastStore } from '../../store/useToastStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
      {toasts.map((t) => {
        const bgBorder =
          t.type === 'error'
            ? 'bg-red-950/90 border-red-500/50 text-red-100'
            : t.type === 'warning'
            ? 'bg-amber-950/90 border-amber-500/50 text-amber-100'
            : t.type === 'info'
            ? 'bg-blue-950/90 border-blue-500/50 text-blue-100'
            : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100';

        const Icon =
          t.type === 'error'
            ? AlertCircle
            : t.type === 'warning'
            ? AlertCircle
            : t.type === 'info'
            ? Info
            : CheckCircle2;

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl border shadow-xl backdrop-blur-md text-xs transition-all animate-fadeIn ${bgBorder}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="flex-1 font-medium leading-snug">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="opacity-70 hover:opacity-100 transition-opacity p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
