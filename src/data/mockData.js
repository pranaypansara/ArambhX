// ---------------------------------------------------------------------------
// Mock data layer for ARAMBH ASCEND.
// Shaped to mirror the Neon/Postgres schema 1:1 so swapping this module for
// real `fetch()` calls against the Express API requires no changes upstream.
// Tables: users, students, attendance_records, academic_records, predictions,
// prediction_factors, alerts, interventions, intervention_outcomes,
// notifications, audit_logs.
// ---------------------------------------------------------------------------

const DEPARTMENTS = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Commerce', 'Biotechnology'];
const FIRST_NAMES = ['Rahul', 'Priya', 'Dev', 'Ananya', 'Kabir', 'Meera', 'Arjun', 'Sanya', 'Vikram', 'Ishita', 'Yash', 'Diya', 'Rohan', 'Neha', 'Aarav', 'Simran', 'Karan', 'Tanvi', 'Aditya', 'Riya', 'Nikhil', 'Pooja', 'Siddharth', 'Kavya'];
const LAST_NAMES = ['Mehta', 'Sharma', 'Patel', 'Iyer', 'Rao', 'Verma', 'Gupta', 'Nair', 'Kulkarni', 'Singh', 'Reddy', 'Joshi'];

export const USERS = [
  { id: 'u-himani', name: 'Dr. Himani Kaur', role: 'FACULTY', department: 'Computer Science', email: 'himani.kaur@university.edu' },
  { id: 'u-arvind', name: 'Prof. Arvind Nair', role: 'FACULTY', department: 'Electronics', email: 'arvind.nair@university.edu' },
  { id: 'u-sunita', name: 'Sunita Rao', role: 'COUNSELOR', department: 'Student Affairs', email: 'sunita.rao@university.edu' },
  { id: 'u-admin', name: 'Manoj Deshpande', role: 'ADMIN', department: 'Administration', email: 'manoj.d@university.edu' },
];

export const CURRENT_USER = USERS[0];

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(88471);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => Math.round((min + rand() * (max - min)) * 10) / 10;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const RISK_LEVELS = ['STABLE', 'WATCH', 'DETERIORATING', 'CRITICAL'];

export function riskLevelFromProbability(p) {
  if (p >= 75) return 'CRITICAL';
  if (p >= 55) return 'DETERIORATING';
  if (p >= 35) return 'WATCH';
  return 'STABLE';
}

// --- students -----------------------------------------------------------
const STUDENT_COUNT = 42;
export const STUDENTS = Array.from({ length: STUDENT_COUNT }).map((_, i) => {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  const last = pick(LAST_NAMES);
  const dept = pick(DEPARTMENTS);
  const semester = Math.ceil(rand() * 8);
  return {
    id: `s-${1000 + i}`,
    enrollment_number: `ENR${2023000 + i * 7}`,
    name: `${first} ${last}`,
    department: dept,
    semester,
    email: `${first}.${last}`.toLowerCase() + '@student.university.edu',
    status: 'ACTIVE',
    admitted_on: daysAgo(365 * (semester / 2) + 40),
  };
});

// --- historical trajectories (drive attendance/academic/predictions) ----
// Each student gets a 5-point trajectory to keep the "story" coherent across
// attendance, academic and risk history, per the brief's Rahul example.
const TRAJECTORY_TEMPLATES = [
  { label: 'critical-climb', risk: [42, 51, 63, 72, 84], att: [88, 82, 76, 70, 64], marks: [79, 76, 72, 71, 69], lms: [74, 66, 55, 44, 33] },
  { label: 'deteriorating', risk: [30, 38, 47, 55, 61], att: [90, 85, 80, 75, 71], marks: [81, 78, 74, 70, 68], lms: [80, 70, 63, 58, 52] },
  { label: 'watch', risk: [20, 24, 29, 33, 38], att: [92, 90, 87, 85, 83], marks: [84, 82, 80, 79, 77], lms: [85, 81, 78, 75, 73] },
  { label: 'stable', risk: [12, 13, 11, 10, 9], att: [95, 96, 95, 97, 96], marks: [88, 89, 90, 90, 91], lms: [90, 91, 92, 93, 93] },
  { label: 'recovering', risk: [70, 68, 60, 52, 44], att: [68, 71, 76, 81, 85], marks: [69, 71, 74, 77, 80], lms: [50, 55, 62, 68, 74] },
];

