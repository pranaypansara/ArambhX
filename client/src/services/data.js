import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from './api';

// ---------------------------------------------------------------------------
// Vocabulary helpers (backend-controlled constants mirror server/src/types)
// ---------------------------------------------------------------------------
export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];
export const ALERT_TYPES = ['EARLY_WARNING', 'HIGH_RISK', 'CRITICAL', 'MULTI_FACTOR'];
export const ALERT_STATUSES = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'];
export const INTERVENTION_STATUSES = [
  'RECOMMENDED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'EVALUATED', 'CLOSED', 'ESCALATED',
];
export const OPEN_INTERVENTION_STATUSES = ['RECOMMENDED', 'ASSIGNED', 'IN_PROGRESS'];

const ALERT_SEVERITY_WEIGHT = { CRITICAL: 25, HIGH: 18, MEDIUM: 10, LOW: 5 };
const INTERVENTION_TYPE_LABEL = (t) => (t || '').replace(/_/g, ' ');

export const isOpenAlert = (a) => a.status !== 'RESOLVED';
export const isOpenIntervention = (iv) => OPEN_INTERVENTION_STATUSES.includes(iv.status);
export const isOverdueIntervention = (iv, now = new Date()) =>
  isOpenIntervention(iv) && !!iv.follow_up_date && new Date(iv.follow_up_date) < now;

export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  FACULTY: 'Faculty',
  COUNSELOR: 'Counselor',
  STUDENT: 'Student',
};

export const RISK_META = {
  LOW: { label: 'Low Risk', color: '#3A8F6A', dim: '#2D7053', text: 'text-[#3A8F6A]' },
  MEDIUM: { label: 'Medium Risk', color: '#D9922B', dim: '#B8781E', text: 'text-[#D9922B]' },
  HIGH: { label: 'High Risk', color: '#C84C4C', dim: '#A63838', text: 'text-[#C84C4C]' },
  STABLE: { label: 'Stable', color: '#3A8F6A', dim: '#2D7053', text: 'text-[#3A8F6A]' },
  WATCH: { label: 'Watch', color: '#D9922B', dim: '#B8781E', text: 'text-[#D9922B]' },
  DETERIORATING: { label: 'Deteriorating', color: '#D96B4A', dim: '#B55235', text: 'text-[#D96B4A]' },
  CRITICAL: { label: 'Critical', color: '#C84C4C', dim: '#A63838', text: 'text-[#C84C4C]' },
};

export const INTERVENTION_TYPE_META = {
  MENTOR_MEETING: { label: 'Mentor Meeting', color: '#2A8588' },
  ACADEMIC_TUTORING: { label: 'Academic Tutoring', color: '#D96B4A' },
  ATTENDANCE_PLAN: { label: 'Attendance Plan', color: '#D9922B' },
  COUNSELING: { label: 'Counseling', color: '#8B5CF6' },
  FINANCIAL_SUPPORT_REFERRAL: { label: 'Financial Support', color: '#3A8F6A' },
};

// Curated, human-readable factor subset with thresholds used for the heuristic
// risk-contribution snapshot (ML1 features are assessment/LMS based).
export const FACTOR_RULES = [
  { key: 'assessment_completion_rate', label: 'Assessment Completion', kind: 'above', threshold: 70, good: 90 },
  { key: 'weighted_performance', label: 'Weighted Performance', kind: 'above', threshold: 60, good: 85 },
  { key: 'avg_assessment_score', label: 'Avg Assessment Score', kind: 'above', threshold: 55, good: 80 },
  { key: 'max_assessment_score', label: 'Max Assessment Score', kind: 'above', threshold: 70, good: 90 },
  { key: 'total_clicks', label: 'LMS Clicks (total)', kind: 'above', threshold: 150, good: 400 },
  { key: 'active_days', label: 'Active Days', kind: 'above', threshold: 30, good: 60 },
  { key: 'avg_daily_clicks', label: 'Avg Daily Clicks', kind: 'above', threshold: 4, good: 8 },
  { key: 'late_submission_count', label: 'Late Submissions', kind: 'below', threshold: 4, good: 1 },
  { key: 'avg_submission_delay', label: 'Avg Submission Delay', kind: 'below', threshold: 5, good: 1 },
  { key: 'assessments_missed', label: 'Assessments Missed', kind: 'below', threshold: 3, good: 0 },
];

