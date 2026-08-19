import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Search, CheckCircle2, UserPlus, Eye } from 'lucide-react';
import { ALERTS, STUDENTS, USERS } from '@/data/mockData';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import { Drawer, Modal } from '@/components/ui/Overlay';
import StudentAvatar from '@/components/ui/StudentAvatar';
import { STATUS_META, formatDateTime, timeAgo } from '@/lib/riskUtils';
import { EmptyState } from '@/components/ui/States';
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

  const selectedId = params.get('id');
  const selected = ALERTS.find(a => a.id === selectedId);
  const selectedStudent = selected && STUDENTS.find(s => s.id === selected.student_id);

  const rows = useMemo(() => {
    let r = [...ALERTS];
    if (typeFilter !== 'ALL') r = r.filter(a => a.alert_type === typeFilter);
    if (statusFilter !== 'ALL') r = r.filter(a => statusFilter === 'OPEN' ? a.status !== 'RESOLVED' : a.status === statusFilter);
    if (query) {
      const student = (id) => STUDENTS.find(s => s.id === id)?.name.toLowerCase() || '';
      r = r.filter(a => student(a.student_id).includes(query.toLowerCase()) || a.title.toLowerCase().includes(query.toLowerCase()));
    }
    return r.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [typeFilter, statusFilter, query]);

  return (
    <div>
      <PageHeader eyebrow="Screen 05" title="Smart Alerts" subtitle="Investigate multi-factor and high-risk alerts, and route them to action." />

      <SectionCard className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search alerts…" className="bg-[#ffffff] border hairline rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-teal-400 outline-none w-48" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-[#ffffff] border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
            <option value="ALL">All alert types</option>
            {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[#ffffff] border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-teal-400">
            <option value="OPEN">Open + Assigned</option>
            <option value="ASSIGNED">Assigned only</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ALL">All statuses</option>
          </select>
        </div>
      </SectionCard>

      {rows.length === 0 ? (
        <SectionCard><EmptyState icon={AlertTriangle} title="No alerts match these filters" /></SectionCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((a) => {
            const student = STUDENTS.find(s => s.id === a.student_id);
            const type = TYPE_META[a.alert_type];
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
                  <span className="text-[11px] text-slate-500">{timeAgo(a.created_at)}</span>
                </div>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <StudentAvatar name={student.name} size={28} />
                  <span className="text-sm text-slate-200 font-medium">{student.name}</span>
                </div>
                <p className="text-sm text-slate-300 leading-snug">{a.title}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] font-mono" style={{ color: STATUS_META[a.status]?.color }}>{a.status}</span>
                  <span className="text-[11px] text-slate-500">{a.triggering_signals.length} signal{a.triggering_signals.length !== 1 ? 's' : ''}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setParams({})}
        title={selectedStudent?.name}
        subtitle={selected ? TYPE_META[selected.alert_type].label + ' alert' : ''}
      >
        {selected && (
          <div className="space-y-5">
            <div className="p-3.5 rounded-lg" style={{ background: `${TYPE_META[selected.alert_type].color}12`, border: `1px solid ${TYPE_META[selected.alert_type].color}30` }}>
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle size={15} style={{ color: TYPE_META[selected.alert_type].color }} />
                <span className="text-sm font-semibold text-slate-100">{selected.title}</span>
              </div>
              <div className="text-xs text-slate-400">Severity: {selected.severity} · Created {formatDateTime(selected.created_at)}</div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Triggering signals</div>
              <div className="flex flex-wrap gap-1.5">
                {selected.triggering_signals.map((s) => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded-full text-rose-300" style={{ background: '#ef635518', border: '1px solid #ef635530' }}>{s} ↓</span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Status</div>
                <div className="text-slate-200 font-mono text-xs">{selected.status}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Assigned staff</div>
                <div className="text-slate-200 text-xs">{selected.assigned_to ? USERS.find(u => u.id === selected.assigned_to)?.name : 'Unassigned'}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t hairline">
              <button
                onClick={() => navigate(`/students/${selected.student_id}?tab=why`)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg chip text-slate-200"
              >
                <Eye size={13} /> Investigate
              </button>
              <button
                onClick={() => navigate(`/interventions?student=${selected.student_id}`)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg"
                style={{ background: '#7a5963', color: '#fbf3f0' }}
              >
                <UserPlus size={13} /> Assign Intervention
              </button>
              <button
                onClick={() => setConfirmResolve(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg chip text-lime-300"
              >
                <CheckCircle2 size={13} /> Resolve Alert
              </button>
            </div>
          </div>
        )}
      </Drawer>

      <Modal open={confirmResolve} onClose={() => setConfirmResolve(false)} title="Resolve this alert?" width={380}>
        <p className="text-sm text-slate-300 mb-4">
          This marks the alert as resolved for {selectedStudent?.name}. You can still review it later from their profile history.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirmResolve(false)} className="text-xs font-medium px-3 py-2 rounded-lg chip text-slate-300">
            Cancel
          </button>
          <button
            onClick={() => { toast?.push('Alert marked as resolved.', 'success'); setConfirmResolve(false); setParams({}); }}
            className="text-xs font-medium px-3 py-2 rounded-lg"
            style={{ background: '#9fe066', color: '#0d1b0a' }}
          >
            Yes, resolve it
          </button>
        </div>
      </Modal>
    </div>
  );
}
