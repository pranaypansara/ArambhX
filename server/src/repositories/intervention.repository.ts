import pool from '../config/db.js';
import {
  CreateInterventionInput,
  InterventionStatus,
  InterventionType,
  OPEN_INTERVENTION_STATUSES,
  StoredIntervention
} from '../types/intervention.types.js';

/**
 * Repository for the existing `interventions` table in Neon PostgreSQL.
 *
 * The table already exists (created in earlier DB setup) with:
 *   - FK student_id  -> students.id
 *   - FK assigned_to -> users.id (nullable; no assignment system in this phase)
 *   - CHECK constraints on type / priority / status
 *   - indexes on (student_id), (status), (assigned_to)
 *
 * No schema changes are made in this phase — the recommendation system reuses
 * the table and only ever writes the columns it genuinely needs
 * (student_id, type, reason, priority); status defaults to RECOMMENDED.
 */
class InterventionRepository {
  /** Insert a new intervention, returning the stored row joined to the student name. */
  async create(input: CreateInterventionInput): Promise<StoredIntervention> {
    const query = {
      text: `
        WITH inserted AS (
          INSERT INTO interventions (student_id, type, reason, priority, notes)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING
            id,
            student_id AS "studentId",
            type,
            reason,
            priority,
            status,
            assigned_to AS "assignedTo",
            deadline,
            notes,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        )
        SELECT i.*, s.name AS "studentName"
        FROM inserted i
        JOIN students s ON s.id = i."studentId"
      `,
      values: [
        input.studentId,
        input.type,
        input.reason,
        input.priority,
        input.notes ?? null
      ]
    };
    const { rows } = await pool.query(query);
    return rows[0] as StoredIntervention;
  }

  /** Find a single intervention by id. Returns null if it does not exist. */
  async findById(id: number): Promise<StoredIntervention | null> {
    const query = {
      text: `
        SELECT
          i.id,
          i.student_id AS "studentId",
          s.name AS "studentName",
          i.type,
          i.reason,
          i.priority,
          i.status,
          i.assigned_to AS "assignedTo",
          i.deadline,
          i.notes,
          i.created_at AS "createdAt",
          i.updated_at AS "updatedAt"
        FROM interventions i
        JOIN students s ON s.id = i.student_id
        WHERE i.id = $1
      `,
      values: [id]
    };
    const { rows } = await pool.query(query);
    return (rows[0] as StoredIntervention) || null;
  }

  /** List interventions for a student (newest first) with optional status filter and pagination. */
  async findByStudentId({
    studentId,
    limit,
    offset,
    status
  }: {
    studentId: number;
    limit: number;
    offset: number;
    status?: InterventionStatus | null;
  }): Promise<StoredIntervention[]> {
    const statusClause = status ? `WHERE i.student_id = $1 AND i.status = $2` : 'WHERE i.student_id = $1';
    const values = status ? [studentId, status, limit, offset] : [studentId, limit, offset];

    const query = {
      text: `
        SELECT
          i.id,
          i.student_id AS "studentId",
          s.name AS "studentName",
          i.type,
          i.reason,
          i.priority,
          i.status,
          i.assigned_to AS "assignedTo",
          i.deadline,
          i.notes,
          i.created_at AS "createdAt",
          i.updated_at AS "updatedAt"
        FROM interventions i
        JOIN students s ON s.id = i.student_id
        ${statusClause}
        ORDER BY i.created_at DESC, i.id DESC
        LIMIT $${status ? 3 : 2} OFFSET $${status ? 4 : 3}
      `,
      values
    };
    const { rows } = await pool.query(query);
    return rows as StoredIntervention[];
  }

  /** Count interventions for a student (used for pagination metadata). */
  async countByStudentId({
    studentId,
    status
  }: {
    studentId: number;
    status?: InterventionStatus | null;
  }): Promise<number> {
    const statusClause = status ? 'WHERE student_id = $1 AND status = $2' : 'WHERE student_id = $1';
    const values = status ? [studentId, status] : [studentId];

    const query = {
      text: `SELECT COUNT(*) FROM interventions ${statusClause}`,
      values
    };
    const { rows } = await pool.query(query);
    return parseInt(rows[0].count, 10);
  }

  /**
   * Check whether an OPEN intervention (RECOMMENDED / ASSIGNED / IN_PROGRESS)
   * of the given type already exists for a student. This is the application-level
   * de-duplication guard: the same situation should not re-create the same
   * recommended intervention on every generate call.
   */
  async hasOpenByType(studentId: number, type: InterventionType): Promise<boolean> {
    const query = {
      text: `
        SELECT EXISTS (
          SELECT 1 FROM interventions
          WHERE student_id = $1
            AND type = $2
            AND status = ANY($3::varchar[])
        ) AS "exists"
      `,
      values: [studentId, type, OPEN_INTERVENTION_STATUSES]
    };
    const { rows } = await pool.query(query);
    return rows[0].exists;
  }

  /** Update an intervention status, stamping updated_at. Returns the stored row or null. */
  async updateStatus(id: number, status: InterventionStatus): Promise<StoredIntervention | null> {
    const query = {
      text: `
        WITH updated AS (
          UPDATE interventions
          SET status = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING
            id,
            student_id AS "studentId",
            type,
            reason,
            priority,
            status,
            assigned_to AS "assignedTo",
            deadline,
            notes,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        )
        SELECT u.*, s.name AS "studentName"
        FROM updated u
        JOIN students s ON s.id = u."studentId"
      `,
      values: [id, status]
    };
    const { rows } = await pool.query(query);
    return (rows[0] as StoredIntervention) || null;
  }
}

export default new InterventionRepository();