function trajectoryFor() {
  // distribute so roughly: 12% critical, 20% deteriorating, 25% watch, 33% stable, 10% recovering
  const roll = rand();
  if (roll < 0.12) return TRAJECTORY_TEMPLATES[0];
  if (roll < 0.32) return TRAJECTORY_TEMPLATES[1];
  if (roll < 0.57) return TRAJECTORY_TEMPLATES[2];
  if (roll < 0.9) return TRAJECTORY_TEMPLATES[3];
  return TRAJECTORY_TEMPLATES[4];
}

export const STUDENT_TRAJECTORY = {};
STUDENTS.forEach((s) => { STUDENT_TRAJECTORY[s.id] = trajectoryFor(); });

// Force the first three students into specific, narratively useful states
// so the "Rahul" example from the brief exists exactly as written.
STUDENT_TRAJECTORY[STUDENTS[0].id] = TRAJECTORY_TEMPLATES[0]; // Rahul-like, critical climb
STUDENTS[0].name = 'Rahul Mehta';
STUDENT_TRAJECTORY[STUDENTS[1].id] = TRAJECTORY_TEMPLATES[2]; // Priya-like, watch
STUDENTS[1].name = 'Priya Sharma';
STUDENT_TRAJECTORY[STUDENTS[2].id] = TRAJECTORY_TEMPLATES[3]; // Dev-like, stable
STUDENTS[2].name = 'Dev Iyer';
STUDENT_TRAJECTORY[STUDENTS[3].id] = TRAJECTORY_TEMPLATES[4]; // recovering, for outcomes screens
STUDENTS[3].name = 'Ishita Kulkarni';

const PERIODS = [daysAgo(84), daysAgo(63), daysAgo(42), daysAgo(21), daysAgo(3)];

// --- attendance_records ---------------------------------------------------
export const ATTENDANCE_RECORDS = [];
STUDENTS.forEach((s) => {
  const traj = STUDENT_TRAJECTORY[s.id];
  traj.att.forEach((v, idx) => {
    ATTENDANCE_RECORDS.push({
      id: `att-${s.id}-${idx}`,
      student_id: s.id,
      attendance_percent: v,
      classes_held: 40 + idx * 8,
      classes_attended: Math.round((40 + idx * 8) * (v / 100)),
      recorded_at: PERIODS[idx],
    });
  });
});

// --- academic_records ------------------------------------------------------
export const ACADEMIC_RECORDS = [];
STUDENTS.forEach((s) => {
  const traj = STUDENT_TRAJECTORY[s.id];
  traj.marks.forEach((v, idx) => {
    ACADEMIC_RECORDS.push({
      id: `aca-${s.id}-${idx}`,
      student_id: s.id,
      average_marks: v,
      backlog_count: v < 65 ? Math.ceil(rand() * 2) : 0,
      assignment_completion: clamp(v - between(-6, 8), 30, 100),
      lms_activity: traj.lms[idx],
      recorded_at: PERIODS[idx],
    });
  });
});

// --- predictions & prediction_factors --------------------------------------
export const PREDICTIONS = [];
export const PREDICTION_FACTORS = [];


