import PredictionRepository, {
  StoredPrediction
} from '../repositories/prediction.repository.js';
import AlertRepository from '../repositories/alert.repository.js';
import {
  AlertPriority,
  AlertStatus,
  AlertType,
  CreateAlertInput,
  StoredAlert
} from '../types/alert.types.js';
import { ML2AnalysisResponse } from '../types/ml2.types.js';
import { notifyAlertCreated, recordAuditSafely } from './notification.service.js';

/**
 * Application-level smart alert rules.
 *
 * Alerts are RULES built ON TOP OF existing, stored ML outputs and student
 * data — nothing here re-runs ML1 or ML2, re-implements their logic, or invents
 * model outputs. Every rule consumes data that genuinely exists in the schema:
 *
 *   - the `predictions` table: risk_probability + risk_level (LOW/MEDIUM/HIGH)
 *   - the Phase 8 ML2 risk-analysis result: alert.alert_level, alert.alert_types,
 *     risk_trend
 *
 * Rule vocabulary is constrained by the `alerts` table CHECK constraints:
 *   alert_type IN (EARLY_WARNING, HIGH_RISK, CRITICAL, MULTI_FACTOR)
 *   priority   IN (LOW, MEDIUM, HIGH, CRITICAL)
 *
 * Deduplication: an alert of a given type is inserted only when the student has
 * no OPEN (ACTIVE / ACKNOWLEDGED) alert of that same type. This prevents the
 * same situation from re-inserting identical alerts on every predict call.
 */

/** Minimum absolute drop in risk probability to flag as a meaningful increase. */
export const RISK_INCREASE_THRESHOLD = 0.1;

const RISK_LEVEL_RANK: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

const pct = (probability: number): string => (probability * 100).toFixed(1) + '%';

const isHighRisk = (prediction: StoredPrediction): boolean =>
  prediction.riskLevel === 'HIGH';

const rankOf = (level: string): number => RISK_LEVEL_RANK[level] ?? 0;

/** pg returns `numeric` columns as strings; coerce before arithmetic. */
const asNumber = (value: number | string): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** RULE A — HIGH RISK.
 * The latest stored ML1 prediction classifies the student as HIGH risk.
 */
const ruleHighRisk = (prediction: StoredPrediction): CreateAlertInput => ({
  studentId: prediction.studentId,
  predictionId: prediction.id,
  alertType: 'HIGH_RISK',
  priority: 'HIGH',
  message: `Student ${prediction.studentId} is at HIGH dropout risk (${pct(asNumber(prediction.riskProbability))}) in the latest prediction.`
});

/**
 * RULE B — RISK INCREASE.
 * Risk probability rose by at least RISK_INCREASE_THRESHOLD vs the previous
 * stored prediction (only when a previous prediction exists).
 */
const ruleRiskIncrease = (
  latest: StoredPrediction,
  previous: StoredPrediction | null
): CreateAlertInput | null => {
  if (!previous) return null;
  const delta = asNumber(latest.riskProbability) - asNumber(previous.riskProbability);
  if (delta < RISK_INCREASE_THRESHOLD) return null;
  return {
    studentId: latest.studentId,
    predictionId: latest.id,
    alertType: 'EARLY_WARNING',
    priority: 'MEDIUM',
    message: `Student ${latest.studentId} risk increased by ${(delta * 100).toFixed(1)}% since the previous prediction (now ${pct(asNumber(latest.riskProbability))}).`
  };
};

/**
 * RULE C — RISK WORSENING.
 * The stored risk classification moved to a worse category
 * (LOW -> MEDIUM, MEDIUM -> HIGH, LOW -> HIGH).
 */
const ruleRiskWorsening = (
  latest: StoredPrediction,
  previous: StoredPrediction | null
): CreateAlertInput | null => {
  if (!previous) return null;
  if (rankOf(latest.riskLevel) <= rankOf(previous.riskLevel)) return null;
  return {
    studentId: latest.studentId,
    predictionId: latest.id,
    alertType: 'EARLY_WARNING',
    priority: latest.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
    message: `Student ${latest.studentId} risk level worsened from ${previous.riskLevel} to ${latest.riskLevel} (now ${pct(asNumber(latest.riskProbability))}).`
  };
};

/**
 * RULE D — ML2 INTELLIGENCE.
 * Uses ONLY the actual Phase 8 ML2 risk-analysis output (alert level, alert
 * types, trend) mapped onto the alerts-table vocabulary. The alert is generated
 * in the risk-analysis flow where the ML2 result is already available — no
 * extra ML2 processing is triggered just to check alerts.
 */
