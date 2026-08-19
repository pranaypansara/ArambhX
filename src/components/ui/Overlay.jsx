import { X } from 'lucide-react';
import { useEffect } from 'react';

export function Modal({ open, onClose, title, children, width = 480 }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative panel-alt w-full shadow-2xl count-up" style={{ maxWidth: width }}>
        <div className="flex items-center justify-between px-5 py-4 border-b hairline">
          <h3 className="font-display font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/5">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, subtitle, children, width = 460 }) {
  return (
    <div className={`fixed inset-0 z-[80] ${open ? '' : 'pointer-events-none'}`}>
      <div
        className="absolute inset-0 bg-black/55 transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        className="absolute top-0 right-0 h-full bg-[#f3e7e4] border-l hairline shadow-2xl flex flex-col transition-transform duration-300"
        style={{ width, transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b hairline shrink-0">
          <div>
            <h3 className="font-display font-semibold text-slate-100">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/5 shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
