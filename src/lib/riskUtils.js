export const RISK_META = {
  STABLE: { label: 'Stable', color: '#9fe066', dim: '#5f8a34', text: 'text-lime-300' },
  WATCH: { label: 'Watch', color: '#eaa73f', dim: '#8f6521', text: 'text-amber-300' },
  DETERIORATING: { label: 'Deteriorating', color: '#f2884f', dim: '#95522b', text: 'text-orange-300' },
  CRITICAL: { label: 'Critical', color: '#ef6355', dim: '#8f342a', text: 'text-rose-300' },
};

export function riskColor(level) {
  return RISK_META[level]?.color || '#9fe066';
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
  IMPROVED: { label: 'Improved', color: '#9fe066' },
  PARTIAL: { label: 'Partial', color: '#eaa73f' },
  INEFFECTIVE: { label: 'Ineffective', color: '#ef6355' },
};

export const STATUS_META = {
  OPEN: { label: 'Open', color: '#ef6355' },
  ASSIGNED: { label: 'Assigned', color: '#eaa73f' },
  RESOLVED: { label: 'Resolved', color: '#9fe066' },
  RECOMMENDED: { label: 'Recommended', color: '#C98F9F' },
  STARTED: { label: 'Started', color: '#7A5963' },
  MONITORING: { label: 'Monitoring', color: '#eaa73f' },
  COMPLETED: { label: 'Completed', color: '#9fe066' },
  EVALUATED: { label: 'Evaluated', color: '#9fe066' },
  ESCALATED: { label: 'Escalated', color: '#ef6355' },
  CLOSED: { label: 'Closed', color: '#B39A9F' },
};
