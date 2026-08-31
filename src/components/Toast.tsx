import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import { CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react';

type ToastType = 'success' | 'info' | 'warning' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const ToastCtx = createContext<(type: ToastType, message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-lg"
          >
            {t.type === 'success' && <CheckCircle size={18} className="shrink-0 text-success" />}
            {t.type === 'info' && <Info size={18} className="shrink-0 text-primary-600" />}
            {t.type === 'warning' && <AlertTriangle size={18} className="shrink-0 text-warning" />}
            {t.type === 'error' && <XCircle size={18} className="shrink-0 text-danger" />}
            <span className="text-sm text-neutral-700">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
