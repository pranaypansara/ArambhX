import pool from '../config/db.js';
import {
  AuditLog,
  AuditLogFilters,
  CreateAuditLogInput
} from '../types/audit.types.js';

/**
 * Repository for the existing `audit_logs` table in Neon PostgreSQL.
 *
 * The table already exists (created in earlier DB setup) with:
 *   - FK user_id -> users.id (nullable): actor when authentication is present
 *   - details JSONB for non-sensitive structured context
 *
 * Phase 13 added a nullable `role` column that snapshots the actor's role at
 * the time of the action. It is populated automatically from the users table
 * (via a subquery) so callers do not need to thread role through every call
 * site.
 *
 * No CREATE TABLE is performed — the table is reused.
 */
class AuditRepository {
  /** Insert an audit log row. The actor's role is snapshotted from `users`. */
  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const query = {
      text: `
        WITH inserted AS (
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, role)
          VALUES ($1, $2, $3, $4, $5, (SELECT role FROM users WHERE id = $1))
          RETURNING
            id,
            user_id AS "userId",
            action,
            entity_type AS "entityType",
            entity_id AS "entityId",
            details,
            role,
            created_at AS "createdAt"
        )
        SELECT i.*, u.name AS "userName"
        FROM inserted i
        LEFT JOIN users u ON u.id = i."userId"
      `,
      values: [
        input.userId ?? null,
        input.action,
        input.entityType,
        input.entityId ?? null,
        input.details != null ? JSON.stringify(input.details) : null
      ]
    };
    const { rows } = await pool.query(query);
    return rows[0] as AuditLog;
  }

  /** List audit logs (newest first) with optional filters and pagination. */
  async findAll(filters: AuditLogFilters): Promise<AuditLog[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.action) {
      conditions.push(`a.action = $${paramIndex++}`);
      values.push(filters.action);
    }
    if (filters.entityType) {
      conditions.push(`a.entity_type = $${paramIndex++}`);
      values.push(filters.entityType);
    }
    if (filters.entityId) {
      conditions.push(`a.entity_id = $${paramIndex++}`);
      values.push(filters.entityId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.limit;

    values.push(filters.limit, offset);

    const query = {
      text: `
        SELECT
          a.id,
          a.user_id AS "userId",
          u.name AS "userName",
          a.action,
          a.entity_type AS "entityType",
          a.entity_id AS "entityId",
          a.details,
          a.role,
          a.created_at AS "createdAt"
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.user_id
        ${whereClause}
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `,
      values
    };
    const { rows } = await pool.query(query);
    return rows as AuditLog[];
  }

  /** Count audit logs matching the same filter set (pagination metadata). */
  async countAll(filters: AuditLogFilters): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.action) {
      conditions.push(`a.action = $${paramIndex++}`);
      values.push(filters.action);
    }
    if (filters.entityType) {
      conditions.push(`a.entity_type = $${paramIndex++}`);
      values.push(filters.entityType);
    }
    if (filters.entityId) {
      conditions.push(`a.entity_id = $${paramIndex++}`);
      values.push(filters.entityId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = {
      text: `SELECT COUNT(*)::int AS count FROM audit_logs a ${whereClause}`,
      values
    };
    const { rows } = await pool.query(query);
    return rows[0].count;
  }
}

export default new AuditRepository();