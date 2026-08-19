import { Activity, BellRing, Stethoscope, PlayCircle, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/riskUtils';

const ICONS = {
  prediction: { icon: Activity, color: '#c98f9f' },
  alert: { icon: BellRing, color: '#eaa73f' },
  intervention_assigned: { icon: Stethoscope, color: '#7a5963' },
  intervention_progress: { icon: PlayCircle, color: '#7a5963' },
  outcome: { icon: CheckCircle2, color: '#9fe066' },
};

export default function RiskJourneyTimeline({ events }) {
  return (
    <div className="relative pl-6">
      <div className="absolute left-[9px] top-1 bottom-1 w-px bg-[#e6d3d6]" />
      <div className="space-y-5">
        {events.map((e, i) => {
          const meta = ICONS[e.type] || ICONS.prediction;
          const Icon = meta.icon;
          return (
            <div key={i} className="relative node-in" style={{ animationDelay: `${i * 70}ms` }}>
              <div
                className="absolute -left-6 top-0 w-[19px] h-[19px] rounded-full flex items-center justify-center"
                style={{ background: '#ede0dd', border: `2px solid ${meta.color}` }}
              >
                <Icon size={10} style={{ color: meta.color }} />
              </div>
              <div className="text-[11px] text-slate-500 font-mono mb-0.5">{formatDate(e.date)}</div>
              <div className="text-sm text-slate-200">{e.text}</div>
              {e.detail && <div className="text-xs text-slate-500 mt-0.5">{e.detail}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
