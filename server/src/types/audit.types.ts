/**
 * Audit log types mirroring the actual `audit_logs` table in Neon PostgreSQL
 * (schema inspected directly from the live database).
 *
 * Existing table columns:
 *   - user_id (nullable FK -> users.id): actor who performed the action
 *   - action (varchar(100), NOT NULL): controlled vocabulary below
 *   - entity_type (varchar(100), NOT NULL): kind of record affected
 *   - entity_id (nullable int)
 *   - details (jsonb, nullable): non-sensitive structured context
 *   - created_at
 *
 * The table has no CHECK on action/entity_type, so the app enforces the
 * controlled vocabularies below.
 */

/**
 * Controlled audit actions. Only actions the system genuinely performs are
 * included — no invented events.
 */
export const AUDIT_ACTIONS = [
  'PREDICTION_CREATED',
  'ALERT_CREATED',
  'ALERT_RESOLVED',
  'INTERVENTION_CREATED',
  'INTERVENTION_STATUS_UPDATED',
  'NOTIFICATION_CREATED',
  'NOTIFICATION_READ'
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Input used to write an audit log row. */
export interface CreateAuditLogInput {
  userId?: number | null;
  action: AuditAction;
  entityType: string;
  entityId?: number | null;
  details?: Record<string, unknown> | null;
}

/** A row from the `audit_logs` table surfaced by the audit repository. */
export interface AuditLog {
  id: number;
  userId: number | null;
  userName: string | null;
  action: AuditAction;
  entityType: string;
  entityId: number | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

/** Filters accepted by the audit log listing API. */
export interface AuditLogFilters {
  page: number;
  limit: number;
  action?: AuditAction | null;
  entityType?: string | null;
  entityId?: number | null;
}