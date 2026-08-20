import pool from "../config/db.js";
import { StoredAlert } from "../types/alert.types.js";
import {
  AttentionStudent,
  RiskBucket,
  RecentIntervention,
  RecentPrediction,
} from "../types/dashboard.types.js";

/**
 * Dashboard aggregation repository (Phase 11).
 *
 * Aggregates EXISTING stored data only — no ML inference, no ML2 calls, no
 * invented metrics. All queries are parameterized and written to use the
 * existing indexes:
 *   - predictions  (student_id, predicted_at DESC)  -> DISTINCT ON latest risk
 *   - alerts       (student_id) + (status, priority) -> attention/open counts
 *   - interventions (student_id) + (status)          -> attention/open counts
 *
 * No schema changes and no new indexes are required by these queries.
 */
class DashboardRepository {
  /**
   * Fetch the bounded summary payload used by staff list/analytics screens.
   * Keeping the related collections in one query removes the frontend N+1
   * pattern while preserving the existing per-student endpoint contracts.
   */
  async getStudentSummaries(): Promise<Array<Record<string, unknown>>> {
    const query = {
      text: `
        SELECT
          s.id,
          s.enrollment_number AS "enrollmentNumber",
          s.name,
          s.email,
          s.department,
          s.semester,
          s.created_at AS "createdAt",
          s.updated_at AS "updatedAt",
          COALESCE((
            SELECT json_agg(p.item ORDER BY p.item->>'predictedAt' ASC)
            FROM (
              SELECT json_build_object(
                'id', p.id,
                'studentId', p.student_id,
                'riskProbability', p.risk_probability::float8,
                'riskLevel', p.risk_level,
                'modelVersion', p.model_version,
                'predictedAt', p.predicted_at
              ) AS item
              FROM predictions p
              WHERE p.student_id = s.id
              ORDER BY p.predicted_at DESC, p.id DESC
              LIMIT 12
            ) p
          ), '[]'::json) AS predictions,
          COALESCE((
            SELECT json_agg(a.item ORDER BY a.item->>'createdAt' ASC)
            FROM (
              SELECT json_build_object(
                'id', a.id,
                'studentId', a.student_id,
                'studentName', s.name,
                'predictionId', a.prediction_id,
                'alertType', a.alert_type,
                'priority', a.priority,
                'message', a.message,
                'status', a.status,
                'createdAt', a.created_at,
                'resolvedAt', a.resolved_at
              ) AS item
              FROM alerts a
              WHERE a.student_id = s.id
              ORDER BY a.created_at DESC, a.id DESC
              LIMIT 30
            ) a
          ), '[]'::json) AS alerts,
          COALESCE((
            SELECT json_agg(i.item ORDER BY i.item->>'createdAt' ASC)
            FROM (
              SELECT json_build_object(
                'id', i.id,
                'studentId', i.student_id,
                'studentName', s.name,
                'type', i.type,
                'reason', i.reason,
                'priority', i.priority,
                'status', i.status,
                'assignedTo', i.assigned_to,
                'deadline', i.deadline,
                'notes', i.notes,
                'createdAt', i.created_at,
                'updatedAt', i.updated_at
              ) AS item
              FROM interventions i
              WHERE i.student_id = s.id
              ORDER BY i.created_at DESC, i.id DESC
              LIMIT 30
            ) i
          ), '[]'::json) AS interventions
        FROM students s
        ORDER BY s.enrollment_number ASC
      `,
      values: [],
    };
    const { rows } = await pool.query(query);
    return rows as Array<Record<string, unknown>>;
  }

  /** Number of students that have at least one stored prediction. */
  async countStudentsWithPredictions(): Promise<number> {
    const query = {
      text: "SELECT COUNT(DISTINCT student_id)::int AS count FROM predictions",
      values: [],
    };
    const { rows } = await pool.query(query);
    return rows[0].count;
  }

  /**
   * Risk distribution based on each student's LATEST stored prediction.
   * Uses the existing (student_id, predicted_at DESC) index via DISTINCT ON.
   */
  async getRiskDistribution(): Promise<RiskBucket[]> {
    const query = {
      text: `
        SELECT latest.risk_level AS "riskLevel", COUNT(*)::int AS count
        FROM (
          SELECT DISTINCT ON (p.student_id) p.student_id, p.risk_level
          FROM predictions p
          ORDER BY p.student_id, p.predicted_at DESC
        ) latest
        GROUP BY latest.risk_level
      `,
      values: [],
    };
    const { rows } = await pool.query(query);
    return rows as RiskBucket[];
  }

  /** Alert rollup across all students: total, active, and per-status counts. */
  async getAlertOverviewStats(): Promise<{
    total: number;
    active: number;
    byStatus: Record<string, number>;
  }> {
    const query = {
      text: `
        SELECT
          COUNT(*)::int AS "total",
          COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'ACKNOWLEDGED'))::int AS "active",
          COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS "activeStatus",
          COUNT(*) FILTER (WHERE status = 'ACKNOWLEDGED')::int AS "acknowledged",
          COUNT(*) FILTER (WHERE status = 'RESOLVED')::int AS "resolved"
        FROM alerts
      `,
      values: [],
    };
    const { rows } = await pool.query(query);
    const row = rows[0];
    return {
      total: row.total,
      active: row.active,
      byStatus: {
        ACTIVE: row.activeStatus,
        ACKNOWLEDGED: row.acknowledged,
        RESOLVED: row.resolved,
      },
    };
  }

