import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, CheckCircle2, ChevronDown, ListFilter, Save } from 'lucide-react';
import {
  ALL_STUDENT_SUMMARIES, STUDENTS, USERS, INTERVENTIONS,
  recommendInterventions, factorsForPrediction, outcomeForIntervention,
} from '@/data/mockData';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import StudentAvatar from '@/components/ui/StudentAvatar';
import RiskBadge from '@/components/ui/RiskBadge';
import { STATUS_META, OUTCOME_META, formatDate } from '@/lib/riskUtils';
import { EmptyState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { Drawer } from '@/components/ui/Overlay';

const WORKFLOW_ORDER = ['RECOMMENDED', 'ASSIGNED', 'STARTED', 'MONITORING', 'COMPLETED', 'EVALUATED', 'ESCALATED', 'CLOSED'];

function RecommendationCard({ rec, rank, onAssign, forceExpanded }) {
  const [localExpanded, setLocalExpanded] = useState(rank === 0);
  const expanded = forceExpanded || localExpanded;
  return (
    <div className="panel p-4">
      <button className="w-full flex items-center gap-3 text-left" onClick={() => setLocalExpanded(e => !e)}>
        <span className="font-mono text-xs text-slate-500 w-5">#{rank + 1}</span>
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-100">{rec.label}</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 flex-1 max-w-[140px] rounded-full bg-[#f6ece9] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${rec.suitability}%`, background: rec.suitability >= 75 ? '#9fe066' : rec.suitability >= 50 ? '#eaa73f' : '#b39a9f' }} />
            </div>
            <span className="font-mono text-xs text-slate-400">{rec.suitability}% suitability</span>
          </div>
        </div>
        <ChevronDown size={15} className={`text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t hairline space-y-3">
          <p className="text-sm text-slate-300">{rec.purpose}</p>
          {rec.supportingFactors.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">Supporting risk factors</div>
              <div className="flex flex-wrap gap-1.5">
                {rec.supportingFactors.map((f) => (
                  <span key={f} className="text-xs px-2 py-0.5 rounded-full text-amber-300" style={{ background: '#eaa73f18', border: '1px solid #eaa73f30' }}>{f}</span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => onAssign(rec)} className="text-xs font-medium px-3 py-2 rounded-lg" style={{ background: '#7a5963', color: '#fbf3f0' }}>
              Assign Intervention
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CopilotTab({ activeStudentId, setActiveStudentId }) {
  const toast = useToast();
  const [allExpanded, setAllExpanded] = useState(false);
  const priorityStudents = useMemo(() => [...ALL_STUDENT_SUMMARIES].filter(s => s.prediction.risk_level !== 'STABLE').sort((a, b) => b.priority - a.priority), []);
  const active = activeStudentId ? ALL_STUDENT_SUMMARIES.find(s => s.student.id === activeStudentId) : priorityStudents[0];

  const recs = active ? recommendInterventions(active.student.id) : [];
  const factors = active ? factorsForPrediction(active.prediction.id).filter(f => f.direction === 'NEGATIVE').slice(0, 3) : [];
  const pastInterventions = active ? INTERVENTIONS.filter(iv => iv.student_id === active.student.id) : [];
  const pastOutcomes = pastInterventions.map(iv => outcomeForIntervention(iv.id)).filter(Boolean);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <SectionCard title="Priority students" subtitle="Select a student to see recommendations">
        <div className="space-y-1.5 max-h-[520px] overflow-y-auto -mx-1 px-1">
          {priorityStudents.map((s) => (
            <button
              key={s.student.id}
              onClick={() => setActiveStudentId(s.student.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${active?.student.id === s.student.id ? 'bg-[#F6ECE9]' : 'hover:bg-white/5'}`}
            >
              <StudentAvatar name={s.student.name} size={28} />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-slate-200 truncate">{s.student.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">{s.prediction.risk_probability}% risk</div>
              </div>
              <RiskBadge level={s.prediction.risk_level} size="sm" />
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="lg:col-span-2 space-y-5">
        {active && (
          <SectionCard title="Help me decide the best intervention" subtitle={`Context for ${active.student.name}`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">Risk</div>
                <div className="font-mono text-lg text-slate-100">{active.prediction.risk_probability}%</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">Level</div>
                <RiskBadge level={active.prediction.risk_level} size="sm" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">Open alerts</div>
                <div className="font-mono text-lg text-slate-100">{active.openAlerts.length}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">Active cases</div>
                <div className="font-mono text-lg text-slate-100">{active.activeInterventions.length}</div>
              </div>
            </div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">Recent deterioration</div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {factors.map((f) => (
                <span key={f.id} className="text-xs px-2 py-0.5 rounded-full text-rose-300" style={{ background: '#ef635518', border: '1px solid #ef635530' }}>
                  {f.feature_name} ↓{Math.abs(f.delta).toFixed(0)}%
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t hairline">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">Existing interventions</div>
                {pastInterventions.length === 0 ? (
                  <p className="text-xs text-slate-500">None on record.</p>
                ) : (
                  <ul className="space-y-1">
                    {pastInterventions.map(iv => (
                      <li key={iv.id} className="text-xs text-slate-300">{iv.intervention_label} <span className="text-slate-500">· {iv.status.replace('_', ' ')}</span></li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">Previous outcomes</div>
                {pastOutcomes.length === 0 ? (
                  <p className="text-xs text-slate-500">No evaluated outcomes yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {pastOutcomes.map(o => (
                      <li key={o.id} className="text-xs" style={{ color: o.outcome_classification === 'IMPROVED' ? '#9fe066' : o.outcome_classification === 'INEFFECTIVE' ? '#ef6355' : '#eaa73f' }}>
                        {o.before_risk}% → {o.after_risk}% ({o.outcome_classification.toLowerCase()})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-display font-semibold text-slate-200">Ranked recommendations</h3>
          <button onClick={() => setAllExpanded(v => !v)} className="text-xs text-teal-300 chip px-2.5 py-1 rounded-full">
            {allExpanded ? 'Collapse alternatives' : 'View Alternatives'}
          </button>
        </div>

        <div className="space-y-3">
          {recs.map((rec, i) => (
            <RecommendationCard
              key={rec.type} rec={rec} rank={i}
              forceExpanded={allExpanded}
              onAssign={() => toast?.push(`${rec.label} assigned to ${active.student.name}. Case moved to Assigned.`, 'success')}
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
  const [overrides, setOverrides] = useState({}); // iv.id -> { status, notes }
  const [editing, setEditing] = useState(null); // iv.id currently open in drawer
  const [draftStatus, setDraftStatus] = useState('');
  const [draftNotes, setDraftNotes] = useState('');

  const rows = useMemo(() => {
    let r = INTERVENTIONS.map(iv => ({ ...iv, ...overrides[iv.id] }));
    if (studentFilter) r = r.filter(iv => iv.student_id === studentFilter);
    if (statusFilter !== 'ALL') r = r.filter(iv => iv.status === statusFilter);
    return r.sort((a, b) => WORKFLOW_ORDER.indexOf(a.status) - WORKFLOW_ORDER.indexOf(b.status));
  }, [studentFilter, statusFilter, overrides]);

  const editingIv = editing ? INTERVENTIONS.find(iv => iv.id === editing) : null;

  function openEdit(iv) {
    setEditing(iv.id);
    setDraftStatus(iv.status);
    setDraftNotes(overrides[iv.id]?.notes ?? iv.notes);
  }

  function saveEdit() {
    setOverrides((o) => ({ ...o, [editing]: { status: draftStatus, notes: draftNotes } }));
    toast?.push('Workflow updated.', 'success');
    setEditing(null);
  }

  return (
    <SectionCard
      title="Intervention Workflow"
      subtitle="Recommended → Assigned → Started → Monitoring → Completed → Evaluated → Escalated/Closed · click a row to update"
      actions={
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[#ffffff] border hairline rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-teal-400">
          <option value="ALL">All statuses</option>
          {WORKFLOW_ORDER.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      }
      className="!p-0 overflow-hidden"
    >
      {rows.length === 0 ? <div className="p-5"><EmptyState icon={ListFilter} title="No interventions match" /></div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b hairline">
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-3 py-3 font-medium">Intervention</th>
                <th className="px-3 py-3 font-medium">Assigned</th>
                <th className="px-3 py-3 font-medium">Start</th>
                <th className="px-3 py-3 font-medium">Due</th>
                <th className="px-3 py-3 font-medium">Follow-up</th>
                <th className="px-3 py-3 font-medium">Notes</th>
                <th className="px-3 py-3 font-medium">Outcome</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((iv) => {
                const student = STUDENTS.find(s => s.id === iv.student_id);
                const staff = USERS.find(u => u.id === iv.assigned_to);
                const meta = STATUS_META[iv.status];
                const outcome = outcomeForIntervention(iv.id);
                return (
                  <tr key={iv.id} className="border-b hairline last:border-0 hover:bg-white/[0.02] cursor-pointer" onClick={() => openEdit(iv)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <StudentAvatar name={student.name} size={26} />
                        <span className="text-slate-200">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-300">{iv.intervention_label}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs">{staff?.name}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs font-mono">{formatDate(iv.start_date)}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs font-mono">{formatDate(iv.due_date)}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs font-mono">{formatDate(iv.follow_up_date)}</td>
                    <td className="px-3 py-3 text-slate-500 text-xs max-w-[160px] truncate">{iv.notes}</td>
                    <td className="px-3 py-3 text-xs">
                      {outcome ? (
                        <span className="font-mono" style={{ color: OUTCOME_META[outcome.outcome_classification].color }}>
                          {OUTCOME_META[outcome.outcome_classification].label}
                        </span>
                      ) : <span className="text-slate-600">Pending</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full" style={{ color: meta.color, background: `${meta.color}1a` }}>{iv.status.replace('_', ' ')}</span>
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
        title={editingIv ? STUDENTS.find(s => s.id === editingIv.student_id)?.name : ''}
        subtitle={editingIv?.intervention_label}
      >
        {editingIv && (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">Status</div>
              <select
                value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}
                className="w-full bg-[#ffffff] border hairline rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-400"
              >
                {WORKFLOW_ORDER.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">Notes</div>
              <textarea
                value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)}
                rows={4}
                className="w-full bg-[#ffffff] border hairline rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-400 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
              <div><span className="text-slate-500">Started:</span> {formatDate(editingIv.start_date)}</div>
              <div><span className="text-slate-500">Due:</span> {formatDate(editingIv.due_date)}</div>
              <div><span className="text-slate-500">Follow-up:</span> {formatDate(editingIv.follow_up_date)}</div>
              <div><span className="text-slate-500">Assigned:</span> {USERS.find(u => u.id === editingIv.assigned_to)?.name}</div>
            </div>
            <button
              onClick={saveEdit}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg"
              style={{ background: '#7a5963', color: '#fbf3f0' }}
            >
              <Save size={13} /> Save changes
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
      <PageHeader eyebrow="Screen 06 · 07" title="Interventions" subtitle="From recommendation to closure, with suitability-ranked guidance." />
      <div className="flex gap-1 border-b hairline mb-5">
        <button onClick={() => setTab('copilot')} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 ${tab === 'copilot' ? 'border-teal-400 text-slate-50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
          <Sparkles size={13} /> Intervention Copilot
        </button>
        <button onClick={() => setTab('workflow')} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 ${tab === 'workflow' ? 'border-teal-400 text-slate-50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
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
