import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { PageHeader, SectionCard } from '@/components/ui/Page';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useAsyncData, mapAuditLog } from '@/services/data';
import { api } from '@/services/api';
import { formatDateTime } from '@/lib/riskUtils';

const ACTION_COLORS = {
  PREDICTION_CREATED: '#2A8588',
  ALERT_CREATED: '#D9922B',
  ALERT_RESOLVED: '#3A8F6A',
  INTERVENTION_CREATED: '#7a5963',
  INTERVENTION_STATUS_UPDATED: '#D96B4A',
  NOTIFICATION_CREATED: '#8B5CF6',
  NOTIFICATION_READ: '#607580',
};

const ACTIONS = Object.keys(ACTION_COLORS);

export default function AuditLogs() {
  const [actionFilter, setActionFilter] = useState('ALL');

  const { data, loading, error, reload } = useAsyncData(
    () => api.listAuditLogs({ page: 1, limit: 100 }).then((res) => ({
      logs: (res?.data?.auditLogs || []).map(mapAuditLog),
      total: res?.pagination?.totalAuditLogs ?? 0,
    })),
    []
  );

  const logs = (data?.logs || []).filter((l) => actionFilter === 'ALL' || l.action === actionFilter);

  return (
    <div>
      <PageHeader
        eyebrow="Admin Only"
        title="Audit Logs"
        subtitle="Every model, alert and intervention event recorded, with the acting user."
        actions={
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 px-3 py-1.5 rounded-full bg-panel-alt border border-hairline">
            <ScrollText size={13} className="text-teal" />
            {data?.total ?? 0} events
          </span>
        }
      />

      <SectionCard className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-panel border hairline rounded-lg px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-teal-400"
          >
            <option value="ALL">All actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </SectionCard>

      <SectionCard className="!p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : error ? (
          <div className="p-6"><ErrorState title="Could not load audit logs" description={error.message} onRetry={reload} /></div>
        ) : logs.length === 0 ? (
          <div className="p-6"><EmptyState icon={ScrollText} title="No audit events match" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b hairline">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-3 py-3 font-medium">Action</th>
                  <th className="px-3 py-3 font-medium">Entity</th>
                  <th className="px-3 py-3 font-medium">Actor</th>
                  <th className="px-3 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b hairline last:border-0 hover:bg-void">
                    <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                    <td className="px-3 py-3">
                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full" style={{ color: ACTION_COLORS[l.action] || '#607580', background: `${ACTION_COLORS[l.action] || '#607580'}1a` }}>
                        {l.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-700">{l.entityType}{l.entityId ? ` #${l.entityId}` : ''}</td>
                    <td className="px-3 py-3 text-xs text-slate-700">{l.userName || (l.userId ? `user #${l.userId}` : 'system')}</td>
                    <td className="px-3 py-3 text-[11px] font-mono text-slate-500">{l.role || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[260px]">
                      {l.details ? (
                        <span className="font-mono text-[11px] line-clamp-2">{JSON.stringify(l.details)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}