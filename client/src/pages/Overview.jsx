import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Flame, TrendingUp, ArrowDownRight, BellRing, Stethoscope, ArrowRight } from 'lucide-react';
import { CURRENT_USER, institutionalKpis, ALL_STUDENT_SUMMARIES, ALERTS } from '@/data/mockData';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import KpiCard from '@/components/ui/KpiCard';
import RiskLandscape from '@/components/charts/RiskLandscape';
import RiskTrendChart from '@/components/charts/RiskTrendChart';
import InterventionSnapshot from '@/components/charts/InterventionSnapshot';
import { Skeleton } from '@/components/ui/States';
import { timeAgo } from '@/lib/riskUtils';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function AttentionFeedItem({ item, navigate }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b hairline last:border-0">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200">{item.text}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{item.when}</p>
      </div>
      <button
        onClick={() => navigate(item.to)}
        className="text-xs chip px-2.5 py-1.5 rounded-full text-teal-300 shrink-0 flex items-center gap-1"
      >
        {item.actionLabel} <ArrowRight size={11} />
      </button>
    </div>
  );
}

export default function Overview() {
  const navigate = useNavigate();
  const kpis = institutionalKpis();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, []);

  const criticalRise = [...ALL_STUDENT_SUMMARIES].sort((a, b) => b.velocity - a.velocity)[0];
  const followUps = ALERTS.filter(a => a.status === 'ASSIGNED').length;
  const sustained = ALL_STUDENT_SUMMARIES.filter(s => s.velocity > 4).length;
  const multiFactor = ALERTS.filter(a => a.alert_type === 'MULTI_FACTOR' && a.status !== 'RESOLVED')[0];

  const feed = [
    criticalRise && {
      color: '#ef6355',
      text: `${criticalRise.student.name}'s risk increased significantly (+${criticalRise.velocity} pts)`,
      when: timeAgo(criticalRise.prediction.predicted_at),
      to: `/students/${criticalRise.student.id}`,
      actionLabel: 'Investigate',
    },
    {
      color: '#eaa73f',
      text: `${followUps} interventions require follow-up`,
      when: 'Updated just now',
      to: '/interventions',
      actionLabel: 'Follow Up',
    },
    {
      color: '#f2884f',
      text: `${sustained} students show sustained deterioration`,
      when: 'Across the last prediction cycle',
      to: '/students',
      actionLabel: 'Review',
    },
    multiFactor && {
      color: '#ef6355',
      text: `New multi-factor alert detected for ${ALL_STUDENT_SUMMARIES.find(s => s.student.id === multiFactor.student_id)?.student.name}`,
      when: timeAgo(multiFactor.created_at),
      to: `/alerts?id=${multiFactor.id}`,
      actionLabel: 'Assign',
    },
  ].filter(Boolean);

  return (
    <div>
      <PageHeader
        eyebrow="Faculty Command Center"
        title={`${greeting()}, ${CURRENT_USER.name.split(' ').slice(0, 2).join(' ')}`}
        subtitle="Here's what needs your attention today."
      />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          <KpiCard label="Total Students" value={kpis.total} icon={Users} accent="#c98f9f" delay={0} />
          <KpiCard label="Critical Risk" value={kpis.critical} icon={Flame} accent="#ef6355" delay={60} />
          <KpiCard label="High Risk" value={kpis.high} icon={TrendingUp} accent="#f2884f" delay={120} />
          <KpiCard label="Deteriorating" value={kpis.deteriorating} icon={ArrowDownRight} accent="#eaa73f" delay={180} />
          <KpiCard label="Active Alerts" value={kpis.activeAlerts} icon={BellRing} accent="#eaa73f" delay={240} />
          <KpiCard label="Active Interventions" value={kpis.activeInterventions} icon={Stethoscope} accent="#7a5963" delay={300} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard
          title="Risk Landscape"
          subtitle="Every student, positioned by risk and how fast it's changing"
          className="lg:col-span-2"
        >
          {loading ? <Skeleton className="h-[340px]" /> : <RiskLandscape />}
          <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-500 font-mono flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#9fe066' }} />Stable</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#eaa73f' }} />Watch</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#f2884f' }} />Deteriorating</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#ef6355' }} />Critical</span>
            <span className="ml-auto">Click any node to open a student</span>
          </div>
        </SectionCard>

        <SectionCard title="Smart Attention Feed" subtitle="What changed since your last visit">
          <div>
            {feed.map((item, i) => <AttentionFeedItem key={i} item={item} navigate={navigate} />)}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <SectionCard title="Risk Trend Overview" subtitle="Average institutional risk across the last 5 prediction cycles">
          <RiskTrendChart />
        </SectionCard>

        <SectionCard title="Intervention Snapshot" subtitle="Where every active case sits in the workflow">
          <InterventionSnapshot />
        </SectionCard>
      </div>
    </div>
  );
}
