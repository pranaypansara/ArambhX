import pool from '../config/db.js';
import {
  AlertPriority,
  AlertStatus,
  AlertType,
  CreateAlertInput,
  StoredAlert
} from '../types/alert.types.js';

/**
 * Repository for the existing `alerts` table in Neon PostgreSQL.
 *
 * The table already exists (created in earlier DB setup) with:
 *   - FK student_id      -> students.id      ON DELETE CASCADE
 *   - FK prediction_id   -> predictions.id   ON DELETE SET NULL
 *   - CHECK constraints on alert_type / priority / status
 *   - indexes on (student_id) and (status, priority)
 *
 * No schema changes are made in this phase — the alert system reuses it.
 */
class AlertRepository {
  /** Insert a new alert, returning the stored row joined to the student name. */
  async create(input: CreateAlertInput): Promise<StoredAlert> {
    const query = {
      text: `
        WITH inserted AS (
          INSERT INTO alerts (student_id, prediction_id, alert_type, priority, message)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING
            id,
            student_id AS "studentId",
            prediction_id AS "predictionId",
            alert_type AS "alertType",
            priority,
            message,
            status,
            created_at AS "createdAt",
            resolved_at AS "resolvedAt"
        )
        SELECT i.*, s.name AS "studentName"
        FROM inserted i
        JOIN students s ON s.id = i."studentId"
      `,
      values: [
        input.studentId,
        input.predictionId ?? null,
        input.alertType,
        input.priority,
        input.message
      ]
    };
    const { rows } = await pool.query(query);
    return rows[0] as StoredAlert;
  }

  /** Find a single alert by id. Returns null if it does not exist. */
  async findById(id: number): Promise<StoredAlert | null> {
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
        WHERE a.id = $1
      `,
      values: [id]
    };
    const { rows } = await pool.query(query);
    return (rows[0] as StoredAlert) || null;
  }

  /**
   * Check whether a non-resolved alert of the given type already exists for a
   * student. This is the application-level deduplication guard: an existing
   * ACTIVE or ACKNOWLEDGED alert for the same (student, type) suppresses
   * identical repeat inserts.
   */
  async hasOpenAlert(studentId: number, alertType: AlertType): Promise<boolean> {
    const query = {
      text: `
        SELECT EXISTS (
          SELECT 1 FROM alerts
          WHERE student_id = $1
            AND alert_type = $2
            AND status IN ('ACTIVE', 'ACKNOWLEDGED')
        ) AS "exists"
      `,
      values: [studentId, alertType]
    };
    const { rows } = await pool.query(query);
    return rows[0].exists;
  }

  /** List alerts (newest first) with optional filters and pagination. */
  async findAll({
    limit,
    offset,
    status,
    priority,
    studentId
  }: {
    limit: number;
    offset: number;
    status?: AlertStatus | null;
    priority?: AlertPriority | null;
    studentId?: number | null;
  }): Promise<StoredAlert[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`a.status = $${paramIndex++}`);
      values.push(status);
    }
    if (priority) {
      conditions.push(`a.priority = $${paramIndex++}`);
      values.push(priority);
    }
    if (studentId) {
      conditions.push(`a.student_id = $${paramIndex++}`);
      values.push(studentId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    values.push(limit, offset);

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
        ${whereClause}
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `,
      values
    };
    const { rows } = await pool.query(query);
    return rows as StoredAlert[];
  }

  /** Count alerts matching the same filter set (used for pagination metadata). */
  async countAll({
    status,
    priority,
    studentId
  }: {
    status?: AlertStatus | null;
    priority?: AlertPriority | null;
    studentId?: number | null;
  }): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`a.status = $${paramIndex++}`);
      values.push(status);
    }
    if (priority) {
      conditions.push(`a.priority = $${paramIndex++}`);
      values.push(priority);
    }
    if (studentId) {
      conditions.push(`a.student_id = $${paramIndex++}`);
      values.push(studentId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = {
      text: `SELECT COUNT(*) FROM alerts a ${whereClause}`,
      values
    };
    const { rows } = await pool.query(query);
    return parseInt(rows[0].count, 10);
  }

  /** Resolve an alert: set status to RESOLVED and stamp resolved_at. */
  async resolve(id: number): Promise<StoredAlert | null> {
    const query = {
      text: `
        WITH resolved AS (
          UPDATE alerts
          SET status = 'RESOLVED', resolved_at = COALESCE(resolved_at, CURRENT_TIMESTAMP)
          WHERE id = $1
          RETURNING
            id,
            student_id AS "studentId",
            prediction_id AS "predictionId",
            alert_type AS "alertType",
            priority,
            message,
            status,
            created_at AS "createdAt",
            resolved_at AS "resolvedAt"
        )
        SELECT r.*, s.name AS "studentName"
        FROM resolved r
        JOIN students s ON s.id = r."studentId"
      `,
      values: [id]
    };
    const { rows } = await pool.query(query);
    return (rows[0] as StoredAlert) || null;
  }
}

export default new AlertRepository();