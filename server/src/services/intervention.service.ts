import StudentRepository from '../repositories/student.repository.js';
import PredictionRepository from '../repositories/prediction.repository.js';
import AlertRepository from '../repositories/alert.repository.js';
import InterventionRepository from '../repositories/intervention.repository.js';
import AttendanceRepository from '../repositories/attendance.repository.js';
import AcademicRepository from '../repositories/academic.repository.js';
import { RISK_INCREASE_THRESHOLD } from './alert.service.js';
import {
  CreateInterventionInput,
  InterventionPriority,
  InterventionStatus,
  INTERVENTION_STATUS_TRANSITIONS,
  StoredIntervention
} from '../types/intervention.types.js';
import { StudentNotFoundError } from './prediction.service.js';
import { StoredPrediction } from '../repositories/prediction.repository.js';
import { StoredAlert } from '../types/alert.types.js';

/**
 * Intervention recommendation system — Phase 10.
 *
 * Recommendations are RULES built ON TOP OF existing, stored student data.
 * Nothing here re-runs ML1 or ML2, re-implements their logic, or invents model
 * outputs. Every rule consumes data that genuinely exists in the schema:
 *
 *   - `predictions`:         latest risk_probability + risk_level (LOW/MEDIUM/HIGH),
 *                            and the previous stored prediction for trend.
 *   - `alerts`:              the OPEN (ACTIVE/ACKNOWLEDGED) alerts from Phase 9
 *                            (which already encode ML2-derived signals via rule D).
 *   - `attendance_records`:  latest attendance percentage.
 *   - `academic_records`:    latest average marks + backlog count.
 *
 * Rule vocabulary is constrained by the `interventions` table CHECK constraints:
 *   type     IN (MENTOR_MEETING, ACADEMIC_TUTORING, ATTENDANCE_PLAN,
 *                COUNSELING, FINANCIAL_SUPPORT_REFERRAL)
 *   priority IN (LOW, MEDIUM, HIGH, CRITICAL)
 *
 * FINANCIAL_SUPPORT_REFERRAL is part of the table vocabulary, but no rule
 * auto-generates it in this phase: the available features do not include a
 * non-sensitive, clearly-supportable financial signal, and recommending
 * financial interventions without one would be an intrusive inference.
 *
 * De-duplication: an intervention of a given type is created only when the
 * student has no OPEN (RECOMMENDED/ASSIGNED/IN_PROGRESS) intervention of that
 * same type. Repeated generate calls therefore cannot stack duplicates.
 */

/** Latest attendance below this ratio triggers an ATTENDANCE_PLAN. */
export const ATTENDANCE_INTERVENTION_THRESHOLD = 60;

/** Latest average marks below this ratio triggers ACADEMIC_TUTORING. */
export const ACADEMIC_MARKS_INTERVENTION_THRESHOLD = 40;

/** Two or more standing backlogs also trigger ACADEMIC_TUTORING. */
export const BACKLOG_INTERVENTION_THRESHOLD = 2;

const RISK_LEVEL_RANK: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

const pct = (probability: number): string => (probability * 100).toFixed(1) + '%';

const asNumber = (value: number | string): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const rankOf = (level: string): number => RISK_LEVEL_RANK[level] ?? 0;

interface RuleContext {
  studentId: number;
  latest: StoredPrediction | null;
  previous: StoredPrediction | null;
  openAlerts: StoredAlert[];
  attendance: number | null;
  averageMarks: number | null;
  backlogCount: number | null;
}

const hasAlertType = (alerts: StoredAlert[], type: string): boolean =>
  alerts.some((a) => a.alertType === type);

/**
 * RULE IV-1 — HIGH RISK -> COUNSELING.
 * Latest stored ML1 prediction classifies the student as HIGH risk, or an
 * active HIGH_RISK / CRITICAL alert is present. Escalates to CRITICAL priority
 * when an active CRITICAL alert exists.
 */
const ruleHighRiskCounseling = (ctx: RuleContext): CreateInterventionInput | null => {
  const highRisk =
    ctx.latest?.riskLevel === 'HIGH' ||
    hasAlertType(ctx.openAlerts, 'HIGH_RISK') ||
    hasAlertType(ctx.openAlerts, 'CRITICAL');
  if (!highRisk) return null;

  const probability = ctx.latest?.riskProbability ?? 0;
  const critical = hasAlertType(ctx.openAlerts, 'CRITICAL');
  return {
    studentId: ctx.studentId,
    type: 'COUNSELING',
    priority: critical ? 'CRITICAL' : 'HIGH',
    reason: `Student ${ctx.studentId} is at HIGH dropout risk (${pct(asNumber(probability))}) in the latest prediction; counseling is recommended.`
  };
};