const ruleMl2Intelligence = (
  studentId: number,
  analysis: ML2AnalysisResponse
): CreateAlertInput[] => {
  const level = analysis.alert.alert_level;
  const types = analysis.alert.alert_types;
  const trend = analysis.risk_trend.risk_trend;

  const candidates: CreateAlertInput[] = [];

  if (level === 'CRITICAL' || types.includes('CRITICAL')) {
    candidates.push({
      studentId,
      alertType: 'CRITICAL',
      priority: 'CRITICAL',
      message: `ML2 flags CRITICAL risk for student ${studentId} (alert score ${analysis.alert.alert_score.toFixed(3)}).`
    });
  }

  if (level === 'HIGH' || types.includes('HIGH_RISK')) {
    candidates.push({
      studentId,
      alertType: 'HIGH_RISK',
      priority: 'HIGH',
      message: `ML2 confirms HIGH dropout risk for student ${studentId} (probability ${pct(analysis.risk_probability)}).`
    });
  }

  if (types.includes('MULTI_FACTOR')) {
    candidates.push({
      studentId,
      alertType: 'MULTI_FACTOR',
      priority: 'HIGH',
      message: `ML2 detected multiple simultaneous risk factors for student ${studentId}.`
    });
  }

  const escalating =
    types.includes('ESCALATING') ||
    types.includes('RAPID_INCREASE') ||
    trend === 'INCREASING';
  if (escalating) {
    candidates.push({
      studentId,
      alertType: 'EARLY_WARNING',
      priority: 'MEDIUM',
      message: `ML2 trend indicates escalating risk for student ${studentId} (risk trend ${trend}).`
    });
  }

  return candidates;
};

/**
 * Insert an alert only if the student has no OPEN alert of the same type.
 *
 * When the alert is actually created, a Phase 12 notification is generated for
 * the acting user (only when an authenticated actor is known) and an audit row
 * is recorded. Notification/audit failures are logged and swallowed so they can
 * never break the alert flow. Returns the created alert, or null when the
 * student already has an open alert of the same type (de-duplicated).
 */
const ensureAlert = async (
  candidate: CreateAlertInput,
  actorUserId?: number | null
): Promise<StoredAlert | null> => {
  const open = await AlertRepository.hasOpenAlert(candidate.studentId, candidate.alertType);
  if (open) return null;

  const alert = await AlertRepository.create(candidate);

  try {
    if (actorUserId != null) {
      await notifyAlertCreated(actorUserId, alert);
    }
    await recordAuditSafely(actorUserId ?? null, 'ALERT_CREATED', 'ALERT', alert.id, {
      alertType: alert.alertType,
      priority: alert.priority,
      studentId: alert.studentId
    });
  } catch (error) {
    console.error(
      `[Notification Service] Alert notification failed for alert ${alert.id}:`,
      error
    );
  }

  return alert;
};

/**
 * Evaluate rules A, B, C after a new ML1 prediction is stored. Used inside the
 * prediction flow; callers wrap it so a failure there never breaks prediction.
 */
export const evaluateAlertsAfterPrediction = async (
  prediction: StoredPrediction,
  actorUserId?: number | null
): Promise<void> => {
  const previous = await PredictionRepository.findPreviousByStudentId(
    prediction.studentId,
    prediction.id
  );

  const candidates: CreateAlertInput[] = [];
  if (isHighRisk(prediction)) {
    candidates.push(ruleHighRisk(prediction));
  }
  const ruleB = ruleRiskIncrease(prediction, previous);
  const ruleC = ruleRiskWorsening(prediction, previous);
  if (ruleB) candidates.push(ruleB);
  if (ruleC) candidates.push(ruleC);

  for (const candidate of candidates) {
    await ensureAlert(candidate, actorUserId);
  }
};

/**
 * Evaluate rule D from an already-returned ML2 analysis. Callers wrap it so a
 * failure here never breaks the risk-analysis response.
 */
export const evaluateAlertsFromMl2 = async (
  studentId: number,
  analysis: ML2AnalysisResponse,
  predictionId?: number | null,
  actorUserId?: number | null
): Promise<void> => {
  const candidates = ruleMl2Intelligence(studentId, analysis).map((c) => ({
    ...c,
    predictionId: predictionId ?? null
  }));
  for (const candidate of candidates) {
    await ensureAlert(candidate, actorUserId);
  }
};

/** List alerts with filters and pagination (newest first). */
export const listAlerts = async (filters: {
  page: number;
  limit: number;
  status?: AlertStatus | null;
  priority?: AlertPriority | null;
  studentId?: number | null;
}): Promise<{ alerts: StoredAlert[]; total: number }> => {
  const offset = (filters.page - 1) * filters.limit;
  const alerts = await AlertRepository.findAll({ ...filters, offset });
  const total = await AlertRepository.countAll(filters);
  return { alerts, total };
};

/** Fetch a single alert by id. */
export const getAlertById = async (id: number): Promise<StoredAlert | null> =>
  AlertRepository.findById(id);

/** Resolve an alert (status -> RESOLVED, resolved_at stamped). */
export const resolveAlert = async (
  id: number,
  actorUserId?: number | null
): Promise<StoredAlert | null> => {
  const alert = await AlertRepository.resolve(id);

  // Phase 12: record the resolution audit trail (never blocks the response).
  if (alert) {
    try {
      await recordAuditSafely(actorUserId ?? null, 'ALERT_RESOLVED', 'ALERT', alert.id, {
        alertType: alert.alertType,
        priority: alert.priority,
        studentId: alert.studentId
      });
    } catch (error) {
      console.error(`[Notification Service] Alert resolve audit failed for alert ${id}:`, error);
    }
  }

  return alert;
};

/** Convenience type re-export for controllers that need predictions. */
export type { AlertPriority, AlertType, StoredAlert, CreateAlertInput };