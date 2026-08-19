import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Sparkles, ArrowUpRight } from 'lucide-react';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import StudentAvatar from '@/components/ui/StudentAvatar';
import { formatDate, OUTCOME_META, INTERVENTION_TYPE_META } from '@/lib/riskUtils';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useAsyncData, fetchSummaries, summarizeOutcomes } from '@/services/data';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Overlay';
import { api } from '@/services/api';

function Metric({ label, before, after }) {
  const improved = after < before;
  return (
    <div>
      <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="flex items-center gap-2 font-mono">
        <span className="text-slate-500 text-sm">{before}%</span>
        <ArrowRight size={12} className="text-slate-500" />
        <span className={`text-sm font-semibold ${improved ? 'text-[#3A8F6A]' : 'text-[#C84C4C]'}`}>{after}%</span>
      </div>
    </div>
  );
}

function ImpactCard({ student, label, evaluation, created }) {
  const meta = OUTCOME_META[evaluation.classification] || OUTCOME_META.PARTIAL;
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <StudentAvatar name={student?.name} size={30} />
          <div>
            <div className="text-sm text-slate-800 font-medium">{student?.name}</div>
            <div className="text-[11px] text-slate-500">{label} · evaluated {formatDate(evaluation.evaluatedAt)}</div>
          </div>
        </div>
        <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-full" style={{ color: meta.color, background: `${meta.color}1a` }}>{meta.label}</span>
      </div>
      <div className="py-3 border-t hairline">
        <Metric label="Risk after intervention window" before={evaluation.before} after={evaluation.after} />
      </div>
      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
        Shown as an observed association between the intervention window (started {formatDate(created)}) and the latest risk reading — not a confirmed causal effect.
      </p>
    </div>
  );
}

function EscalationCard({ student, ivId, label, evaluation, onEscalate }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [confirmEscalate, setConfirmEscalate] = useState(false);
  const alternatives = Object.entries(INTERVENTION_TYPE_META)
    .filter(([key]) => key !== label.split(' ')[0].replace(/_/g, '') && key.replace(/_/g, '') !== (ivId ? '' : ''))
    .map(([key, meta]) => ({ key, label: meta.label, desc: meta.short || meta.color }))
    .slice(0, 2);

  return (
    <div className="panel p-4 border border-rose-500/20">
      <div className="flex items-center gap-2.5 mb-3">
        <StudentAvatar name={student?.name} size={30} />
        <div>
          <div className="text-sm text-slate-800 font-medium">{student?.name}</div>
          <div className="text-[11px] text-rose-500">Intervention ineffective</div>
        </div>
      </div>
      <div className="font-mono text-sm text-slate-700 mb-3">
        Risk: <span className="text-rose-600">{evaluation.before}% → {evaluation.after}%</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-teal-700 mb-2">
        <Sparkles size={12} /> Pulse recommendation
      </div>
      <p className="text-xs text-slate-500 mb-3">Consider an alternative intervention approach:</p>
      <div className="space-y-2">
        {alternatives.map((a) => (
          <div key={a.key} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
            <span className="text-slate-700">{a.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={() => navigate(`/students/${student?.id}?tab=why`)} className="text-xs font-medium px-3 py-2 rounded-lg chip text-slate-700">Review</button>
        <button
          onClick={() => navigate(`/interventions?student=${student?.id}`)}
          className="text-xs font-medium px-3 py-2 rounded-lg"
          style={{ background: '#7a5963', color: '#fbf3f0' }}
        >
          Assign alternative
        </button>
        <button onClick={() => setConfirmEscalate(true)} className="text-xs font-medium px-3 py-2 rounded-lg chip text-rose-600 ml-auto flex items-center gap-1">
          Escalate <ArrowUpRight size={12} />
        </button>
      </div>

      <Modal open={confirmEscalate} onClose={() => setConfirmEscalate(false)} title="Escalate this case?" width={380}>
        <p className="text-sm text-slate-600 mb-4">
          This moves the intervention to ESCALATED for {student?.name}, routing the case to a counselor for higher-level review. The change is saved and logged.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirmEscalate(false)} className="text-xs font-medium px-3 py-2 rounded-lg chip text-slate-600">
            Cancel
          </button>
          <button
            onClick={() => { onEscalate(); setConfirmEscalate(false); }}
            className="text-xs font-medium px-3 py-2 rounded-lg"
            style={{ background: '#ef6355', color: '#fff' }}
          >
            Yes, escalate
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function Outcomes() {
  const [params] = useSearchParams();
  const studentFilter = params.get('student');
  const [tab, setTab] = useState('impact');
  const toast = useToast();

  const { data: summaries, loading, error, reload } = useAsyncData(() => fetchSummaries(), []);

  const evaluations = useMemo(() => {
    const list = summarizeOutcomes(summaries);
    return list.map((e) => ({ ...e, label: e.iv.intervention_label, created: e.iv.created_at }));
  }, [summaries]);

  const filtered = studentFilter ? evaluations.filter((e) => String(e.studentId) === String(studentFilter)) : evaluations;
  const ineffective = filtered.filter((e) => e.evaluation.classification === 'INEFFECTIVE');
  const resolved = filtered.filter((e) => e.evaluation.classification !== 'INEFFECTIVE');

  async function escalate(id) {
    try {
      await api.updateInterventionStatus(id, 'ESCALATED');
      toast.show('Case escalated to counseling. The intervention status is now ESCALATED.', 'success');
      reload();
    } catch (err) {
      toast.show(err.message || 'Could not escalate the case.', 'error');
    }
  }

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44" />)}</div>;
  if (error) return <ErrorState title="Could not load outcomes" description={error.message} onRetry={reload} />;

  return (
    <div>
      <PageHeader eyebrow="Screen 08 · 09" title="Outcomes & Impact" subtitle="Before/after results and adaptive next steps when an intervention doesn't work." />

      <div className="flex gap-1 border-b hairline mb-5">
        <button onClick={() => setTab('impact')} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === 'impact' ? 'border-teal-400 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Impact Loop
        </button>
        <button onClick={() => setTab('escalation')} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === 'escalation' ? 'border-teal-400 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Adaptive Escalation {ineffective.length > 0 && <span className="ml-1 text-rose-500">({ineffective.length})</span>}
        </button>
      </div>

      {tab === 'impact' ? (
        resolved.length === 0 ? <SectionCard><EmptyState title="No evaluated outcomes yet" description="Once interventions have been running long enough for a newer prediction cycle, before/after impact appears here." /></SectionCard> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resolved.map((e) => <ImpactCard key={e.id} student={e.student} label={e.label} evaluation={e.evaluation} created={e.created} />)}
          </div>
        )
      ) : (
        ineffective.length === 0 ? <SectionCard><EmptyState title="No escalations needed" description="Every evaluated intervention is showing improvement or partial progress." /></SectionCard> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ineffective.map((e) => <EscalationCard key={e.id} student={e.student} ivId={e.id} label={e.label} evaluation={e.evaluation} onEscalate={() => escalate(e.id)} />)}
          </div>
        )
      )}
    </div>
  );
}