export function deriveFactors(features) {
  if (!features) return [];
  return FACTOR_RULES.map((rule) => {
    const value = features[rule.key];
    if (value === undefined || value === null) return null;
    const bad = rule.kind === 'above' ? value < rule.threshold : value > rule.threshold;
    const distance = rule.kind === 'above'
      ? (rule.good - value) / (rule.good - rule.threshold)
      : (value - rule.good) / (rule.threshold - rule.good);
    const clamped = Math.max(0, Math.min(1.6, distance));
    const impactLevel = bad ? (clamped >= 0.9 ? 'HIGH' : clamped >= 0.4 ? 'MEDIUM' : 'LOW') : 'LOW';
    return {
      id: rule.key,
      feature_name: rule.label,
      feature_value: typeof value === 'number' ? (Math.round(value * 10) / 10) : String(value),
      impact_score: Math.round(clamped * 10) / 10,
      direction: bad ? 'NEGATIVE' : 'POSITIVE',
      impact_level: impactLevel,
      delta: null,
    };
  }).filter(Boolean).sort((a, b) => b.impact_score - a.impact_score);
}

/**
 * Heuristic impact reading for an intervention against a student's prediction
 * history: "before" is the last prediction at or before the intervention was
 * created; "after" is the latest prediction. Returns null when there is no
 * meaningful window to compare.
 */
export function evaluateIntervention(summary, iv) {
  const history = (summary?.history || [])
    .filter((p) => p.predicted_at)
    .sort((a, b) => new Date(a.predicted_at) - new Date(b.predicted_at));
  if (history.length === 0 || !iv.created_at) return null;

  const created = new Date(iv.created_at);
  const before = history.filter((p) => new Date(p.predicted_at) <= created);
  const beforePred = before.length ? before[before.length - 1] : history[0];
  const afterPred = history[history.length - 1];
  if (!beforePred || !afterPred) return null;
  if (new Date(afterPred.predicted_at) <= created) return null;

  const delta = afterPred.risk_probability - beforePred.risk_probability;
  return {
    before: beforePred.risk_probability,
    after: afterPred.risk_probability,
    delta,
    classification: delta <= -5 ? 'IMPROVED' : delta >= 5 ? 'INEFFECTIVE' : 'PARTIAL',
    evaluatedAt: afterPred.predicted_at,
  };
}

export function summarizeOutcomes(summaries) {
  const list = [];
  (summaries || []).forEach((s) => {
    (s.allInterventions || []).forEach((iv) => {
      const evaluation = evaluateIntervention(s, iv);
      if (!evaluation) return;
      list.push({ id: iv.id, studentId: s.student?.id, student: s.student, iv, evaluation });
    });
  });
  return list.sort((a, b) => new Date(b.evaluation.evaluatedAt) - new Date(a.evaluation.evaluatedAt));
}

// ---------------------------------------------------------------------------
// Mappers: backend (camelCase, %0-1) -> UI model (snake_case, %0-100)
// ---------------------------------------------------------------------------
export function mapStudent(s) {
  if (!s) return null;
  return {
    id: s.id,
    enrollment_number: s.enrollmentNumber || s.enrollment_number,
    name: s.name,
    department: s.department,
    semester: s.semester,
    email: s.email,
    status: 'ACTIVE',
    admitted_on: s.createdAt || s.created_at || null,
  };
}

export function mapPrediction(p) {
  if (!p) return null;
  const prob = typeof p.riskProbability === 'number' ? p.riskProbability : p.risk_probability;
  return {
    id: p.id,
    student_id: p.studentId ?? p.student_id,
    risk_probability: Math.round((typeof prob === 'number' ? prob : parseFloat(prob || 0)) * 100),
    risk_level: p.riskLevel || p.risk_level,
    model_version: p.modelVersion || p.model_version || null,
    predicted_at: p.predictedAt || p.predicted_at,
  };
}

