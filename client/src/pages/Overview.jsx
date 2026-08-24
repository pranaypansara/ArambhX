import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Flame, TrendingUp, Activity, BellRing, Stethoscope, ArrowRight, Sparkles } from 'lucide-react';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import KpiCard from '@/components/ui/KpiCard';
import RiskLandscape from '@/components/charts/RiskLandscape';
import RiskTrendChart from '@/components/charts/RiskTrendChart';
import InterventionSnapshot from '@/components/charts/InterventionSnapshot';
import { Skeleton, ErrorState } from '@/components/ui/States';
import { useAsyncData, fetchOverview, fetchAttentionStudents, fetchSummaries, buildCohortRiskTrend } from '@/services/data';
import { useAuth } from '@/context/AuthContext';
import { timeAgo } from '@/lib/riskUtils';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function AttentionFeedItem({ item, navigate }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-hairline last:border-0">
      <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">{item.text}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{item.when}</p>
      </div>
      <button
        onClick={() => navigate(item.to)}
        className="text-xs border border-hairline bg-panel hover:bg-panel-alt px-3 py-1.5 rounded-full text-teal font-bold shrink-0 flex items-center gap-1 shadow-sm transition"
      >
        {item.actionLabel} <ArrowRight size={11} />
      </button>
    </div>
  );
}

export default function Overview() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [overview, attention, summaries] = await Promise.all([
      fetchOverview(),
      fetchAttentionStudents(),
      fetchSummaries(),
    ]);
    return { overview, attention, summaries };
  }, []);

  const trend = useMemo(() => (data ? buildCohortRiskTrend(data.summaries) : []), [data]);

  const feed = [];
  if (data) {
    const { overview, attention, summaries } = data;

    const criticalRiser = [...summaries]
      .filter((s) => s.prediction)
      .sort((a, b) => b.velocity - a.velocity)[0];

    if (criticalRiser && criticalRiser.velocity !== 0) {
      feed.push({
        color: '#C84C4C',
        text: `${criticalRiser.student.name}'s risk changed sharply (+${criticalRiser.velocity} pts)`,
        when: timeAgo(criticalRiser.prediction.predicted_at),
        to: `/students/${criticalRiser.student.id}`,
        actionLabel: 'Investigate',
      });
    }

    if (attention.length > 0) {
      feed.push({
        color: '#D96B4A',
        text: `${attention.length} student${attention.length === 1 ? '' : 's'} currently require${attention.length === 1 ? 's' : ''} attention`,
        when: 'Based on the latest prediction cycle',
        to: '/students',
        actionLabel: 'Review',
      });
    }

    feed.push({
      color: '#D9922B',
      text: `${overview.interventionsActive} intervention${overview.interventionsActive === 1 ? '' : 's'} are currently active`,
      when: 'Updated just now',
      to: '/interventions',
      actionLabel: 'Follow Up',
    });

    const multiFactor = (overview.recentAlerts || []).find(
      (a) => a.alert_type === 'MULTI_FACTOR' && a.status !== 'RESOLVED'
    );
    if (multiFactor) {
      feed.push({
        color: '#C84C4C',
        text: `New multi-factor alert detected for ${multiFactor.student_name}`,
        when: timeAgo(multiFactor.created_at),
        to: `/alerts?id=${multiFactor.id}`,
        actionLabel: 'Assign',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-panel-alt border border-hairline rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-teal font-mono mb-1">
              Faculty Command Center
            </div>
            <h1 className="font-display text-3xl font-black text-ink tracking-tight">
              {greeting()}, {(user?.name || 'Faculty').split(' ').slice(0, 2).join(' ')}
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Here's what needs your attention today across all monitored academic tracks.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-panel border border-hairline text-xs font-bold text-ink shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-teal" />
              <span>AI Models Active</span>
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load the dashboard"
          description={error.message || 'Please try again in a moment.'}
          onRetry={() => reload({ force: true })}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <KpiCard label="Total Students" value={data.overview.total} icon={Users} accent="#2A8588" delay={0} />
            <KpiCard label="High Risk" value={data.overview.highRisk} icon={Flame} accent="#C84C4C" delay={60} />
            <KpiCard label="Medium Risk" value={data.overview.mediumRisk} icon={TrendingUp} accent="#D96B4A" delay={120} />
            <KpiCard label="ML Analyzed" value={data.overview.withPredictions} icon={Activity} accent="#D9922B" delay={180} />
            <KpiCard label="Active Alerts" value={data.overview.alertsActive} icon={BellRing} accent="#2A8588" delay={240} />
            <KpiCard label="Active Interventions" value={data.overview.interventionsActive} icon={Stethoscope} accent="#2A8588" delay={300} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <SectionCard
                title="Risk Landscape"
                subtitle="Every student, positioned by risk and how fast it's changing"
              >
                <RiskLandscape summaries={data.summaries} />
              </SectionCard>

              <SectionCard
                title="Historical Risk Trajectory"
                subtitle="Cohort average risk over the last prediction cycles"
              >
                <RiskTrendChart data={trend} />
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard
                title="Smart Attention Feed"
                subtitle="What changed since your last visit"
              >
                <div className="divide-y divide-hairline">
                  {feed.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">Nothing urgent to surface right now.</p>
                  ) : (
                    feed.map((item, i) => (
                      <AttentionFeedItem key={i} item={item} navigate={navigate} />
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Active Interventions Snapshot"
                subtitle="Breakdown of support workflows currently underway"
              >
                <InterventionSnapshot counts={data.overview.interventionsByStatus} />
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}