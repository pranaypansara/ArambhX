import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Stethoscope, Sparkles } from 'lucide-react';
import {
  STUDENTS, predictionHistory, factorsForPrediction, alertsForStudent,
  interventionsForStudent, outcomeForIntervention,
} from '@/data/mockData';
import { SectionCard } from '@/components/ui/Page';
import RiskBadge from '@/components/ui/RiskBadge';
import RiskGauge from '@/components/ui/RiskGauge';
import TrendIndicator from '@/components/ui/TrendIndicator';
import StudentAvatar from '@/components/ui/StudentAvatar';
import StudentRiskLine from '@/components/charts/StudentRiskLine';
import ShapChart from '@/components/charts/ShapChart';
import RiskJourneyTimeline from '@/components/student/RiskJourneyTimeline';
import { formatDate } from '@/lib/riskUtils';
import { EmptyState } from '@/components/ui/States';

const TABS = [
  { key: 'story', label: 'Risk Story' },
  { key: 'why', label: 'Why Did This Change?' },
  { key: 'history', label: 'Alerts & Interventions' },
];

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'why' ? 'why' : 'story');
  const [selectedFactor, setSelectedFactor] = useState(null);

  const student = STUDENTS.find(s => s.id === id);
  const predictions = useMemo(() => predictionHistory(id), [id]);
  const latest = predictions[predictions.length - 1];
  const previous = predictions[predictions.length - 2];
  const factors = useMemo(() => factorsForPrediction(latest?.id), [latest]);
  const alerts = useMemo(() => alertsForStudent(id), [id]);
  const interventions = useMemo(() => interventionsForStudent(id), [id]);

  const events = useMemo(() => {
    const list = [];
    predictions.forEach((p) => list.push({ type: 'prediction', date: p.predicted_at, text: `Risk prediction: ${p.risk_probability}%`, detail: `Model ${p.model_version}` }));
    alerts.forEach((a) => list.push({ type: 'alert', date: a.created_at, text: a.title, detail: `${a.alert_type.replace('_', ' ')} · ${a.severity}` }));
    interventions.forEach((iv) => {
      list.push({ type: 'intervention_assigned', date: iv.created_at, text: `${iv.intervention_label} recommended`, detail: `Status: ${iv.status.replace('_', ' ')}` });
      const outcome = outcomeForIntervention(iv.id);
      if (outcome) list.push({ type: 'outcome', date: outcome.evaluated_at, text: `Outcome: ${outcome.outcome_classification.toLowerCase()}`, detail: `${outcome.before_risk}% → ${outcome.after_risk}%` });
    });
    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [predictions, alerts, interventions]);

  if (!student || !latest) {
    return <EmptyState title="Student not found" description="This student record doesn't exist in the current dataset." />;
  }

  const velocity = previous ? Math.round((latest.risk_probability - previous.risk_probability) * 10) / 10 : 0;


  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-4">
        <ArrowLeft size={13} /> Back
      </button>

      <div className="panel p-5 mb-5">
        <div className="flex flex-wrap items-start gap-6">
          <StudentAvatar name={student.name} size={64} ring="#e6d3d6" />
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-xl font-bold text-slate-50">{student.name}</h1>
              <RiskBadge level={latest.risk_level} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400 font-mono">
              <span>{student.enrollment_number}</span>
              <span>{student.department}</span>
              <span>Semester {student.semester}</span>
              <span>Status: {student.status}</span>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
              <span>Previous readings:</span>
              <span className="font-mono text-slate-300">{predictions.map(p => `${p.risk_probability}%`).join(' → ')}</span>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => navigate(`/interventions?student=${student.id}`)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg"
                style={{ background: '#7a5963', color: '#fbf3f0' }}
              >
                <Stethoscope size={13} /> Intervention Copilot
              </button>
              <button
                onClick={() => setTab('why')}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg chip text-slate-200"
              >
                <Sparkles size={13} /> Why is this changing?
              </button>
            </div>
          </div>
          <div className="ml-auto">
            <RiskGauge value={latest.risk_probability} level={latest.risk_level} />
            <div className="flex justify-center mt-2"><TrendIndicator value={velocity} /></div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b hairline mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key ? 'border-teal-400 text-slate-50' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'story' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SectionCard title="Risk Trajectory" subtitle="Predicted risk probability over time" className="lg:col-span-2">
            <StudentRiskLine predictions={predictions} height={220} />
          </SectionCard>
          <SectionCard title="Student Risk Journey" subtitle="Every prediction, alert and intervention event">
            <RiskJourneyTimeline events={events} />
          </SectionCard>
        </div>
      )}

      {tab === 'why' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SectionCard
            title="Why is this student's risk changing?"
            subtitle="Contribution of each factor to the latest prediction — click a factor for detail"
            className="lg:col-span-2"
          >
            <ShapChart factors={factors} onSelect={setSelectedFactor} selected={selectedFactor} />
          </SectionCard>
          <SectionCard title="Current vs Previous Period" subtitle={previous ? `${formatDate(previous.predicted_at)} → ${formatDate(latest.predicted_at)}` : undefined}>
            {selectedFactor ? (() => {
              const f = factors.find(x => x.feature_name === selectedFactor);
              return (
                <div>
                  <div className="text-sm text-slate-300 mb-3">{f.feature_name}</div>
                  <div className="flex items-end gap-4">
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase tracking-wide">Current</div>
                      <div className="font-mono text-2xl text-slate-100">{f.feature_value}</div>
                    </div>
                    <TrendIndicator value={f.delta} suffix="%" />
                  </div>
                  <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                    This factor is rated <span className="text-slate-300">{f.impact_level.toLowerCase()} impact</span> on
                    the current prediction, contributing a score of {f.impact_score} in the {f.direction === 'NEGATIVE' ? 'risk-increasing' : 'risk-reducing'} direction.
                  </p>
                </div>
              );
            })() : (
              <p className="text-sm text-slate-500">Select a factor on the left to see its current value and how it shifted from the previous period.</p>
            )}
          </SectionCard>
        </div>
      )}

      {tab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SectionCard title="Alerts">
            {alerts.length === 0 ? <EmptyState title="No alerts" description="This student has no alert history." /> : (
              <div className="space-y-3">
                {alerts.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg panel-alt cursor-pointer hover:border-teal-400/40 border border-transparent" onClick={() => navigate(`/alerts?id=${a.id}`)}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-200">{a.title}</span>
                      <span className="text-[10px] font-mono uppercase text-slate-500">{a.status}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{formatDate(a.created_at)} · {a.alert_type.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
          <SectionCard title="Interventions">
            {interventions.length === 0 ? <EmptyState title="No interventions yet" description="Use the Intervention Copilot to recommend one." /> : (
              <div className="space-y-3">
                {interventions.map((iv) => (
                  <div key={iv.id} className="p-3 rounded-lg panel-alt cursor-pointer hover:border-teal-400/40 border border-transparent" onClick={() => navigate(`/interventions?student=${student.id}`)}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-200">{iv.intervention_label}</span>
                      <span className="text-[10px] font-mono uppercase text-slate-500">{iv.status.replace('_', ' ')}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Started {formatDate(iv.start_date)}</div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