STUDENTS.forEach((s) => {
  const traj = STUDENT_TRAJECTORY[s.id];
  traj.risk.forEach((p, idx) => {
    const predId = `pred-${s.id}-${idx}`;
    PREDICTIONS.push({
      id: predId,
      student_id: s.id,
      risk_probability: p,
      risk_level: riskLevelFromProbability(p),
      model_version: 'pulse-gbrt-v2.3',
      predicted_at: PERIODS[idx],
    });

    if (idx === traj.risk.length - 1) {
      // attach explainability factors to the most recent prediction only
      const attDelta = traj.att[idx] - traj.att[idx - 1];
      const asgDelta = ACADEMIC_RECORDS.find(a => a.student_id === s.id && a.recorded_at === PERIODS[idx]).assignment_completion -
                        ACADEMIC_RECORDS.find(a => a.student_id === s.id && a.recorded_at === PERIODS[idx - 1]).assignment_completion;
      const lmsDelta = traj.lms[idx] - traj.lms[idx - 1];
      const marksDelta = traj.marks[idx] - traj.marks[idx - 1];

      const rows = [
        { key: 'attendance', label: 'Attendance', value: `${traj.att[idx]}%`, impact: Math.abs(attDelta) * 2.1, direction: attDelta < 0 ? 'NEGATIVE' : 'POSITIVE', delta: attDelta },
        { key: 'assignments', label: 'Assignment Completion', value: `${Math.round(asgDelta >= 0 ? 70 : 58)}%`, impact: Math.abs(asgDelta) * 1.6, direction: asgDelta < 0 ? 'NEGATIVE' : 'POSITIVE', delta: asgDelta },
        { key: 'lms_activity', label: 'LMS Activity', value: `${traj.lms[idx]}%`, impact: Math.abs(lmsDelta) * 1.4, direction: lmsDelta < 0 ? 'NEGATIVE' : 'POSITIVE', delta: lmsDelta },
        { key: 'academic_performance', label: 'Academic Performance', value: `${traj.marks[idx]}%`, impact: Math.abs(marksDelta) * 1.8, direction: marksDelta < 0 ? 'NEGATIVE' : 'POSITIVE', delta: marksDelta },
        { key: 'engagement', label: 'Engagement Signals', value: p > 55 ? 'Low' : 'Steady', impact: p > 55 ? between(8, 16) : between(2, 6), direction: p > 55 ? 'NEGATIVE' : 'POSITIVE', delta: p > 55 ? -1 : 0.4 },
      ];

      rows.forEach((r) => {
        const impact = clamp(r.impact, 1, 45);
        PREDICTION_FACTORS.push({
          id: `pf-${predId}-${r.key}`,
          prediction_id: predId,
          feature_name: r.label,
          feature_value: r.value,
          impact_score: Math.round(impact * 10) / 10,
          direction: r.direction,
          impact_level: impact >= 20 ? 'High' : impact >= 10 ? 'Medium' : 'Low',
          delta: r.delta,
        });
      });
    }
  });
});

export function latestPrediction(studentId) {
  const preds = PREDICTIONS.filter(p => p.student_id === studentId);
  return preds[preds.length - 1];
}
export function predictionHistory(studentId) {
  return PREDICTIONS.filter(p => p.student_id === studentId);
}
export function factorsForPrediction(predictionId) {
  return PREDICTION_FACTORS.filter(f => f.prediction_id === predictionId)
    .sort((a, b) => b.impact_score - a.impact_score);
}

// --- deterioration velocity (used for the Risk Landscape + priority score)
export function deteriorationVelocity(studentId) {
  const preds = predictionHistory(studentId);
  if (preds.length < 2) return 0;
  const last = preds[preds.length - 1].risk_probability;
  const prev = preds[preds.length - 2].risk_probability;
  return Math.round((last - prev) * 10) / 10;
}

// --- alerts -----------------------------------------------------------------
export const ALERTS = [];
STUDENTS.forEach((s) => {
  const pred = latestPrediction(s.id);
  const velocity = deteriorationVelocity(s.id);
  if (pred.risk_level === 'STABLE' && velocity <= 1) return; // stable students rarely alert

  const factors = factorsForPrediction(pred.id);
  const decliningFactors = factors.filter(f => f.direction === 'NEGATIVE' && f.impact_level !== 'Low');
  let type = 'EARLY_WARNING';
  if (decliningFactors.length >= 3) type = 'MULTI_FACTOR';
  else if (pred.risk_level === 'CRITICAL') type = 'CRITICAL';
  else if (pred.risk_level === 'DETERIORATING') type = 'HIGH_RISK';

  const severity = type === 'CRITICAL' ? 'CRITICAL' : type === 'MULTI_FACTOR' ? 'HIGH' : type === 'HIGH_RISK' ? 'HIGH' : 'MEDIUM';
  const resolved = rand() > 0.72;

  ALERTS.push({
    id: `al-${s.id}`,
    student_id: s.id,
    alert_type: type,
    severity,
    title: type === 'MULTI_FACTOR'
      ? `${decliningFactors.length} indicators deteriorated simultaneously`
      : type === 'CRITICAL'
      ? 'Risk crossed the critical threshold'
      : type === 'HIGH_RISK'
      ? 'Sustained risk increase detected'
      : 'Early signals of disengagement',
    triggering_signals: decliningFactors.length ? decliningFactors.map(f => f.feature_name) : ['Attendance'],
    status: resolved ? 'RESOLVED' : (rand() > 0.5 ? 'ASSIGNED' : 'OPEN'),
    assigned_to: resolved || rand() > 0.5 ? pick(USERS.filter(u => u.role !== 'ADMIN')).id : null,
    created_at: daysAgo(Math.floor(rand() * 12) + 1),
    resolved_at: resolved ? daysAgo(Math.floor(rand() * 4)) : null,
  });
});

