import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

const ToastCtx = createContext(null);

const ICONS = { success: CheckCircle2, info: Info, warning: AlertTriangle, error: AlertTriangle };
const COLORS = { success: '#3A8F6A', info: '#2A8588', warning: '#D9922B', error: '#C84C4C' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastCtx.Provider value={{ push, show: push }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-80">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div key={t.id} className="bg-white border border-hairline rounded-2xl shadow-xl px-3.5 py-3 flex items-start gap-2.5 count-up">
              <Icon size={16} style={{ color: COLORS[t.type] || '#2A8588' }} className="mt-0.5 shrink-0" />
              <span className="text-xs font-extrabold text-ink flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="text-slate-500 hover:text-ink">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    return { push: () => {}, show: () => {} };
  }
  return ctx;
}
