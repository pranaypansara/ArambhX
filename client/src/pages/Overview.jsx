import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Flame, TrendingUp, ArrowDownRight, BellRing, Stethoscope, ArrowRight, Sparkles } from 'lucide-react';
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
    <div className="flex items-start gap-3 py-3 border-b border-[#D9E8E7] last:border-0">
      <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#153A5B]">{item.text}</p>
        <p className="text-[11px] text-[#607580] mt-0.5">{item.when}</p>
      </div>
      <button
        onClick={() => navigate(item.to)}
        className="text-xs border border-[#D9E8E7] bg-[#FFFFFF] hover:bg-[#EDF7F8] px-3 py-1.5 rounded-full text-[#2A8588] font-bold shrink-0 flex items-center gap-1 shadow-sm transition"
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
      color: '#C84C4C',
      text: `${criticalRise.student.name}'s risk increased significantly (+${criticalRise.velocity} pts)`,
      when: timeAgo(criticalRise.prediction.predicted_at),
      to: `/students/${criticalRise.student.id}`,
      actionLabel: 'Investigate',
    },
    {
      color: '#D9922B',
      text: `${followUps} interventions require follow-up`,
      when: 'Updated just now',
      to: '/interventions',
      actionLabel: 'Follow Up',
    },
    {
      color: '#D96B4A',
      text: `${sustained} students show sustained deterioration`,
      when: 'Across the last prediction cycle',
      to: '/students',
      actionLabel: 'Review',
    },
    multiFactor && {
      color: '#C84C4C',
      text: `New multi-factor alert detected for ${ALL_STUDENT_SUMMARIES.find(s => s.student.id === multiFactor.student_id)?.student.name}`,
      when: timeAgo(multiFactor.created_at),
      to: `/alerts?id=${multiFactor.id}`,
      actionLabel: 'Assign',
    },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      
      {/* Dedicated Clean Greeting Banner Section */}
      <div className="bg-[#EDF7F8] border border-[#D9E8E7] rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#2A8588] font-mono mb-1">
              Faculty Command Center
            </div>
            <h1 className="font-display text-3xl font-black text-[#153A5B] tracking-tight">
              {greeting()}, {CURRENT_USER.name.split(' ').slice(0, 2).join(' ')}
            </h1>
            <p className="text-sm text-[#607580] font-medium mt-1">
              Here's what needs your attention today across all monitored academic tracks.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#D9E8E7] text-xs font-bold text-[#153A5B] shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#2A8588]" />
              <span>AI Models Active</span>
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <KpiCard label="Total Students" value={kpis.total} icon={Users} accent="#2A8588" delay={0} />
          <KpiCard label="Critical Risk" value={kpis.critical} icon={Flame} accent="#C84C4C" delay={60} />
          <KpiCard label="High Risk" value={kpis.high} icon={TrendingUp} accent="#D96B4A" delay={120} />
          <KpiCard label="Deteriorating" value={kpis.deteriorating} icon={ArrowDownRight} accent="#D9922B" delay={180} />
          <KpiCard label="Active Alerts" value={kpis.activeAlerts} icon={BellRing} accent="#2A8588" delay={240} />
          <KpiCard label="Active Interventions" value={kpis.interventions} icon={Stethoscope} accent="#2A8588" delay={300} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Risk Landscape"
            subtitle="Every student, positioned by risk and how fast it's changing"
          >
            <RiskLandscape />
          </SectionCard>

          <SectionCard
            title="Historical Risk Trajectory"
            subtitle="Overall cohort risk distribution over recent evaluation cycles"
          >
            <RiskTrendChart />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Smart Attention Feed"
            subtitle="What changed since your last visit"
          >
            <div className="divide-y divide-[#D9E8E7]">
              {feed.map((item, i) => (
                <AttentionFeedItem key={i} item={item} navigate={navigate} />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Active Interventions Snapshot"
            subtitle="Breakdown of support workflows currently underway"
          >
            <InterventionSnapshot />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
