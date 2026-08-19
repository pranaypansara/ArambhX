import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Search, CheckCircle2, UserPlus, Eye } from 'lucide-react';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import { Drawer, Modal } from '@/components/ui/Overlay';
import StudentAvatar from '@/components/ui/StudentAvatar';
import { STATUS_META, ALERT_SEVERITY_META, formatDateTime, timeAgo } from '@/lib/riskUtils';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useAsyncData, ALERT_TYPES } from '@/services/data';
import { api } from '@/services/api';
import { useToast } from '@/components/ui/Toast';

const TYPE_META = {
  EARLY_WARNING: { color: '#eaa73f', label: 'Early Warning' },
  HIGH_RISK: { color: '#f2884f', label: 'High Risk' },
  CRITICAL: { color: '#ef6355', label: 'Critical' },
  MULTI_FACTOR: { color: '#ef6355', label: 'Multi-Factor' },
};

export default function SmartAlerts() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [query, setQuery] = useState('');
  const [confirmResolve, setConfirmResolve] = useState(false);
  const [resolving, setResolving] = useState(false);

  const { data: alerts, loading, error, reload } = useAsyncData(() => api.listAlerts({ page: 1, limit: 200 }).then((res) => res?.data?.alerts || []), []);

  const selectedId = params.get('id');
  const selected = alerts?.find(a => a.id === Number(selectedId));

  const rows = useMemo(() => {
    let r = alerts ? [...alerts] : [];
    if (typeFilter !== 'ALL') r = r.filter(a => a.alertType === typeFilter);
    if (statusFilter !== 'ALL') r = r.filter(a => statusFilter === 'OPEN' ? a.status !== 'RESOLVED' : a.status === statusFilter);
    if (query) r = r.filter(a => (a.studentName || '').toLowerCase().includes(query.toLowerCase()) || (a.message || '').toLowerCase().includes(query.toLowerCase()));
    return r.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [alerts, typeFilter, statusFilter, query]);

  async function handleResolve() {
    if (!selected) return;
    setResolving(true);
    try {
      await api.resolveAlert(selected.id);
      toast.show('Alert marked as resolved.', 'success');
      setConfirmResolve(false);
      setParams({});
      reload();
    } catch (err) {
      toast.show(err.message || 'Unable to resolve the alert.', 'error');
    } finally {
      setResolving(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Screen 05" title="Smart Alerts" subtitle="Investigate multi-factor and high-risk alerts, and route them to action." />

      <SectionCard className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search alerts…" className="bg-[#ffffff] border hairline rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-500 focus:border-teal-400 outline-none w-48" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-[#ffffff] border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-teal-400">
            <option value="ALL">All alert types</option>
            {ALERT_TYPES.map((t) => <option key={t} value={t}>{TYPE_META[t]?.label || t.replace('_', ' ')}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[#ffffff] border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-teal-400">
            <option value="OPEN">Active + Acknowledged</option>
            <option value="ACTIVE">Active only</option>
            <option value="ACKNOWLEDGED">Acknowledged only</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ALL">All statuses</option>
          </select>
        </div>
      </SectionCard>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : error ? (
        <SectionCard><ErrorState title="Could not load alerts" description={error.message} onRetry={reload} /></SectionCard>
      ) : rows.length === 0 ? (
        <SectionCard><EmptyState icon={AlertTriangle} title="No alerts match these filters" /></SectionCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((a) => {
            const type = TYPE_META[a.alertType] || TYPE_META.HIGH_RISK;
            return (
              <button
                key={a.id}
                onClick={() => setParams({ id: a.id })}
                className="panel p-4 text-left hover:border-teal-400/40 border border-transparent transition-colors"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ color: type.color, background: `${type.color}1a` }}>
                    {type.label}
                  </span>
                  <span className="text-[11px] text-slate-500">{timeAgo(a.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <StudentAvatar name={a.studentName} size={28} />
                  <span className="text-sm text-slate-800 font-medium">{a.studentName}</span>
                </div>
                <p className="text-sm text-slate-600 leading-snug line-clamp-2">{a.message}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] font-mono" style={{ color: STATUS_META[a.status]?.color }}>
                    {STATUS_META[a.status]?.label || a.status}
                  </span>
                  <span className="text-[11px] text-slate-500">{ALERT_SEVERITY_META[a.priority]?.label || a.priority}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setParams({})}
        title={selected?.studentName}
        subtitle={selected ? (TYPE_META[selected.alertType]?.label || selected.alertType) + ' alert' : ''}
      >
        {selected && (
          <div className="space-y-5">
            <div className="p-3.5 rounded-lg" style={{ background: `${TYPE_META[selected.alertType].color}12`, border: `1px solid ${TYPE_META[selected.alertType].color}30` }}>
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle size={15} style={{ color: TYPE_META[selected.alertType].color }} />
                <span className="text-sm font-semibold text-slate-800">{selected.message}</span>
              </div>
              <div className="text-xs text-slate-500">
                Severity: {ALERT_SEVERITY_META[selected.priority]?.label || selected.priority} · Created {formatDateTime(selected.createdAt)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Status</div>
                <div className="text-slate-800 font-mono text-xs">{STATUS_META[selected.status]?.label || selected.status}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Type</div>
                <div className="text-slate-800 text-xs">{TYPE_META[selected.alertType]?.label || selected.alertType}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t hairline">
              <button
                onClick={() => navigate(`/students/${selected.studentId}?tab=why`)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg chip text-slate-700"
              >
                <Eye size={13} /> Investigate
              </button>
              <button
                onClick={() => navigate(`/interventions?student=${selected.studentId}`)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg"
                style={{ background: '#7a5963', color: '#fbf3f0' }}
              >
                <UserPlus size={13} /> Assign Intervention
              </button>
              {selected.status !== 'RESOLVED' && (
                <button
                  onClick={() => setConfirmResolve(true)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg chip text-[#3A8F6A]"
                >
                  <CheckCircle2 size={13} /> Resolve Alert
                </button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Modal open={confirmResolve} onClose={() => setConfirmResolve(false)} title="Resolve this alert?" width={380}>
        <p className="text-sm text-slate-600 mb-4">
          This marks the alert as resolved for {selected?.studentName}. You can still review it later from their profile history.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirmResolve(false)} className="text-xs font-medium px-3 py-2 rounded-lg chip text-slate-600">
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="text-xs font-medium px-3 py-2 rounded-lg"
            style={{ background: '#9fe066', color: '#0d1b0a' }}
          >
            {resolving ? 'Resolving…' : 'Yes, resolve it'}
          </button>
        </div>
      </Modal>
    </div>
  );
}