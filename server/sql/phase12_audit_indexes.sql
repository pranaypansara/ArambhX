-- Phase 12 - audit_logs support indexes.
--
-- The existing `audit_logs` table has only its primary key (id). The Phase 12
-- audit listing API (GET /api/audit-logs) filters by action, by
-- (entity_type, entity_id), and always orders newest-first by created_at, so
-- these three indexes cover the real query patterns.
--
-- NOTIFICATIONS needs no schema change: it already carries an index on
-- (user_id, is_read) that serves the per-user list and unread-count queries.
--
-- Audit logs are append-mostly and low-volume, so index write overhead is
-- negligible.
--
-- Run manually against the Neon database (public schema). Idempotent.
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs (action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);