/**
 * RULE IV-2 — RISK INCREASE -> MENTOR_MEETING.
 * Risk probability rose by at least RISK_INCREASE_THRESHOLD vs the previous
 * stored prediction, or the risk classification worsened to a higher category.
 */
const ruleRiskIncreaseMentor = (ctx: RuleContext): CreateInterventionInput | null => {
  const { latest, previous, studentId } = ctx;
  if (!latest || !previous) return null;

  const delta = asNumber(latest.riskProbability) - asNumber(previous.riskProbability);
  const worsened = rankOf(latest.riskLevel) > rankOf(previous.riskLevel);
  if (delta < RISK_INCREASE_THRESHOLD && !worsened) return null;

  const priority: InterventionPriority = latest.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM';
  return {
    studentId,
    type: 'MENTOR_MEETING',
    priority,
    reason: `Student ${studentId} risk increased from ${pct(asNumber(previous.riskProbability))} to ${pct(asNumber(latest.riskProbability))} since the previous prediction; a mentor meeting is recommended.`
  };
};

/**
 * RULE IV-3 — MULTI-FACTOR -> ACADEMIC_TUTORING.
 * An active MULTI_FACTOR alert signals several simultaneous risk factors;
 * structured academic support is the recommended first intervention.
 */
const ruleMultiFactorTutoring = (ctx: RuleContext): CreateInterventionInput | null => {
  if (!hasAlertType(ctx.openAlerts, 'MULTI_FACTOR')) return null;
  return {
    studentId: ctx.studentId,
    type: 'ACADEMIC_TUTORING',
    priority: 'HIGH',
    reason: `Student ${ctx.studentId} has an active MULTI_FACTOR alert (multiple simultaneous risk factors); structured academic tutoring is recommended.`
  };
};

/**
 * RULE IV-4 — LOW ATTENDANCE -> ATTENDANCE_PLAN.
 * Latest attendance record falls below the intervention threshold.
 */
const ruleLowAttendancePlan = (ctx: RuleContext): CreateInterventionInput | null => {
  if (ctx.attendance === null || ctx.attendance >= ATTENDANCE_INTERVENTION_THRESHOLD) return null;
  return {
    studentId: ctx.studentId,
    type: 'ATTENDANCE_PLAN',
    priority: ctx.latest?.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
    reason: `Student ${ctx.studentId} attendance is ${ctx.attendance.toFixed(1)}% in the latest record, below the ${ATTENDANCE_INTERVENTION_THRESHOLD}% intervention threshold; an attendance improvement plan is recommended.`
  };
};

/**
 * RULE IV-5 — LOW ACADEMIC PERFORMANCE -> ACADEMIC_TUTORING.
 * Latest academic record shows average marks below threshold or several backlogs.
 */
const ruleLowAcademicTutoring = (ctx: RuleContext): CreateInterventionInput | null => {
  const lowMarks =
    ctx.averageMarks !== null && ctx.averageMarks < ACADEMIC_MARKS_INTERVENTION_THRESHOLD;
  const manyBacklogs = (ctx.backlogCount ?? 0) >= BACKLOG_INTERVENTION_THRESHOLD;
  if (!lowMarks && !manyBacklogs) return null;

  return {
    studentId: ctx.studentId,
    type: 'ACADEMIC_TUTORING',
    priority: ctx.latest?.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
    reason: `Student ${ctx.studentId} latest academic record shows average marks ${ctx.averageMarks === null ? 'n/a' : ctx.averageMarks.toFixed(1) + '%'} with ${ctx.backlogCount ?? 0} backlogs; academic tutoring is recommended.`
  };
};

/**
 * Generate intervention recommendations for a student using the stored data
 * rules above. Each candidate is de-duplicated against OPEN interventions so
 * repeated invocations never stack duplicates. Returns the newly created
 * interventions and the student's current OPEN intervention list.
 */