export function alertsForStudent(studentId) {
  return ALERTS.filter(a => a.student_id === studentId);
}

// --- interventions -----------------------------------------------------------
const INTERVENTION_TYPES = [
  { key: 'MENTOR_MEETING', label: 'Academic Mentoring' },
  { key: 'ACADEMIC_TUTORING', label: 'Academic Tutoring' },
  { key: 'ATTENDANCE_PLAN', label: 'Attendance Plan' },
  { key: 'COUNSELING', label: 'Counseling' },
  { key: 'FINANCIAL_SUPPORT_REFERRAL', label: 'Financial Support Referral' },
];
const WORKFLOW_STATES = ['RECOMMENDED', 'ASSIGNED', 'STARTED', 'MONITORING', 'COMPLETED', 'EVALUATED', 'ESCALATED', 'CLOSED'];

export const INTERVENTIONS = [];
let ivCounter = 0;
STUDENTS.forEach((s) => {
  const pred = latestPrediction(s.id);
  if (pred.risk_level === 'STABLE') return;
  const count = pred.risk_level === 'CRITICAL' ? 2 : 1;
  for (let k = 0; k < count; k++) {
    ivCounter += 1;
    const type = k === 1 ? INTERVENTION_TYPES[3] : (pred.risk_level === 'CRITICAL' ? INTERVENTION_TYPES[0] : pick(INTERVENTION_TYPES));
    const stateIdx = Math.floor(rand() * WORKFLOW_STATES.length);
    const status = k === 0 && pred.risk_level === 'CRITICAL' ? pick(['MONITORING', 'STARTED', 'ASSIGNED', 'ESCALATED']) : WORKFLOW_STATES[stateIdx];
    const startedDaysAgo = Math.floor(rand() * 30) + 3;
    INTERVENTIONS.push({
      id: `iv-${1000 + ivCounter}`,
      student_id: s.id,
      intervention_type: type.key,
      intervention_label: type.label,
      status,
      assigned_to: pick(USERS.filter(u => u.role !== 'ADMIN')).id,
      start_date: daysAgo(startedDaysAgo),
      due_date: daysAgo(startedDaysAgo - 14 < 0 ? -(14 - startedDaysAgo) : startedDaysAgo - 14),
      follow_up_date: daysAgo(Math.max(startedDaysAgo - 21, -7)),
      notes: 'Auto-generated from Pulse recommendation based on latest risk factors.',
      created_at: daysAgo(startedDaysAgo + 1),
    });
  }
});

export function interventionsForStudent(studentId) {
  return INTERVENTIONS.filter(iv => iv.student_id === studentId);
}

// --- intervention_outcomes -----------------------------------------------
export const INTERVENTION_OUTCOMES = [];
INTERVENTIONS.filter(iv => ['COMPLETED', 'EVALUATED', 'ESCALATED', 'CLOSED', 'MONITORING'].includes(iv.status)).forEach((iv) => {
  const pred = latestPrediction(iv.student_id);
  const beforeRisk = clamp(pred.risk_probability + between(3, 14), 0, 99);
  const improved = rand() > 0.35;
  const afterRisk = improved ? clamp(beforeRisk - between(10, 28), 5, 99) : clamp(beforeRisk + between(1, 9), 5, 99);
  const classification = !improved ? 'INEFFECTIVE' : (beforeRisk - afterRisk >= 18 ? 'IMPROVED' : 'PARTIAL');
  INTERVENTION_OUTCOMES.push({
    id: `out-${iv.id}`,
    intervention_id: iv.id,
    student_id: iv.student_id,
    before_risk: Math.round(beforeRisk),
    after_risk: Math.round(afterRisk),
    before_attendance: clamp(between(58, 75), 0, 100),
    after_attendance: clamp(between(66, 84), 0, 100),
    before_marks: clamp(between(60, 74), 0, 100),
    after_marks: clamp(between(66, 82), 0, 100),
    outcome_classification: classification,
    evaluated_at: daysAgo(Math.floor(rand() * 6)),
  });
});

export function outcomeForIntervention(interventionId) {
  return INTERVENTION_OUTCOMES.find(o => o.intervention_id === interventionId);
}

