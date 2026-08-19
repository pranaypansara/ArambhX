import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentAvatar from '@/components/ui/StudentAvatar';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import RiskLandscape from '@/components/charts/RiskLandscape';
import RiskTrendChart from '@/components/charts/RiskTrendChart';
import { useAsyncData, fetchSummaries, buildCohortRiskTrend, isOverdueIntervention } from '@/services/data';
import { RISK_META } from '@/lib/riskUtils';

const overdueCount = (s) => (s.allInterventions || []).filter(isOverdueIntervention).length;

const SORTERS = {
  velocity: (a, b) => (b.velocity || 0) - (a.velocity || 0),
  priority: (a, b) => (b.priority || 0) - (a.priority || 0),
  probability: (a, b) => (b.prediction?.probability ?? 0) - (a.prediction?.probability ?? 0),
  overdue: (a, b) => overdueCount(b) - overdueCount(a),
};

export default function RiskIntelligence() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('fastest');

  const { data, loading, error, reload } = useAsyncData(() => fetchSummaries(), []);
  const summaries = data || [];

  const trend = buildCohortRiskTrend(summaries);
  const list = [...summaries].sort(SORTERS[tab] || SORTERS.velocity);

  const TABS = {
    fastest: { label: 'Deteriorating fastest', tip: 'Ranked by risk velocity — how many points risk moved since the last prediction cycle.' },
    sharpest: { label: 'Highest priority', tip: 'Ranked by Pulse priority score (risk, velocity, alerts and overdue interventions combined).' },
    probability: { label: 'Highest risk', tip: 'Ranked by current risk probability.' },
    overdue: { label: 'Overdue follow-ups', tip: 'Risk learners sorted by how many interventions are past their follow-up date.' },
  };

  return (
    <div>
      <PageHeader eyebrow="Advanced Analytics" title="Risk Intelligence" subtitle="CoLisS-ranked risk view — who is deteriorating, who needs attention first, and how the cohort is moving." />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-5">
        <SectionCard title="Risk Landscape" className="lg:col-span-3">
          {loading ? <Skeleton className="h-[300px]" /> : error ? <ErrorState title="Could not load risk landscape" description={error.message} onRetry={reload} /> : (
            <RiskLandscape summaries={summaries} />
          )}
        </SectionCard>
        <SectionCard title="Cohort risk trend" className="lg:col-span-2">
          {loading ? <Skeleton className="h-[300px]" /> : error ? <ErrorState title="Could not load trend" description={error.message} onRetry={reload} /> : (
            <RiskTrendChart data={trend} />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Rankings"
        subtitle="Switch between risk views — each is a different decision lens."
      >
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(TABS).map(([key, t]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`chip text-xs px-3 py-1.5 rounded-full font-medium ${tab === key ? 'ring-teal-300' : ''}`}
              style={tab === key ? { background: 'rgba(42,133,136,0.12)', color: '#1f7a7d', boxShadow: 'inset 0 0 0 1px rgba(42,133,136,0.4)' } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500 mb-4">{TABS[tab].tip}</p>

        {loading ? (
          <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : error ? (
          <ErrorState title="Could not load rankings" description={error.message} onRetry={reload} />
        ) : list.length === 0 ? (
          <EmptyState title="No student data yet" description="Run predictions first so Pulse can rank risk." />
        ) : (
          <div className="divide-y hairline">
            {list.slice(0, 12).map((s, i) => {
              const meta = RISK_META[s.prediction?.risk_level] || RISK_META.LOW;
              const velocity = s.velocity || 0;
              const vColor = velocity > 2 ? '#ef6355' : velocity < -2 ? '#9fe066' : '#eaa73f';
              return (
                <button
                  key={s.student?.id}
                  onClick={() => navigate(`/students/${s.student?.id}`)}
                  className="w-full flex items-center gap-3 py-3 px-1 text-left hover:bg-[#F8FAF9] rounded-lg"
                >
                  <span className="w-5 text-center font-mono text-xs text-slate-400">{i + 1}</span>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${vColor}1f`, color: vColor }}>
                    {velocity > 0 ? '+' : ''}{Math.round(velocity)}
                  </span>
                  <StudentAvatar name={s.student?.name} size={36} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-slate-800 truncate">{s.student?.name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{s.student?.rollNo || s.student?.id} · {s.openAlerts?.length || 0} alert(s)</span>
                  </span>
                  <span className="w-14 text-right">
                    <span className="block text-sm font-mono text-slate-800">{s.prediction?.probability ?? '—'}%</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}