import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { ALL_STUDENT_SUMMARIES } from '@/data/mockData';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import RiskLandscape from '@/components/charts/RiskLandscape';
import RiskTrendChart from '@/components/charts/RiskTrendChart';
import StudentAvatar from '@/components/ui/StudentAvatar';
import RiskBadge from '@/components/ui/RiskBadge';
import TrendIndicator from '@/components/ui/TrendIndicator';

export default function RiskIntelligence() {
  const navigate = useNavigate();
  const fastest = useMemo(() => [...ALL_STUDENT_SUMMARIES].sort((a, b) => b.velocity - a.velocity).slice(0, 8), []);

  return (
    <div>
      <PageHeader eyebrow="Risk Intelligence" title="Detect Change" subtitle="Where risk is concentrated, and who is moving fastest right now." />

      <SectionCard title="Risk Landscape" subtitle="Full institutional view — risk probability vs. deterioration velocity" className="mb-5">
        <RiskLandscape />
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Fastest Deteriorating" subtitle="Ranked by change since the last prediction cycle, not absolute risk">
          <div className="space-y-1">
            {fastest.map((s) => (
              <button
                key={s.student.id}
                onClick={() => navigate(`/students/${s.student.id}`)}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-white/5 text-left"
              >
                <Zap size={13} className="text-amber-400 shrink-0" />
                <StudentAvatar name={s.student.name} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 truncate">{s.student.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{s.prediction.risk_probability}% current risk</div>
                </div>
                <RiskBadge level={s.prediction.risk_level} size="sm" />
                <TrendIndicator value={s.velocity} />
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Institutional Risk Trend" subtitle="Average risk across the last 5 prediction cycles">
          <RiskTrendChart />
        </SectionCard>
      </div>
    </div>
  );
}
