/**
 * Dashboard aggregation types (Phase 11).
 *
 * These mirror data that actually exists in the Neon schema:
 *   - students    (id, name, department, semester)
 *   - predictions (risk_probability, risk_level LOW/MEDIUM/HIGH, model_version, predicted_at)
 *   - alerts      (alert_type, priority, status ACTIVE/ACKNOWLEDGED/RESOLVED, created_at)
 *   - interventions (type, priority, status, reason, created_at, updated_at)
 *
 * ML2 results are NOT persisted in the database (Phase 8 returns them from the
 * dynamic /ml2/analyze call only), so dashboards never expose "stored ML2
 * output". Any ML2-derived intelligence reaches dashboards through the alerts
 * that Phase 9 creates from the ML2 alert-level/alert-types, which are stored.
 */

import { AlertPriority, AlertStatus, AlertType, StoredAlert } from './alert.types.js';import {
  InterventionPriority,
  InterventionStatus,
  InterventionType
} from './intervention.types.js';
import { PredictionRiskLevel } from './prediction.types.js';

/** One latest-prediction risk bucket (LOW / MEDIUM / HIGH). */
export interface RiskBucket {
  riskLevel: PredictionRiskLevel;
  count: number;
}

/** Overall student counts for the ADMIN overview. */
export interface StudentOverviewStats {
  total: number;
  withPredictions: number;
  withoutPredictions: number;
}

/** Alert rollup: totals + status breakdown. Note: no unread concept in schema. */
export interface AlertOverviewStats {
  total: number;
  active: number;
  byStatus: Partial<Record<AlertStatus, number>>;
}

/** Intervention rollup: totals + status breakdown. */
export interface InterventionOverviewStats {
  total: number;
  active: number;
  byStatus: Partial<Record<InterventionStatus, number>>;
}

/** A light-weight recent prediction row (student name joined, newest first). */
export interface RecentPrediction {
  id: number;
  studentId: number;
  studentName: string;
  riskProbability: number;
  riskLevel: PredictionRiskLevel;
  modelVersion: string | null;
  predictedAt: Date;
}

/** A light-weight recent intervention row (student name joined, newest first). */
export interface RecentIntervention {
  id: number;
  studentId: number;
  studentName: string;
  type: InterventionType;
  priority: InterventionPriority;
  status: InterventionStatus;
  reason: string;
  createdAt: Date;
}

/** A light-weight recent list item for the overview activity feed. */
export interface RecentActivity {
  predictions: RecentPrediction[];
  alerts: StoredAlert[];
  interventions: RecentIntervention[];
}

/** Full data payload for GET /api/dashboard/overview. */
export interface DashboardOverviewData {
  students: StudentOverviewStats;
  riskDistribution: RiskBucket[];
  alerts: AlertOverviewStats;
  interventions: InterventionOverviewStats;
  recentActivity: RecentActivity;
}

/**
 * A student requiring attention. "Requires attention" is defined by STORED data
 * only: latest prediction risk_level = HIGH, or an open (ACTIVE/ACKNOWLEDGED)
 * alert with priority HIGH or CRITICAL.
 */
export interface AttentionStudent {
  studentId: number;
  studentName: string;
  department: string;
  semester: number;
  latestRiskLevel: PredictionRiskLevel | null;
  latestRiskProbability: number | null;
  latestPredictedAt: Date | null;
  openAlertCount: number;
  highestAlertSeverity: AlertPriority | null;
  openInterventionCount: number;
}

/** Rollup of a single student's intervention statuses for the student dashboard. */
export interface StudentInterventionSummary {
  total: number;
  active: number;
  byStatus: Partial<Record<InterventionStatus, number>>;
}

/** Prediction trend summary for a single student (from stored predictions only). */
export interface StudentPredictionTrend {
  totalPredictions: number;
  latestRiskProbability: number | null;
  latestRiskLevel: PredictionRiskLevel | null;
  latestPredictedAt: Date | null;
}

/** Full data payload for GET /api/students/:id/dashboard. */
export interface StudentDashboardData {
  student: {
    id: number;
    name: string;
    enrollmentNumber: string;
    department: string;
    semester: number;
  };
  predictions: StudentPredictionTrend;
  alerts: {
    active: StoredAlert[];
  };
  interventions: StudentInterventionSummary;
  latestInterventions: RecentIntervention[];
}

/** Data payload for GET /api/dashboard/attention-students. */
export interface AttentionStudentsData {
  attentionStudents: AttentionStudent[];
}

/** Alert type used in AttentionStudent determination. */
export type { AlertType, AlertStatus };