export function mapAlert(a) {
  if (!a) return null;
  const severity = a.priority || a.severity || 'MEDIUM';
  return {
    id: a.id,
    student_id: a.studentId ?? a.student_id,
    student_name: a.studentName || a.student_name,
    alert_type: a.alertType || a.alert_type,
    severity,
    priority: severity,
    title: a.message || `${severity} risk alert`,
    message: a.message || '',
    triggering_signals: Array.isArray(a.triggering_signals) ? a.triggering_signals : (a.message ? [a.message] : []),
    status: a.status,
    assigned_to: a.assignedTo ?? a.assigned_to ?? null,
    created_at: a.createdAt || a.created_at,
    resolved_at: a.resolvedAt || a.resolved_at || null,
  };
}

export function mapIntervention(iv) {
  if (!iv) return null;
  return {
    id: iv.id,
    student_id: iv.studentId ?? iv.student_id,
    student_name: iv.studentName || iv.student_name,
    intervention_type: iv.type || iv.intervention_type,
    intervention_label: INTERVENTION_TYPE_LABEL(iv.type || iv.intervention_type),
    priority: iv.priority || 'MEDIUM',
    reason: iv.reason || '',
    status: iv.status,
    assigned_to: iv.assignedTo ?? iv.assigned_to ?? null,
    start_date: iv.createdAt || iv.start_date || null,
    due_date: iv.deadline || iv.due_date || null,
    follow_up_date: iv.deadline || iv.follow_up_date || null,
    notes: iv.notes || null,
    created_at: iv.createdAt || iv.created_at,
    updated_at: iv.updatedAt || iv.updated_at,
  };
}

export function mapNotification(n) {
  return {
    id: n.id,
    user_id: n.userId ?? n.user_id,
    type: n.type,
    title: n.title,
    message: n.message,
    is_read: n.isRead ?? n.is_read,
    related_entity_type: n.relatedEntityType ?? n.related_entity_type,
    related_entity_id: n.relatedEntityId ?? n.related_entity_id,
    created_at: n.createdAt || n.created_at,
  };
}

export function mapAuditLog(l) {
  return {
    id: l.id,
    userId: l.userId ?? l.user_id,
    userName: l.userName ?? l.user_name ?? null,
    action: l.action,
    entityType: l.entityType ?? l.entity_type ?? null,
    entityId: l.entityId ?? l.entity_id ?? null,
    details: l.details || null,
    createdAt: l.createdAt || l.created_at,
  };
}

// ---------------------------------------------------------------------------
// Enrichment: build a "student summary" the UI pages understand
// ---------------------------------------------------------------------------
function velocityFromPredictions(predictions) {
  if (!predictions || predictions.length < 1) return 0;
  const sorted = [...predictions].sort((a, b) => new Date(a.predicted_at) - new Date(b.predicted_at));
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  if (!prev) return 0;
  return Math.round((last.risk_probability - prev.risk_probability) * 10) / 10;
}

function priorityScore(prediction, openAlerts, velocity) {
  const riskPct = prediction?.risk_probability || 0;
  const alertScore = Math.min(40, openAlerts.reduce((sum, a) => sum + (ALERT_SEVERITY_WEIGHT[a.priority] || 10), 0));
  const trendScore = Math.max(0, velocity) * 3;
  return Math.round(Math.min(100, riskPct * 0.5 + alertScore + trendScore));
}

async function withConcurrency(items, maxConcurrent, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const i = cursor;
      cursor += 1;
      results[i] = await worker(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(maxConcurrent, items.length) }, run);
  await Promise.all(workers);
  return results;
}

const SUMMARY_CACHE = new Map();
const SUMMARY_TTL = 60_000;

/**
 * Fetch all students enriched with latest prediction, predictions history
 * (for velocity), open alerts and active interventions. Results are cached
 * briefly so Shared screens (Overview, Students, RiskIntelligence) can reuse
 * the same payload without hammering the backend.
 */
