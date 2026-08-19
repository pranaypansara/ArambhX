import { RISK_META } from '@/lib/riskUtils';

export default function RiskBadge({ level, size = 'md' }) {
  const meta = RISK_META[level] || RISK_META.STABLE;
  const sizeCls = size === 'sm' ? 'text-[11px] px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium font-mono uppercase tracking-wide ${sizeCls}`}
      style={{ color: meta.color, background: `${meta.color}1a`, border: `1px solid ${meta.color}40` }}
    >
      <span className={level === 'CRITICAL' ? 'pulse-dot' : ''} style={{ width: 6, height: 6, borderRadius: 999, background: meta.color, flexShrink: 0 }} />
      {meta.label}
    </span>
  );
}
