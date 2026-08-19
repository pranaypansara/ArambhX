import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

const ToastCtx = createContext(null);

const ICONS = { success: CheckCircle2, info: Info, warning: AlertTriangle };
const COLORS = { success: '#9fe066', info: '#c98f9f', warning: '#eaa73f' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-80">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className="panel-alt shadow-lg px-3.5 py-3 flex items-start gap-2.5 count-up">
              <Icon size={16} style={{ color: COLORS[t.type] }} className="mt-0.5 shrink-0" />
              <span className="text-sm text-slate-200 flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="text-slate-500 hover:text-slate-300">
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
  return useContext(ToastCtx);
}
