-- Phase 13 - Authentication & Role-Based Access Control (RBAC).
--
-- This script extends the EXISTING `users` table (single identity source) so it
-- can support the four controlled roles (ADMIN, FACULTY, COUNSELOR, STUDENT)
-- and link STUDENT accounts to existing students rows. It also adds a nullable
-- actor-role snapshot column to `audit_logs` for improved actor tracking.
--
-- Non-destructive, idempotent, and safe to re-run:
--   - role CHECK is DROP'd then re-ADD'd with the widened vocabulary (no data
--     loss: the old three roles remain valid).
--   - student_id is added with IF NOT EXISTS + an FK that SET NULLs on student
--     deletion so user accounts are never orphaned/destroyed.
--   - a CHECK guarantees only STUDENT accounts can carry a student_id.
--   - a partial UNIQUE index prevents duplicate accounts per student.
--
-- Run manually against the Neon database (public schema).

-- 1) Widen the users.role CHECK to include STUDENT (safe replace).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('ADMIN', 'FACULTY', 'COUNSELOR', 'STUDENT'));

-- 2) Link a STUDENT account to an existing student record (nullable FK).
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id INTEGER
  REFERENCES students (id) ON DELETE SET NULL;

-- 3) Only STUDENT accounts may reference a student record.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_student_id_role_check;
ALTER TABLE users ADD CONSTRAINT users_student_id_role_check
  CHECK (role = 'STUDENT' OR student_id IS NULL);

-- 4) One account per student (partial index: staff users keep NULL student_id).
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_student_id
  ON users (student_id) WHERE student_id IS NOT NULL;

-- 5) Audit: snapshot the actor role at the time of the action (nullable).
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS role character varying(20);