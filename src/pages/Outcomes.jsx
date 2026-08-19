import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Sparkles, ArrowUpRight } from 'lucide-react';
import {
  INTERVENTION_OUTCOMES, INTERVENTIONS, STUDENTS, recommendInterventions,
} from '@/data/mockData';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import StudentAvatar from '@/components/ui/StudentAvatar';
import { OUTCOME_META, formatDate } from '@/lib/riskUtils';
import { EmptyState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Overlay';

function Metric({ label, before, after, suffix = '%', invert = false }) {
  const improved = invert ? after < before : after > before;
  return (
    <div>
      <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="flex items-center gap-2 font-mono">
        <span className="text-slate-400 text-sm">{before}{suffix}</span>
        <ArrowRight size={12} className="text-slate-600" />
        <span className={`text-sm font-semibold ${improved ? 'text-lime-300' : 'text-rose-300'}`}>{after}{suffix}</span>
      </div>
    </div>
  );
}

function ImpactCard({ outcome }) {
  const iv = INTERVENTIONS.find(i => i.id === outcome.intervention_id);
  const student = STUDENTS.find(s => s.id === outcome.student_id);
  const meta = OUTCOME_META[outcome.outcome_classification];
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <StudentAvatar name={student.name} size={30} />
          <div>
            <div className="text-sm text-slate-200 font-medium">{student.name}</div>
            <div className="text-[11px] text-slate-500">{iv.intervention_label} · evaluated {formatDate(outcome.evaluated_at)}</div>
          </div>
        </div>
        <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-full" style={{ color: meta.color, background: `${meta.color}1a` }}>{meta.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-4 py-3 border-t hairline">
        <Metric label="Risk" before={outcome.before_risk} after={outcome.after_risk} invert />
        <Metric label="Attendance" before={Math.round(outcome.before_attendance)} after={Math.round(outcome.after_attendance)} />
        <Metric label="Marks" before={Math.round(outcome.before_marks)} after={Math.round(outcome.after_marks)} />
      </div>
      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
        Result shown as an observed association between the intervention window and these metrics — not a confirmed causal effect.
      </p>
    </div>
  );
}

function EscalationCard({ outcome }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [confirmEscalate, setConfirmEscalate] = useState(false);
  const iv = INTERVENTIONS.find(i => i.id === outcome.intervention_id);
  const student = STUDENTS.find(s => s.id === outcome.student_id);
  const alternatives = recommendInterventions(student.id).filter(r => r.type !== iv.intervention_type).slice(0, 2);

  return (
    <div className="panel p-4 border border-rose-500/20">
      <div className="flex items-center gap-2.5 mb-3">
        <StudentAvatar name={student.name} size={30} />
        <div>
          <div className="text-sm text-slate-200 font-medium">{student.name}</div>
          <div className="text-[11px] text-rose-300">Intervention ineffective</div>
        </div>
      </div>
      <div className="font-mono text-sm text-slate-300 mb-3">
        Risk: <span className="text-rose-300">{outcome.before_risk}% → {outcome.after_risk}%</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-teal-300 mb-2">
        <Sparkles size={12} /> Pulse recommendation
      </div>
      <p className="text-xs text-slate-400 mb-3">Consider an alternative intervention:</p>
      <div className="space-y-2">
        {alternatives.map((a) => (
          <div key={a.type} className="flex items-center justify-between text-sm bg-[#ffffff] rounded-lg px-3 py-2">
            <span className="text-slate-200">{a.label}</span>
            <span className="font-mono text-xs text-slate-400">{a.suitability}%</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={() => navigate(`/students/${student.id}?tab=why`)} className="text-xs font-medium px-3 py-2 rounded-lg chip text-slate-200">Review</button>
        <button
          onClick={() => toast?.push(`${alternatives[0]?.label} assigned to ${student.name}.`, 'success')}
          className="text-xs font-medium px-3 py-2 rounded-lg"
          style={{ background: '#7a5963', color: '#fbf3f0' }}
        >
          Assign
        </button>
        <button onClick={() => setConfirmEscalate(true)} className="text-xs font-medium px-3 py-2 rounded-lg chip text-rose-300 ml-auto flex items-center gap-1">
          Escalate <ArrowUpRight size={12} />
        </button>
      </div>

      <Modal open={confirmEscalate} onClose={() => setConfirmEscalate(false)} title="Escalate this case?" width={380}>
        <p className="text-sm text-slate-300 mb-4">
          This routes {student.name}'s case to a counselor for higher-level review, since the current intervention
          hasn't shown improvement. This action will be logged.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirmEscalate(false)} className="text-xs font-medium px-3 py-2 rounded-lg chip text-slate-300">
            Cancel
          </button>
          <button
            onClick={() => { toast?.push(`${student.name}'s case escalated to counseling.`, 'warning'); setConfirmEscalate(false); }}
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

  const outcomes = useMemo(() => {
    let r = [...INTERVENTION_OUTCOMES];
    if (studentFilter) r = r.filter(o => o.student_id === studentFilter);
    return r.sort((a, b) => new Date(b.evaluated_at) - new Date(a.evaluated_at));
  }, [studentFilter]);

  const ineffective = outcomes.filter(o => o.outcome_classification === 'INEFFECTIVE');
  const resolved = outcomes.filter(o => o.outcome_classification !== 'INEFFECTIVE');

  return (
    <div>
      <PageHeader eyebrow="Screen 08 · 09" title="Outcomes & Impact" subtitle="Before/after results and adaptive next steps when an intervention doesn't work." />

      <div className="flex gap-1 border-b hairline mb-5">
        <button onClick={() => setTab('impact')} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === 'impact' ? 'border-teal-400 text-slate-50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
          Impact Loop
        </button>
        <button onClick={() => setTab('escalation')} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === 'escalation' ? 'border-teal-400 text-slate-50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
          Adaptive Escalation {ineffective.length > 0 && <span className="ml-1 text-rose-400">({ineffective.length})</span>}
        </button>
      </div>

      {tab === 'impact' ? (
        resolved.length === 0 ? <SectionCard><EmptyState title="No evaluated outcomes yet" /></SectionCard> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resolved.map((o) => <ImpactCard key={o.id} outcome={o} />)}
          </div>
        )
      ) : (
        ineffective.length === 0 ? <SectionCard><EmptyState title="No escalations needed" description="Every evaluated intervention is showing improvement or partial progress." /></SectionCard> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ineffective.map((o) => <EscalationCard key={o.id} outcome={o} />)}
          </div>
        )
      )}
    </div>
  );
}
