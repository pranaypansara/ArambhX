import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarClock, TrendingUp } from 'lucide-react';
import { NOTIFICATIONS } from '@/data/mockData';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import { timeAgo } from '@/lib/riskUtils';
import { EmptyState } from '@/components/ui/States';

const CATEGORIES = [
  { key: 'ACTION_REQUIRED', label: 'Action Required', icon: AlertCircle, color: '#ef6355', desc: 'Critical students requiring review.' },
  { key: 'FOLLOW_UP', label: 'Follow-up', icon: CalendarClock, color: '#eaa73f', desc: 'Interventions requiring follow-up.' },
  { key: 'OUTCOME_UPDATE', label: 'Outcome Update', icon: TrendingUp, color: '#9fe066', desc: 'Students showing improvement or ineffective outcomes.' },
];

export default function Notifications() {
  const navigate = useNavigate();
  const [readState, setReadState] = useState({});

  function open(n) {
    setReadState((r) => ({ ...r, [n.id]: true }));
    if (n.related_entity_type === 'alert') navigate(`/alerts?id=${n.related_entity_id}`);
    else navigate(`/interventions`);
  }

  return (
    <div>
      <PageHeader eyebrow="Screen 11" title="Smart Notification Center" subtitle="Everything routed to you, grouped by what it needs from you." />

      <div className="space-y-6">
        {CATEGORIES.map((cat) => {
          const items = NOTIFICATIONS.filter(n => n.category === cat.key);
          const Icon = cat.icon;
          return (
            <SectionCard key={cat.key} title={cat.label} subtitle={cat.desc}>
              {items.length === 0 ? (
                <EmptyState icon={Icon} title="Nothing here" />
              ) : (
                <div className="space-y-1">
                  {items.map((n) => {
                    const isRead = readState[n.id] ?? n.is_read;
                    return (
                      <button
                        key={n.id}
                        onClick={() => open(n)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${isRead ? 'hover:bg-white/[0.03]' : 'bg-white/[0.03] hover:bg-white/[0.05]'}`}
                      >
                        {!isRead && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cat.color }} />}
                        <Icon size={14} style={{ color: cat.color }} className="shrink-0" />
                        <span className={`text-sm flex-1 ${isRead ? 'text-slate-400' : 'text-slate-200'}`}>{n.title}</span>
                        <span className="text-[11px] text-slate-500 shrink-0">{timeAgo(n.created_at)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
