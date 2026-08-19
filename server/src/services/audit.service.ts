import AuditRepository from '../repositories/audit.repository.js';
import {
  AuditAction,
  AuditLog,
  AuditLogFilters,
  CreateAuditLogInput
} from '../types/audit.types.js';

/**
 * Audit logging service (Phase 12).
 *
 * Records meaningful backend events for traceability. This is NOT a debug log:
 * only important system actions (prediction stored, alert created/resolved,
 * intervention created/updated, notification created/read) are recorded.
 *
 * - Actor tracking is supported via user_id (nullable) when authentication is
 *   present; no fake users are invented.
 * - `details` JSONB stores only non-sensitive context (ids, statuses, counts).
 *   Secrets, passwords, tokens, connection strings are never written.
 * - Failure to write an audit row must NEVER fail the primary action, so the
 *   single public `record` helper is always safe (never throws).
 */

/** Write one audit log row; never throws so it cannot break the primary flow. */
export const recordAudit = async (input: CreateAuditLogInput): Promise<AuditLog | null> => {
  try {
    return await AuditRepository.create(input);
  } catch (error) {
    console.error(`[Audit] Failed to record ${input.action}:`, error);
    return null;
  }
};

/** List audit logs (newest first) with optional filters and pagination. */
export const listAuditLogs = async (
  filters: AuditLogFilters
): Promise<{ auditLogs: AuditLog[]; total: number }> => {
  const auditLogs = await AuditRepository.findAll(filters);
  const total = await AuditRepository.countAll(filters);
  return { auditLogs, total };
};

/** Convenience re-exports for controllers and services. */
export type { AuditAction, AuditLog, AuditLogFilters, CreateAuditLogInput };