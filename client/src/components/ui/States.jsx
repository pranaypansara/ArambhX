import { Inbox, AlertTriangle, RefreshCw } from 'lucide-react';

export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: '#F6ECE966', color: '#a98f95' }}>
        <Icon size={20} />
      </div>
      <div className="font-display font-semibold text-slate-200 mb-1">{title}</div>
      {description && <div className="text-sm text-slate-400 max-w-sm">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description = 'That request failed. Try again.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: '#ef635520', color: '#ef6355' }}>
        <AlertTriangle size={20} />
      </div>
      <div className="font-display font-semibold text-slate-200 mb-1">{title}</div>
      <div className="text-sm text-slate-400 max-w-sm">{description}</div>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md chip text-slate-200">
          <RefreshCw size={13} /> Retry
        </button>
      )}
    </div>
  );
}
