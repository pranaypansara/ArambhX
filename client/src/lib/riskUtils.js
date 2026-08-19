export const RISK_META = {
  STABLE: { label: 'Stable', color: '#3A8F6A', dim: '#2D7053', text: 'text-[#3A8F6A]' },
  WATCH: { label: 'Watch', color: '#D9922B', dim: '#B8781E', text: 'text-[#D9922B]' },
  DETERIORATING: { label: 'Deteriorating', color: '#D96B4A', dim: '#B55235', text: 'text-[#D96B4A]' },
  CRITICAL: { label: 'Critical', color: '#C84C4C', dim: '#A63838', text: 'text-[#C84C4C]' },
};

export function riskColor(level) {
  return RISK_META[level]?.color || '#3A8F6A';
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function initials(name) {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

export function avatarHue(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

export const OUTCOME_META = {
  IMPROVED: { label: 'Improved', color: '#3A8F6A' },
  PARTIAL: { label: 'Partial', color: '#D9922B' },
  INEFFECTIVE: { label: 'Ineffective', color: '#C84C4C' },
};

export const STATUS_META = {
  OPEN: { label: 'Open', color: '#C84C4C' },
  ASSIGNED: { label: 'Assigned', color: '#D9922B' },
  RESOLVED: { label: 'Resolved', color: '#3A8F6A' },
  RECOMMENDED: { label: 'Recommended', color: '#2A8588' },
  STARTED: { label: 'Started', color: '#2A8588' },
  MONITORING: { label: 'Monitoring', color: '#D9922B' },
  COMPLETED: { label: 'Completed', color: '#3A8F6A' },
  EVALUATED: { label: 'Evaluated', color: '#3A8F6A' },
  ESCALATED: { label: 'Escalated', color: '#C84C4C' },
  CLOSED: { label: 'Closed', color: '#607580' },
};