// --- notifications ---------------------------------------------------------
export const NOTIFICATIONS = [];
let notifCounter = 0;
ALERTS.filter(a => a.status !== 'RESOLVED').slice(0, 14).forEach((a) => {
  notifCounter += 1;
  const student = STUDENTS.find(s => s.id === a.student_id);
  NOTIFICATIONS.push({
    id: `nt-${notifCounter}`,
    user_id: CURRENT_USER.id,
    category: 'ACTION_REQUIRED',
    title: `${student.name}: ${a.title}`,
    related_entity_type: 'alert',
    related_entity_id: a.id,
    is_read: rand() > 0.6,
    created_at: a.created_at,
  });
});
INTERVENTIONS.filter(iv => iv.follow_up_date && new Date(iv.follow_up_date) <= new Date()).slice(0, 8).forEach((iv) => {
  notifCounter += 1;
  const student = STUDENTS.find(s => s.id === iv.student_id);
  NOTIFICATIONS.push({
    id: `nt-${notifCounter}`,
    user_id: CURRENT_USER.id,
    category: 'FOLLOW_UP',
    title: `Follow-up due: ${iv.intervention_label} for ${student.name}`,
    related_entity_type: 'intervention',
    related_entity_id: iv.id,
    is_read: rand() > 0.5,
    created_at: iv.follow_up_date,
  });
});
INTERVENTION_OUTCOMES.slice(0, 8).forEach((o) => {
  notifCounter += 1;
  const student = STUDENTS.find(s => s.id === o.student_id);
  NOTIFICATIONS.push({
    id: `nt-${notifCounter}`,
    user_id: CURRENT_USER.id,
    category: 'OUTCOME_UPDATE',
    title: `${student.name}'s intervention outcome: ${o.outcome_classification.charAt(0) + o.outcome_classification.slice(1).toLowerCase()}`,
    related_entity_type: 'intervention',
    related_entity_id: o.intervention_id,
    is_read: rand() > 0.5,
    created_at: o.evaluated_at,
  });
});
NOTIFICATIONS.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

// --- priority score (used by Screen 02) -------------------------------------
// Explicitly NOT equal to risk_probability alone: blends absolute risk with
// deterioration velocity and open-alert weight, matching the brief's rule
// that a fast-deteriorating student can outrank a higher, but stable, risk.
export function priorityScore(studentId) {
  const pred = latestPrediction(studentId);
  const velocity = deteriorationVelocity(studentId);
  const openAlerts = alertsForStudent(studentId).filter(a => a.status !== 'RESOLVED').length;
  const score = pred.risk_probability * 0.6 + Math.max(velocity, 0) * 3.2 + openAlerts * 6;
  return Math.round(score * 10) / 10;
}

export function studentSummary(studentId) {
  const student = STUDENTS.find(s => s.id === studentId);
  const pred = latestPrediction(studentId);
  const velocity = deteriorationVelocity(studentId);
  const openAlerts = alertsForStudent(studentId).filter(a => a.status !== 'RESOLVED');
  const activeInterventions = interventionsForStudent(studentId).filter(iv => !['CLOSED', 'ESCALATED'].includes(iv.status));
  return {
    student, prediction: pred, velocity, openAlerts, activeInterventions,
    priority: priorityScore(studentId),
  };
}

export const ALL_STUDENT_SUMMARIES = STUDENTS.map(s => studentSummary(s.id));

// --- institutional KPIs (Screen 01) ------------------------------------------
export function institutionalKpis() {
  const total = STUDENTS.length;
  const critical = ALL_STUDENT_SUMMARIES.filter(s => s.prediction.risk_level === 'CRITICAL').length;
  const high = ALL_STUDENT_SUMMARIES.filter(s => s.prediction.risk_level === 'DETERIORATING').length;
  const deteriorating = ALL_STUDENT_SUMMARIES.filter(s => s.velocity > 3).length;
  const activeAlerts = ALERTS.filter(a => a.status !== 'RESOLVED').length;
  const activeInterventions = INTERVENTIONS.filter(iv => !['CLOSED', 'ESCALATED'].includes(iv.status)).length;
  return { total, critical, high, deteriorating, activeAlerts, activeInterventions };
}

export function interventionSnapshot() {
  const counts = { RECOMMENDED: 0, ASSIGNED: 0, STARTED: 0, MONITORING: 0, COMPLETED: 0, ESCALATED: 0 };
  INTERVENTIONS.forEach((iv) => {
    if (iv.status in counts) counts[iv.status] += 1;
    else if (iv.status === 'EVALUATED') counts.COMPLETED += 1;
    else if (iv.status === 'CLOSED') counts.ESCALATED += 1;
  });
  return counts;
}