export async function fetchSummaries({ force = false } = {}) {
  const cached = SUMMARY_CACHE.get('all');
  if (!force && cached && Date.now() - cached.at < SUMMARY_TTL) {
    return cached.value;
  }

  const page = await api.listStudents({ page: 1, limit: 250 });
  const students = (page?.data?.students || []);

  const summaries = await withConcurrency(students, 6, async (student) => {
    const base = mapStudent(student);
    let prediction = null;
    let velocity = 0;
    let openAlerts = [];
    let activeInterventions = [];

    const [predRes, alertRes, ivRes] = await Promise.allSettled([
      api.getStudentPredictions(student.id, { page: 1, limit: 12 }),
      api.getStudentAlerts(student.id, { page: 1, limit: 30 }),
      api.getStudentInterventions(student.id, { page: 1, limit: 30 }),
    ]);

    if (predRes.status === 'fulfilled') {
      const history = ((predRes.value?.data?.predictions) || []).map(mapPrediction);
      prediction = history[history.length - 1] || null;
      velocity = velocityFromPredictions(history);
    }
    if (alertRes.status === 'fulfilled') {
      openAlerts = ((alertRes.value?.data?.alerts) || []).map(mapAlert).filter(isOpenAlert);
    }
    let allInterventions = [];
    if (ivRes.status === 'fulfilled') {
      allInterventions = ((ivRes.value?.data?.interventions) || []).map(mapIntervention);
      activeInterventions = allInterventions.filter(isOpenIntervention);
    }

    return {
      student: base,
      prediction,
      velocity,
      openAlerts,
      activeInterventions,
      allInterventions,
      priority: priorityScore(prediction, openAlerts, velocity),
      history,
    };
  });

  summaries.sort((a, b) => b.priority - a.priority);
  SUMMARY_CACHE.set('all', { at: Date.now(), value: summaries });
  return summaries;
}

export function clearSummaryCache() {
  SUMMARY_CACHE.clear();
}

/** Cohort-average risk across the last N prediction cycles (from summaries' history). */
export function buildCohortRiskTrend(summaries, maxPoints = 5) {
  const buckets = [];
  for (let idx = 0; idx < maxPoints; idx += 1) {
    let sum = 0;
    let n = 0;
    summaries.forEach((s) => {
      const h = s.history || [];
      const p = h[h.length - 1 - idx];
      if (p) {
        sum += p.risk_probability;
        n += 1;
      }
    });
    if (n > 0) {
      buckets.push({ period: idx === 0 ? 'Latest' : `Cycle -${idx}`, avgRisk: Math.round(sum / n) });
    }
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Dashboard overview mapping
// ---------------------------------------------------------------------------
export function mapOverviewData(data) {
  const riskBuckets = Object.fromEntries((data.riskDistribution || []).map((r) => [r.riskLevel, r.count]));
  const alertStatus = data.alerts?.byStatus || {};
  const ivStatus = data.interventions?.byStatus || {};

  return {
    total: data.students?.total || 0,
    withPredictions: data.students?.withPredictions || 0,
    withoutPredictions: data.students?.withoutPredictions || 0,
    riskDistribution: data.riskDistribution || [],
    highRisk: riskBuckets.HIGH || 0,
    mediumRisk: riskBuckets.MEDIUM || 0,
    lowRisk: riskBuckets.LOW || 0,
    alertsTotal: data.alerts?.total || 0,
    alertsActive: data.alerts?.active || 0,
    alertsByStatus: alertStatus,
    interventionsTotal: data.interventions?.total || 0,
    interventionsActive: data.interventions?.active || 0,
    interventionsByStatus: ivStatus,
    recentPredictions: (data.recentActivity?.predictions || []).map(mapPrediction),
    recentAlerts: (data.recentActivity?.alerts || []).map(mapAlert),
    recentInterventions: (data.recentActivity?.interventions || []).map(mapIntervention),
  };
}

export async function fetchOverview({ force = false } = {}) {
  const { data } = await api.getOverview({ limit: 8 });
  return mapOverviewData(data);
}

export async function fetchAttentionStudents() {
  const { data } = await api.getAttentionStudents({ limit: 20 });
  return data?.attentionStudents || [];
}

// ---------------------------------------------------------------------------
// Small data-fetching hook shared across pages (loading / error / reload)
// ---------------------------------------------------------------------------
export function useAsyncData(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async (opts = {}) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current(opts);
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      setState({ data: null, loading: false, error: err });
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loaderRef.current().then((data) => {
      if (alive) setState({ data, loading: false, error: null });
    }).catch((err) => {
      if (alive) setState({ data: null, loading: false, error: err });
    });
    return () => { alive = false; };
  }, deps);

  return { ...state, reload: run };
}