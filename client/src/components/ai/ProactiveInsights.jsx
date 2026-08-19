import { useState } from 'react';
import { ChevronDown, ArrowUpRight } from 'lucide-react';
import { Skeleton, ErrorState } from '@/components/ui/States';
import { useAsyncData, fetchSummaries } from '@/services/data';
import { RISK_META } from '@/lib/riskUtils';

const KIND_COLOR = {
  CRITICAL_ENTRY: '#ef6355',
  RAPID_DECLINE: '#f2884f',
  FOLLOW_UP_DUE: '#eaa73f',
  IMPROVED: '#9fe066',
};

function buildInsights(summaries) {
  const withVelocity = summaries.filter((s) => s.velocity !== 0).sort((a, b) => (b.velocity || 0) - (a.velocity || 0));

  const insights = [];

  const rising = withVelocity.filter((s) => (s.velocity || 0) > 0 && s.prediction?.risk_level === 'HIGH');
  const worst = withVelocity[0];
  if (rising.length > 0 && worst) {
    const meta = RISK_META[worst.prediction?.risk_level] || RISK_META.LOW;
    insights.push({
      id: 'rapid',
      kind: 'RAPID_DECLINE',
      text: `${worst.student?.name}'s risk rose ${Math.round(worst.velocity)} points since the last cycle.`,
      why: `Velocity is computed from the change in risk probability between the current prediction and the previous one. ${worst.student?.name} has the fastest deterioration right now.`,
      who: `${worst.student?.name} is currently ${worst.prediction?.probability ?? '—'}% ${meta.label.toLowerCase()} risk with ${worst.openAlerts?.length || 0} open alert(s) and ${worst.activeInterventions?.length || 0} active intervention(s).`,
      action: 'Open Risk Intelligence',
    });
  } else if (worst) {
    const meta = RISK_META[worst.prediction?.risk_level] || RISK_META.LOW;
    insights.push({
      id: 'rapid',
      kind: 'RAPID_DECLINE',
      text: `${worst.student?.name} has the fastest deterioration speed this cycle.`,
      why: `Risk velocity compares the latest prediction to the previous cycle. ${worst.student?.name} moved ${Math.round(worst.velocity)} points.`,
      who: `${worst.student?.name} is currently ${worst.prediction?.probability ?? '—'}% ${meta.label.toLowerCase()} risk.`,
      action: 'Open Risk Intelligence',
    });
  }

  const improving = [...withVelocity].reverse();
  if (improving.length > 0 && improving[0].velocity < 0) {
    const best = improving[0];
    insights.push({
      id: 'improved',
      kind: 'IMPROVED',
      text: `${best.student?.name}'s risk improved by ${Math.round(Math.abs(best.velocity))} points.`,
      why: `A negative velocity means the latest prediction is lower than the previous one — keep the interventions running.`,
      who: `${best.student?.name} is now at ${best.prediction?.probability ?? '—'}% risk.`,
      action: 'Open Student Profile',
    });
  }

  const due = summaries.flatMap((s) => (s.allInterventions || []).filter((iv) => iv.isOpen && iv.followUp && new Date(iv.followUp) < new Date()).map((iv) => ({ s, iv })));
  if (due.length > 0) {
    insights.push({
      id: 'followup',
      kind: 'FOLLOW_UP_DUE',
      text: `${due.length} active intervention(s) have a follow-up date that has passed.`,
      why: `Pulse flags interventions whose planned follow-up is behind schedule so no strategy goes silent.`,
      who: due.slice(0, 3).map(({ s, iv }) => `${s.student?.name} — ${iv.type.replace(/_/g, ' ').toLowerCase()}`).join('; '),
      action: 'Open Interventions',
    });
  }

  const critical = summaries.find((s) => s.prediction?.risk_level === 'HIGH' && (s.velocity || 0) > 0);
  if (critical && !insights.some((i) => i.id === 'rapid')) {
    insights.push({
      id: 'critical',
      kind: 'CRITICAL_ENTRY',
      text: `${critical.student?.name} has entered the HIGH risk band.`,
      why: `This cycle's model flags the student at HIGH risk with a rising velocity — the strongest signal to add a formal intervention now.`,
      who: `${critical.student?.name} is at ${critical.prediction?.probability ?? '—'}% risk.`,
      action: 'Open Smart Alerts',
    });
  }

  return insights;
}

export default function ProactiveInsights({ onNavigate }) {
  const { data, loading, error } = useAsyncData(() => fetchSummaries(), []);
  const insights = data ? buildInsights(data) : [];
  const [openId, setOpenId] = useState(null);

  if (loading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (error) return <ErrorState title="Could not compute insights" description={error.message} />;

  return (
    <div className="space-y-2">
      {insights.length === 0 && (
        <div className="panel px-4 py-3.5 text-sm text-slate-500">
          Pulse hasn't noticed anything unusual yet. Once predictions and alerts are flowing, what it spots will show up here.
        </div>
      )}
      {insights.map((insight) => {
        const isOpen = openId === insight.id;
        const color = KIND_COLOR[insight.kind];
        return (
          <div key={insight.id} className="panel overflow-hidden">
            <button
              onClick={() => setOpenId(isOpen ? null : insight.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-sm text-slate-700 flex-1">{insight.text}</span>
              <ChevronDown size={15} className={`text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1 space-y-2.5 text-sm border-t hairline">
                <div className="pt-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Why?</div>
                  <p className="text-slate-600">{insight.why}</p>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Who?</div>
                  <p className="text-slate-600">{insight.who}</p>
                </div>
                <button
                  onClick={onNavigate}
                  className="mt-1 inline-flex items-center gap-1.5 text-teal-600 text-xs font-medium chip px-2.5 py-1.5 rounded-full"
                >
                  {insight.action} <ArrowUpRight size={12} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}