export function institutionalRiskTrend() {
  // average institutional risk across the 5 shared reporting periods
  return PERIODS.map((period, idx) => {
    const vals = STUDENTS.map(s => STUDENT_TRAJECTORY[s.id].risk[idx]);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { period: new Date(period).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), avgRisk: Math.round(avg * 10) / 10 };
  });
}

export const RECOMMENDATION_RULES = [
  { type: 'MENTOR_MEETING', label: 'Academic Mentoring', triggers: ['Engagement Signals', 'LMS Activity'], purpose: 'Rebuild a consistent academic relationship and catch disengagement early.' },
  { type: 'ACADEMIC_TUTORING', label: 'Academic Tutoring', triggers: ['Academic Performance'], purpose: 'Close specific subject-level gaps behind falling marks.' },
  { type: 'ATTENDANCE_PLAN', label: 'Attendance Plan', triggers: ['Attendance'], purpose: 'Structured check-ins to reverse a sustained attendance decline.' },
  { type: 'COUNSELING', label: 'Counseling', triggers: ['Engagement Signals', 'Assignment Completion'], purpose: 'Address non-academic factors that may be driving disengagement.' },
  { type: 'FINANCIAL_SUPPORT_REFERRAL', label: 'Financial Support Referral', triggers: ['Assignment Completion', 'Attendance'], purpose: 'Rule out financial hardship as a root cause before further academic action.' },
];

export function recommendInterventions(studentId) {
  const pred = latestPrediction(studentId);
  const factors = factorsForPrediction(pred.id);
  const negFactors = factors.filter(f => f.direction === 'NEGATIVE');
  const negNames = new Set(negFactors.map(f => f.feature_name));

  return RECOMMENDATION_RULES.map((rule) => {
    const matched = rule.triggers.filter(t => negNames.has(t));
    let score = 30 + matched.length * 22;
    matched.forEach((t) => {
      const f = negFactors.find(f => f.feature_name === t);
      if (f) score += f.impact_score * 0.6;
    });
    score += between(-4, 4);
    return {
      ...rule,
      suitability: Math.round(clamp(score, 12, 97)),
      supportingFactors: matched.length ? matched : [negFactors[0]?.feature_name].filter(Boolean),
    };
  }).sort((a, b) => b.suitability - a.suitability);
}

export const PROACTIVE_INSIGHTS = [
  {
    id: 'pi-1', kind: 'CRITICAL_ENTRY',
    text: `${institutionalKpis().critical} students entered critical risk`,
    why: 'Their risk probability crossed 75% in the most recent prediction cycle, driven mainly by attendance and LMS disengagement.',
    who: 'View the Critical Risk segment of the Priority Queue.',
    action: 'Review and assign interventions today.',
  },
  {
    id: 'pi-2', kind: 'RAPID_DECLINE',
    text: `${ALL_STUDENT_SUMMARIES.filter(s => s.velocity > 5).length} students are deteriorating rapidly`,
    why: 'Risk increased by more than 5 points since the last prediction cycle for these students.',
    who: 'Sorted to the top of the Priority Queue regardless of absolute risk.',
    action: 'Prioritize outreach before the next cycle.',
  },
  {
    id: 'pi-3', kind: 'FOLLOW_UP_DUE',
    text: `${INTERVENTIONS.filter(iv => iv.follow_up_date && new Date(iv.follow_up_date) <= new Date()).length} interventions require follow-up`,
    why: 'Their scheduled follow-up date has passed without a logged outcome.',
    who: 'Assigned faculty and counselors listed on each intervention.',
    action: 'Log a follow-up note or escalate.',
  },
  {
    id: 'pi-4', kind: 'IMPROVED',
    text: `${INTERVENTION_OUTCOMES.filter(o => o.outcome_classification === 'IMPROVED').length} students improved after intervention`,
    why: 'Risk dropped by 18 points or more between the before and after evaluation.',
    who: 'See Outcomes & Impact for the full before/after comparison.',
    action: 'Consider closing the case after one more check-in.',
  },
  {
    id: 'pi-5', kind: 'INEFFECTIVE',
    text: `${INTERVENTION_OUTCOMES.filter(o => o.outcome_classification === 'INEFFECTIVE').length} interventions appear ineffective`,
    why: 'Risk stayed flat or increased after the intervention period ended.',
    who: 'Flagged for Adaptive Escalation with an alternative recommendation.',
    action: 'Review the suggested next intervention.',
  },
];
