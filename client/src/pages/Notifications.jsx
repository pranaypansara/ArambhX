import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, BellRing, LineChart, Info as InfoIcon, CheckCheck } from 'lucide-react';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import { NOTIFICATION_TYPE_META, timeAgo } from '@/lib/riskUtils';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useAsyncData } from '@/services/data';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';

const GROUPS = [
  { key: 'RISK', label: 'Risk Detections', icon: AlertCircle, color: '#ef6355', types: ['HIGH_RISK_DETECTED', 'RISK_WORSENED'] },
  { key: 'ALERT_CREATED', label: 'Alerts Created', icon: BellRing, color: '#eaa73f', types: ['ALERT_CREATED'] },
  { key: 'INTERVENTION', label: 'Interventions', icon: LineChart, color: '#2A8588', types: ['INTERVENTION_RECOMMENDED', 'INTERVENTION_STATUS_UPDATED'] },
  { key: 'INFO', label: 'Info', icon: InfoIcon, color: '#607580', types: ['INFO'] },
];

export default function Notifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isStaff } = useAuth();

  const { data: notifications, loading, error, reload } = useAsyncData(
    () => api.listNotifications({ page: 1, limit: 100 }).then((res) => res?.data?.notifications || []),
    []
  );

  async function open(n) {
    if (!n.isRead) {
      try {
        await api.markNotificationRead(n.id);
        reload();
      } catch (err) {
        /* non-fatal */
      }
    }
    if (n.relatedEntityType === 'ALERT' && isStaff) {
      navigate(`/alerts?id=${n.relatedEntityId}`);
    } else if (n.relatedEntityType === 'INTERVENTION' && isStaff) {
      navigate('/interventions');
    } else {
      navigate('/student-view');
    }
  }

  async function markAllRead() {
    try {
      await api.markAllNotificationsRead();
      toast.show('All notifications marked as read.', 'success');
      reload();
    } catch (err) {
      toast.show(err.message || 'Unable to mark notifications as read.', 'error');
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Screen 11"
        title="Smart Notification Center"
        subtitle="Everything routed to you, grouped by what it needs from you."
        actions={notifications?.some((n) => !n.isRead) && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg chip text-teal-500"
          >
            <CheckCheck size={13} /> Mark all read
          </button>
        )}
      />

      <div className="space-y-6">
        {GROUPS.map((cat) => {
          const items = (notifications || []).filter((n) => cat.types.includes(n.type))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          const Icon = cat.icon;
          const unread = items.filter((n) => !n.isRead).length;
          return (
            <SectionCard
              key={cat.key}
              title={`${cat.label}${unread ? ` · ${unread} unread` : ''}`}
              actions={
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />
                  {items.length} total
                </span>
              }
            >
              {loading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : error ? (
                <ErrorState title="Could not load notifications" description={error.message} onRetry={reload} />
              ) : items.length === 0 ? (
                <EmptyState icon={Icon} title="Nothing here" />
              ) : (
                <div className="space-y-1">
                  {items.map((n) => {
                    const meta = NOTIFICATION_TYPE_META[n.type] || { label: n.type, color: cat.color };
                    return (
                      <button
                        key={n.id}
                        onClick={() => open(n)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${n.isRead ? 'hover:bg-[#EDF7F8]' : 'bg-[#EDF7F8] hover:bg-[#E3F2F2]'}`}
                      >
                        {!n.isRead && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />}
                        <Icon size={14} style={{ color: meta.color }} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm block truncate ${n.isRead ? 'text-slate-500' : 'text-slate-800 font-semibold'}`}>{n.title}</span>
                          {n.message && <span className="text-[11px] text-slate-500 block truncate">{n.message}</span>}
                        </div>
                        <span className="text-[11px] text-slate-500 shrink-0">{timeAgo(n.createdAt)}</span>
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