import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, CheckCircle2, ChevronDown, ListFilter, Save, Wand2 } from 'lucide-react';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import StudentAvatar from '@/components/ui/StudentAvatar';
import RiskBadge from '@/components/ui/RiskBadge';
import { STATUS_META, INTERVENTION_TYPE_META, INTERVENTION_STATUS_TRANSITIONS, formatDate, statusLabel } from '@/lib/riskUtils';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { Drawer } from '@/components/ui/Overlay';
import { useAsyncData, fetchSummaries, clearSummaryCache } from '@/services/data';

const WORKFLOW_ORDER = ['RECOMMENDED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'EVALUATED', 'ESCALATED', 'CLOSED'];

function RecommendationCard({ iv, onAssign }) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const meta = INTERVENTION_TYPE_META[iv.intervention_type] || { label: iv.intervention_label, color: '#7a5963' };
  return (
    <div className="panel p-4">
      <button className="w-full flex items-center gap-3 text-left" onClick={() => setLocalExpanded(e => !e)}>
        <span className="font-mono text-xs text-slate-500 w-5">{iv.status === 'RECOMMENDED' ? '★' : '•'}</span>
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-800">{meta.label}</div>
          <div className="text-xs text-slate-500 mt-0.5">{iv.reason || `Priority ${iv.priority}`} · {iv.status.replace('_', ' ')}</div>
        </div>
        <ChevronDown size={15} className={`text-slate-500 transition-transform ${localExpanded ? 'rotate-180' : ''}`} />
      </button>
      {localExpanded && (
        <div className="mt-3 pt-3 border-t hairline space-y-3">
          <p className="text-sm text-slate-600">{iv.reason || 'Rule-based recommendation from stored risk data.'}</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs px-2 py-0.5 rounded-full text-slate-700" style={{ background: '#eaa73f18', border: '1px solid #eaa73f30' }}>Priority {iv.priority}</span>
            <span className="text-xs px-2 py-0.5 rounded-full text-slate-700" style={{ background: '#2A858818', border: '1px solid #2A858830' }}>Status {statusLabel(iv.status)}</span>
          </div>
          <div className="flex gap-2 pt-1">
            {iv.status === 'RECOMMENDED' && (
              <button onClick={() => onAssign(iv)} className="text-xs font-medium px-3 py-2 rounded-lg" style={{ background: '#7a5963', color: '#fbf3f0' }}>
                Move to Assigned
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CopilotTab({ activeStudentId, setActiveStudentId }) {
  const toast = useToast();
  const { data: summaries, loading, error, reload } = useAsyncData(() => fetchSummaries(), []);
  const [generating, setGenerating] = useState(false);

  const priorityStudents = useMemo(() => (summaries || [])
    .filter((s) => s.prediction)
    .sort((a, b) => b.priority - a.priority), [summaries]);

  const active = activeStudentId ? priorityStudents.find(s => s.student.id === activeStudentId) : priorityStudents[0];
  const openInterventions = active ? active.allInterventions.filter(iv => iv.status === 'RECOMMENDED' || iv.status === 'ASSIGNED' || iv.status === 'IN_PROGRESS') : [];

  async function handleGenerate() {
    if (!active) return;
    setGenerating(true);
    try {
      const res = await apiGenerate(active.student.id);
      toast.show(`Recommendations generated (${res?.data?.created || 0} new).`, 'success');
      clearCacheAndReload();
    } catch (err) {
      toast.show(err.message || 'Unable to generate recommendations.', 'error');
    } finally {
      setGenerating(false);
    }
  }

  function clearCacheAndReload() {
    clearSummaryCache();
    reload({ force: true });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <SectionCard title="Priority students" subtitle="Select a student to see recommendations">
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
        ) : error ? (
          <ErrorState title="Could not load students" description={error.message} onRetry={reload} />
        ) : priorityStudents.length === 0 ? (
          <EmptyState title="No students yet" />
        ) : (
          <div className="space-y-1.5 max-h-[520px] overflow-y-auto -mx-1 px-1">
            {priorityStudents.map((s) => (
              <button
                key={s.student.id}
                onClick={() => setActiveStudentId(s.student.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${active?.student.id === s.student.id ? 'bg-panel-alt' : 'hover:bg-void'}`}
              >
                <StudentAvatar name={s.student.name} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-800 truncate">{s.student.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{s.prediction.risk_probability}% risk</div>
                </div>
                <RiskBadge level={s.prediction.risk_level} size="sm" />
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="lg:col-span-2 space-y-5">
        {active && (
          <SectionCard title="Help me decide the best intervention" subtitle={`Context for ${active.student.name}`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">Risk</div>
                <div className="font-mono text-lg text-slate-800">{active.prediction.risk_probability}%</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">Level</div>
                <RiskBadge level={active.prediction.risk_level} size="sm" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">Open alerts</div>
                <div className="font-mono text-lg text-slate-800">{active.openAlerts.length}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">Active cases</div>
                <div className="font-mono text-lg text-slate-800">{openInterventions.length}</div>
              </div>
            </div>

            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">Top signals</div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {active.openAlerts.length === 0 ? (
                <span className="text-xs text-slate-500">No open alerts on record.</span>
              ) : active.openAlerts.slice(0, 3).map((a) => (
                <span key={a.id} className="text-xs px-2 py-0.5 rounded-full text-rose-700" style={{ background: '#ef635518', border: '1px solid #ef635530' }}>
                  {a.alert_type.replace('_', ' ')} ↑
                </span>
              ))}
            </div>

            <div className="pt-3 border-t hairline space-y-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">Existing interventions</div>
              {active.allInterventions?.length === 0 ? (
                <p className="text-xs text-slate-500">None on record.</p>
              ) : (
                <ul className="space-y-1">
                  {active.allInterventions.map(iv => (
                    <li key={iv.id} className="text-xs text-slate-700">{iv.intervention_label} <span className="text-slate-500">· {statusLabel(iv.status)}</span></li>
                  ))}
                </ul>
              )}
            </div>
          </SectionCard>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-display font-semibold text-slate-800">Active recommendations</h3>
          <button
            onClick={handleGenerate}
            disabled={generating || !active}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg chip text-teal-500"
          >
            <Wand2 size={13} /> {generating ? 'Generating…' : 'Generate via ML rule engine'}
          </button>
        </div>

        <div className="space-y-3">
          {!active ? (
            <EmptyState title="Select a student" description="Pick a priority student to see their recommendations." />
          ) : openInterventions.length === 0 ? (
            <EmptyState title="No active recommendations" description="Use the generator above, or the Intervention Copilot button on a student's profile." />
          ) : openInterventions.map((iv) => (
            <RecommendationCard
              key={iv.id}
              iv={iv}
              onAssign={async () => {
                try {
                  await updateStatus(iv.id, 'ASSIGNED');
                  toast.show(`${iv.intervention_label} moved to Assigned.`, 'success');
                  clearCacheAndReload();
                } catch (err) {
                  toast.show(err.message || 'Unable to update status.', 'error');
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkflowTab({ studentFilter }) {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editing, setEditing] = useState(null);
  const [draftStatus, setDraftStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: summaries, loading, error, reload } = useAsyncData(() => fetchSummaries(), []);

  const rows = useMemo(() => {
    let r = (summaries || []).flatMap((s) => (s.allInterventions || []).map((iv) => ({ ...iv, student: s.student })));
    if (studentFilter) r = r.filter(iv => iv.student_id === studentFilter);
    if (statusFilter !== 'ALL') r = r.filter(iv => iv.status === statusFilter);
    return r.sort((a, b) => WORKFLOW_ORDER.indexOf(a.status) - WORKFLOW_ORDER.indexOf(b.status) || (b.id - a.id));
  }, [summaries, studentFilter, statusFilter]);

  const editingIv = editing ? rows.find(iv => iv.id === editing) : null;
  const nextStatuses = editingIv ? (INTERVENTION_STATUS_TRANSITIONS[editingIv.status] || []) : [];

  async function saveEdit() {
    if (!editingIv || draftStatus === editingIv.status) {
      setEditing(null);
      return;
    }
    if (!nextStatuses.includes(draftStatus)) {
      toast.show(`Cannot move ${statusLabel(editingIv.status)} to ${statusLabel(draftStatus)} directly.`, 'error');
      return;
    }
    setSaving(true);
    try {
      await updateStatus(editingIv.id, draftStatus);
      toast.show('Status updated.', 'success');
      setEditing(null);
      clearSummaryCache();
      reload({ force: true });
    } catch (err) {
      toast.show(err.message || 'Unable to update status.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Intervention Workflow"
      subtitle="Recommended → Assigned → In Progress → Completed → Evaluated → Escalated / Closed · click a row to advance status"
      actions={
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-panel border hairline rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-teal-400">
          <option value="ALL">All statuses</option>
          {WORKFLOW_ORDER.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      }
      className="!p-0 overflow-hidden"
    >
      {loading ? (
        <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : error ? (
        <div className="p-5"><ErrorState title="Could not load interventions" description={error.message} onRetry={reload} /></div>
      ) : rows.length === 0 ? (
        <div className="p-5"><EmptyState icon={ListFilter} title="No interventions match" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b hairline">
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-3 py-3 font-medium">Intervention</th>
                <th className="px-3 py-3 font-medium">Start</th>
                <th className="px-3 py-3 font-medium">Priority</th>
                <th className="px-3 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((iv) => {
                const meta = STATUS_META[iv.status];
                return (
                  <tr key={iv.id} className="border-b hairline last:border-0 hover:bg-void cursor-pointer" onClick={() => { setEditing(iv.id); setDraftStatus(iv.status); }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <StudentAvatar name={iv.student.name} size={26} />
                        <span className="text-slate-800">{iv.student.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{iv.intervention_label}</td>
                    <td className="px-3 py-3 text-slate-500 text-xs font-mono">{formatDate(iv.created_at)}</td>
                    <td className="px-3 py-3 text-slate-500 text-xs font-mono">{iv.priority}</td>
                    <td className="px-3 py-3 text-slate-500 text-xs max-w-[160px] truncate">{iv.reason || iv.notes}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full" style={{ color: meta.color, background: `${meta.color}1a` }}>
                        {statusLabel(iv.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={!!editingIv}
        onClose={() => setEditing(null)}
        title={editingIv?.student.title || editingIv?.student.name || ''}
        subtitle={editingIv?.intervention_label}
      >
        {editingIv && (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">Status</div>
              <select
                value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}
                className="w-full bg-panel border hairline rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-400"
              >
                {([editingIv.status, ...nextStatuses]).map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Current: {statusLabel(editingIv.status)}. Allowed next statuses: {nextStatuses.length ? nextStatuses.map(statusLabel).join(', ') : 'none (terminal)'}.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div><span className="text-slate-500">Created:</span> {formatDate(editingIv.created_at)}</div>
              <div><span className="text-slate-500">Priority:</span> {editingIv.priority}</div>
            </div>
            <button
              onClick={saveEdit}
              disabled={saving || draftStatus === editingIv.status}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50"
              style={{ background: '#7a5963', color: '#fbf3f0' }}
            >
              <Save size={13} /> {saving ? 'Saving…' : 'Save status'}
            </button>
          </div>
        )}
      </Drawer>
    </SectionCard>
  );
}

export default function Interventions() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState('copilot');
  const [activeStudentId, setActiveStudentId] = useState(params.get('student') || null);

  return (
    <div>
      <PageHeader eyebrow="Screen 06 · 07" title="Interventions" subtitle="From recommendation to closure, with validated lifecycle transitions." />
      <div className="flex gap-1 border-b hairline mb-5">
        <button onClick={() => setTab('copilot')} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 ${tab === 'copilot' ? 'border-teal-400 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <Sparkles size={13} /> Intervention Copilot
        </button>
        <button onClick={() => setTab('workflow')} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 ${tab === 'workflow' ? 'border-teal-400 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <CheckCircle2 size={13} /> Workflow
        </button>
      </div>

      {tab === 'copilot'
        ? <CopilotTab activeStudentId={activeStudentId} setActiveStudentId={setActiveStudentId} />
        : <WorkflowTab studentFilter={activeStudentId} />
      }
    </div>
  );
}

// Small indirection so these helpers stay colocated while keeping the service layer lean.
async function apiGenerate(studentId) {
  const { api } = await import('@/services/api');
  return api.generateInterventions(studentId);
}
async function updateStatus(id, status) {
  const { api } = await import('@/services/api');
  return api.updateInterventionStatus(id, status);
}