  /** Intervention rollup across all students: total, active, and per-status counts. */
  async getInterventionOverviewStats(): Promise<{
    total: number;
    active: number;
    byStatus: Record<string, number>;
  }> {
    const query = {
      text: `
        SELECT
          COUNT(*)::int AS "total",
          COUNT(*) FILTER (WHERE status IN ('RECOMMENDED', 'ASSIGNED', 'IN_PROGRESS'))::int AS "active",
          COUNT(*) FILTER (WHERE status = 'RECOMMENDED')::int AS "recommended",
          COUNT(*) FILTER (WHERE status = 'ASSIGNED')::int AS "assigned",
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS "inProgress",
          COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS "completed",
          COUNT(*) FILTER (WHERE status = 'EVALUATED')::int AS "evaluated",
          COUNT(*) FILTER (WHERE status = 'CLOSED')::int AS "closed",
          COUNT(*) FILTER (WHERE status = 'ESCALATED')::int AS "escalated"
        FROM interventions
      `,
      values: [],
    };
    const { rows } = await pool.query(query);
    const row = rows[0];
    return {
      total: row.total,
      active: row.active,
      byStatus: {
        RECOMMENDED: row.recommended,
        ASSIGNED: row.assigned,
        IN_PROGRESS: row.inProgress,
        COMPLETED: row.completed,
        EVALUATED: row.evaluated,
        CLOSED: row.closed,
        ESCALATED: row.escalated,
      },
    };
  }

  /** Recent predictions across all students (newest first, limited). */
  async getRecentPredictions(limit: number): Promise<RecentPrediction[]> {
    const query = {
      text: `
        SELECT
          p.id,
          p.student_id AS "studentId",
          s.name AS "studentName",
          p.risk_probability::float8 AS "riskProbability",
          p.risk_level AS "riskLevel",
          p.model_version AS "modelVersion",
          p.predicted_at AS "predictedAt"
        FROM predictions p
        JOIN students s ON s.id = p.student_id
        ORDER BY p.predicted_at DESC, p.id DESC
        LIMIT $1
      `,
      values: [limit],
    };
    const { rows } = await pool.query(query);
    return rows as RecentPrediction[];
  }

  /** Recent alerts across all students (newest first, limited). */
  async getRecentAlerts(limit: number): Promise<StoredAlert[]> {
    const query = {
      text: `
        SELECT
          a.id,
          a.student_id AS "studentId",
          s.name AS "studentName",
          a.prediction_id AS "predictionId",
          a.alert_type AS "alertType",
          a.priority,
          a.message,
          a.status,
          a.created_at AS "createdAt",
          a.resolved_at AS "resolvedAt"
        FROM alerts a
        JOIN students s ON s.id = a.student_id
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT $1
      `,
      values: [limit],
    };
    const { rows } = await pool.query(query);
    return rows as StoredAlert[];
  }

  /** Recent interventions across all students (newest first, limited). */
  async getRecentInterventions(limit: number): Promise<RecentIntervention[]> {
    const query = {
      text: `
        SELECT
          i.id,
          i.student_id AS "studentId",
          s.name AS "studentName",
          i.type,
          i.priority,
          i.status,
          i.reason,
          i.created_at AS "createdAt"
        FROM interventions i
        JOIN students s ON s.id = i.student_id
        ORDER BY i.created_at DESC, i.id DESC
        LIMIT $1
      `,
      values: [limit],
    };
    const { rows } = await pool.query(query);
    return rows as RecentIntervention[];
  }

