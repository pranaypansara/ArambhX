import { interventionSnapshot } from '@/data/mockData';

const STAGES = [
  { key: 'RECOMMENDED', label: 'Recommended', color: '#c98f9f' },
  { key: 'ASSIGNED', label: 'Assigned', color: '#7a5963' },
  { key: 'STARTED', label: 'Started', color: '#7a5963' },
  { key: 'MONITORING', label: 'Monitoring', color: '#eaa73f' },
  { key: 'COMPLETED', label: 'Completed', color: '#9fe066' },
  { key: 'ESCALATED', label: 'Escalated / Closed', color: '#ef6355' },
];

export default function InterventionSnapshot() {
  const counts = interventionSnapshot();
  const max = Math.max(...Object.values(counts), 1);
  return (
    <div className="space-y-3">
      {STAGES.map((s, i) => (
        <div key={s.key} className="flex items-center gap-3">
          <span className="text-xs text-slate-400 w-32 shrink-0">{s.label}</span>
          <div className="flex-1 h-2.5 rounded-full bg-[#f6ece9] overflow-hidden">
            <div
              className="h-full rounded-full node-in"
              style={{ width: `${(counts[s.key] / max) * 100}%`, background: s.color, animationDelay: `${i * 90}ms` }}
            />
          </div>
          <span className="font-mono text-xs text-slate-300 w-6 text-right">{counts[s.key]}</span>
        </div>
      ))}
    </div>
  );
}