export const generateInterventions = async (studentId: number): Promise<{
  created: StoredIntervention[];
  open: StoredIntervention[];
}> => {
  const student = await StudentRepository.findById(studentId);
  if (!student) {
    return Promise.reject(new StudentNotFoundError(studentId));
  }

  const latest = await PredictionRepository.findLatestByStudentId(studentId);
  const previous = latest
    ? await PredictionRepository.findPreviousByStudentId(studentId, latest.id)
    : null;
  const openAlerts = await AlertRepository.findOpenByStudentId(studentId);

  const attendanceRow = await AttendanceRepository.getLatestByStudentId(studentId);
  const academicRow = await AcademicRepository.getLatestByStudentId(studentId);

  const ctx: RuleContext = {
    studentId,
    latest,
    previous,
    openAlerts,
    attendance: attendanceRow ? asNumber(attendanceRow.attendancePercentage) : null,
    averageMarks: academicRow ? asNumber(academicRow.averageMarks) : null,
    backlogCount: academicRow ? asNumber(academicRow.backlogCount) : null
  };

  const candidates = [
    ruleHighRiskCounseling(ctx),
    ruleRiskIncreaseMentor(ctx),
    ruleMultiFactorTutoring(ctx),
    ruleLowAttendancePlan(ctx),
    ruleLowAcademicTutoring(ctx)
  ].filter((c): c is CreateInterventionInput => c !== null);

  // De-duplicate within this batch (e.g. ACADEMIC_TUTORING may match two rules).
  const seenTypes = new Set<string>();
  const uniqueCandidates = candidates.filter((candidate) => {
    if (seenTypes.has(candidate.type)) return false;
    seenTypes.add(candidate.type);
    return true;
  });

  const created: StoredIntervention[] = [];
  for (const candidate of uniqueCandidates) {
    const open = await InterventionRepository.hasOpenByType(studentId, candidate.type);
    if (!open) {
      created.push(await InterventionRepository.create(candidate));
    }
  }

  const open = await InterventionRepository.findByStudentId({
    studentId,
    limit: 100,
    offset: 0,
    status: null
  });
  return { created, open };
};

/** List a student's interventions with pagination. */
export const listStudentInterventions = async (
  studentId: number,
  page: number,
  limit: number,
  status?: InterventionStatus | null
): Promise<{ interventions: StoredIntervention[]; total: number }> => {
  const student = await StudentRepository.findById(studentId);
  if (!student) {
    return Promise.reject(new StudentNotFoundError(studentId));
  }
  const offset = (page - 1) * limit;
  const interventions = await InterventionRepository.findByStudentId({
    studentId,
    limit,
    offset,
    status
  });
  const total = await InterventionRepository.countByStudentId({ studentId, status });
  return { interventions, total };
};

/** Fetch a single intervention by id. */
export const getInterventionById = async (id: number): Promise<StoredIntervention | null> =>
  InterventionRepository.findById(id);

/**
 * Update an intervention's status, enforcing the lifecycle transition map.
 * Rejects transitions the map does not allow (e.g. RECOMMENDED -> CLOSED is
 * rejected; CLOSED is terminal).
 */
export const updateInterventionStatus = async (
  id: number,
  status: InterventionStatus
): Promise<StoredIntervention> => {
  const current = await InterventionRepository.findById(id);
  if (!current) {
    return Promise.reject(new InterventionNotFoundError(id));
  }
  if (current.status === status) {
    return Promise.reject(
      new InterventionStatusTransitionError(
        `Intervention ${id} is already ${status}`
      )
    );
  }
  const allowed = INTERVENTION_STATUS_TRANSITIONS[current.status];
  if (!allowed.includes(status)) {
    return Promise.reject(
      new InterventionStatusTransitionError(
        `Cannot transition intervention ${id} from ${current.status} to ${status}`
      )
    );
  }
  const updated = await InterventionRepository.updateStatus(id, status);
  if (!updated) {
    return Promise.reject(new InterventionNotFoundError(id));
  }
  return updated;
};

export class InterventionNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(id: number) {
    super(`Intervention with id ${id} not found`);
    this.name = 'InterventionNotFoundError';
  }
}

export class InterventionStatusTransitionError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'InterventionStatusTransitionError';
  }
}

/** Convenience type re-export for controllers. */
export type { CreateInterventionInput, StoredIntervention, InterventionStatus };
export { StudentNotFoundError };