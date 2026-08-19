export const RISK_META = {
  LOW: { label: 'Low Risk', color: '#3A8F6A', dim: '#2D7053', text: 'text-[#3A8F6A]' },
  MEDIUM: { label: 'Medium Risk', color: '#D9922B', dim: '#B8781E', text: 'text-[#D9922B]' },
  HIGH: { label: 'High Risk', color: '#C84C4C', dim: '#A63838', text: 'text-[#C84C4C]' },
  STABLE: { label: 'Stable', color: '#3A8F6A', dim: '#2D7053', text: 'text-[#3A8F6A]' },
  WATCH: { label: 'Watch', color: '#D9922B', dim: '#B8781E', text: 'text-[#D9922B]' },
  DETERIORATING: { label: 'Deteriorating', color: '#D96B4A', dim: '#B55235', text: 'text-[#D96B4A]' },
  CRITICAL: { label: 'Critical', color: '#C84C4C', dim: '#A63838', text: 'text-[#C84C4C]' },
};

export const ALERT_TYPE_META = {
  EARLY_WARNING: { label: 'Early Warning', color: '#D9922B' },
  HIGH_RISK: { label: 'High Risk', color: '#D96B4A' },
  CRITICAL: { label: 'Critical', color: '#C84C4C' },
  MULTI_FACTOR: { label: 'Multi-Factor', color: '#8B5CF6' },
};

export const ALERT_SEVERITY_META = {
  LOW: { label: 'Low', color: '#3A8F6A' },
  MEDIUM: { label: 'Medium', color: '#D9922B' },
  HIGH: { label: 'High', color: '#D96B4A' },
  CRITICAL: { label: 'Critical', color: '#C84C4C' },
};

export const INTERVENTION_TYPE_META = {
  MENTOR_MEETING: { label: 'Mentor Meeting', color: '#2A8588' },
  ACADEMIC_TUTORING: { label: 'Academic Tutoring', color: '#D96B4A' },
  ATTENDANCE_PLAN: { label: 'Attendance Plan', color: '#D9922B' },
  COUNSELING: { label: 'Counseling', color: '#8B5CF6' },
  FINANCIAL_SUPPORT_REFERRAL: { label: 'Financial Support', color: '#3A8F6A' },
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
  ACTIVE: { label: 'Active', color: '#C84C4C' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: '#D9922B' },
  ASSIGNED: { label: 'Assigned', color: '#D9922B' },
  RESOLVED: { label: 'Resolved', color: '#3A8F6A' },
  RECOMMENDED: { label: 'Recommended', color: '#2A8588' },
  IN_PROGRESS: { label: 'In Progress', color: '#D96B4A' },
  STARTED: { label: 'Started', color: '#2A8588' },
  MONITORING: { label: 'Monitoring', color: '#D9922B' },
  COMPLETED: { label: 'Completed', color: '#3A8F6A' },
  EVALUATED: { label: 'Evaluated', color: '#3A8F6A' },
  ESCALATED: { label: 'Escalated', color: '#C84C4C' },
  CLOSED: { label: 'Closed', color: '#607580' },
};

export const NOTIFICATION_TYPE_META = {
  HIGH_RISK_DETECTED: { label: 'High Risk Detected', color: '#C84C4C' },
  RISK_WORSENED: { label: 'Risk Worsened', color: '#D96B4A' },
  ALERT_CREATED: { label: 'Alert Created', color: '#D9922B' },
  INTERVENTION_RECOMMENDED: { label: 'Intervention Recommended', color: '#2A8588' },
  INTERVENTION_STATUS_UPDATED: { label: 'Intervention Updated', color: '#3A8F6A' },
  INFO: { label: 'Info', color: '#607580' },
};

/** Allowed next statuses for an intervention (mirrors server transition map). */
export const INTERVENTION_STATUS_TRANSITIONS = {
  RECOMMENDED: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'EVALUATED', 'CLOSED', 'ESCALATED'],
  ASSIGNED: ['IN_PROGRESS', 'COMPLETED', 'EVALUATED', 'CLOSED', 'ESCALATED'],
  IN_PROGRESS: ['COMPLETED', 'EVALUATED', 'CLOSED', 'ESCALATED'],
  COMPLETED: ['EVALUATED', 'CLOSED'],
  EVALUATED: ['CLOSED'],
  CLOSED: [],
  ESCALATED: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'EVALUATED', 'CLOSED'],
};

export function statusLabel(status) {
  return STATUS_META[status]?.label || status?.replace(/_/g, ' ') || '—';
}
