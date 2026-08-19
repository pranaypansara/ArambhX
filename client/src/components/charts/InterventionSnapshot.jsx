import { INTERVENTION_STATUSES } from '@/services/data';

const STAGES = [
  { key: 'RECOMMENDED', label: 'Recommended', color: '#c98f9f' },
  { key: 'ASSIGNED', label: 'Assigned', color: '#7a5963' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: '#eaa73f' },
  { key: 'COMPLETED', label: 'Completed', color: '#9fe066' },
  { key: 'EVALUATED', label: 'Evaluated', color: '#5bb8b2' },
  { key: 'ESCALATED', label: 'Escalated', color: '#ef6355' },
  { key: 'CLOSED', label: 'Closed', color: '#8b8f98' },
];

const EMPTY_COUNTS = Object.fromEntries(INTERVENTION_STATUSES.map((s) => [s, 0]));

/** Horizontal status breakdown for the intervention lifecycle. */
export default function InterventionSnapshot({ counts = EMPTY_COUNTS }) {
  const max = Math.max(...Object.values(counts), 1);
  return (
    <div className="space-y-3">
      {STAGES.map((s, i) => (
        <div key={s.key} className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-32 shrink-0">{s.label}</span>
          <div className="flex-1 h-2.5 rounded-full bg-[#f6ece9] overflow-hidden">
            <div
              className="h-full rounded-full node-in"
              style={{ width: `${(counts[s.key] || 0) / max * 100}%`, background: s.color, animationDelay: `${i * 90}ms` }}
            />
          </div>
          <span className="font-mono text-xs text-slate-700 w-6 text-right">{counts[s.key] || 0}</span>
        </div>
      ))}
    </div>
  );
}