  /**
   * Students requiring attention.
   *
   * "Requires attention" is defined strictly from stored data: the student's
   * LATEST prediction risk_level = 'HIGH', OR the student has an open
   * (ACTIVE/ACKNOWLEDGED) alert with priority HIGH or CRITICAL.
   *
   * One query with LATERAL joins per student (each using existing student_id
   * indexes) — no application-level N+1.
   */
  async getAttentionStudents(limit: number): Promise<AttentionStudent[]> {
    const query = {
      text: `
        SELECT
          s.id AS "studentId",
          s.name AS "studentName",
          s.department,
          s.semester,
          latest."riskLevel" AS "latestRiskLevel",
          latest."riskProbability" AS "latestRiskProbability",
          latest."predictedAt" AS "latestPredictedAt",
          COALESCE(alerts."openAlertCount", 0)::int AS "openAlertCount",
          alerts."highestSeverity" AS "highestAlertSeverity",
          COALESCE(ints."openInterventionCount", 0)::int AS "openInterventionCount"
        FROM students s
        LEFT JOIN LATERAL (
          SELECT
            p.risk_level AS "riskLevel",
            p.risk_probability::float8 AS "riskProbability",
            p.predicted_at AS "predictedAt"
          FROM predictions p
          WHERE p.student_id = s.id
          ORDER BY p.predicted_at DESC, p.id DESC
          LIMIT 1
        ) latest ON true
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS "openAlertCount",
            MAX(CASE a.priority
              WHEN 'CRITICAL' THEN 4
              WHEN 'HIGH' THEN 3
              WHEN 'MEDIUM' THEN 2
              ELSE 1 END)::int AS "highestSeverity"
          FROM alerts a
          WHERE a.student_id = s.id
            AND a.status IN ('ACTIVE', 'ACKNOWLEDGED')
        ) alerts ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS "openInterventionCount"
          FROM interventions i
          WHERE i.student_id = s.id
            AND i.status IN ('RECOMMENDED', 'ASSIGNED', 'IN_PROGRESS')
        ) ints ON true
        WHERE latest."riskLevel" = 'HIGH'
           OR alerts."highestSeverity" IS NOT NULL AND alerts."highestSeverity" >= 3
        ORDER BY alerts."highestSeverity" DESC NULLS LAST,
                 latest."predictedAt" DESC NULLS LAST,
                 s.id ASC
        LIMIT $1
      `,
      values: [limit],
    };
    const { rows } = await pool.query(query);
    return rows as AttentionStudent[];
  }

  /**
   * Prediction trend summary for one student: total stored predictions and the
   * latest stored risk snapshot. Scalar subqueries keep this a single round trip.
   */
  async getStudentPredictionTrend(studentId: number): Promise<{
    totalPredictions: number;
    latestRiskProbability: number | null;
    latestRiskLevel: string | null;
    latestPredictedAt: Date | null;
  }> {
    const query = {
      text: `
        SELECT
          (SELECT COUNT(*)::int FROM predictions WHERE student_id = $1) AS "totalPredictions",
          (SELECT risk_probability::float8 FROM predictions WHERE student_id = $1 ORDER BY predicted_at DESC, id DESC LIMIT 1) AS "latestRiskProbability",
          (SELECT risk_level FROM predictions WHERE student_id = $1 ORDER BY predicted_at DESC, id DESC LIMIT 1) AS "latestRiskLevel",
          (SELECT predicted_at FROM predictions WHERE student_id = $1 ORDER BY predicted_at DESC, id DESC LIMIT 1) AS "latestPredictedAt"
      `,
      values: [studentId],
    };
    const { rows } = await pool.query(query);
    const row = rows[0];
    return {
      totalPredictions: row.totalPredictions,
      latestRiskProbability: row.latestRiskProbability,
      latestRiskLevel: row.latestRiskLevel,
      latestPredictedAt: row.latestPredictedAt,
    };
  }

  /** Intervention summary for one student: total, active, and per-status counts. */
  async getStudentInterventionSummary(studentId: number): Promise<{
    total: number;
    active: number;
    byStatus: Record<string, number>;
  }> {
    const query = {
      text: `
        SELECT
          COUNT(*)::int AS "total",
          COUNT(*) FILTER (WHERE status IN ('RECOMMENDED', 'ASSIGNED', 'IN_PROGRESS'))::int AS "active",
          COUNT(*) FILTER (WHERE status = 'RECOMMENDED')::int AS "recommended",
          COUNT(*) FILTER (WHERE status = 'ASSIGNED')::int AS "assigned",
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS "inProgress",
          COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS "completed",
          COUNT(*) FILTER (WHERE status = 'EVALUATED')::int AS "evaluated",
          COUNT(*) FILTER (WHERE status = 'CLOSED')::int AS "closed",
          COUNT(*) FILTER (WHERE status = 'ESCALATED')::int AS "escalated"
        FROM interventions
        WHERE student_id = $1
      `,
      values: [studentId],
    };
    const { rows } = await pool.query(query);
    const row = rows[0];
    return {
      total: row.total,
      active: row.active,
      byStatus: {
        RECOMMENDED: row.recommended,
        ASSIGNED: row.assigned,
        IN_PROGRESS: row.inProgress,
        COMPLETED: row.completed,
        EVALUATED: row.evaluated,
        CLOSED: row.closed,
        ESCALATED: row.escalated,
      },
    };
  }

  /** Recent interventions for one student (newest first, limited). */
  async getRecentInterventionsForStudent(
    studentId: number,
    limit: number,
  ): Promise<RecentIntervention[]> {
    const query = {
      text: `
        SELECT
          i.id,
          i.student_id AS "studentId",
          s.name AS "studentName",
          i.type,
          i.priority,
          i.status,
          i.reason,
          i.created_at AS "createdAt"
        FROM interventions i
        JOIN students s ON s.id = i.student_id
        WHERE i.student_id = $1
        ORDER BY i.created_at DESC, i.id DESC
        LIMIT $2
      `,
      values: [studentId, limit],
    };
    const { rows } = await pool.query(query);
    return rows as RecentIntervention[];
  }
}

export default new DashboardRepository();
