/**
 * Authentication / RBAC types (Phase 13).
 *
 * The existing `users` table is reused as the single identity source. It has:
 *   id, name, email (unique), password (bcrypt hash), role, created_at,
 *   updated_at. Phase 13 adds a nullable `student_id` column linkage so a
 *   STUDENT account can reference an existing `students.id` row and a CHECK
 *   that restricts role to the four supported values.
 *
 * Roles are a controlled TypeScript union — no arbitrary role strings are
 * accepted by validators or services.
 */

export const USER_ROLES = ['ADMIN', 'FACULTY', 'COUNSELOR', 'STUDENT'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** A row from the `users` table including the (optional) password hash.
 *  password is only present on lookups that need verification (login). */
export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  studentId: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Safe, password-free profile attached to the request by the `protect`
 *  middleware and returned by login / me / admin-created-user responses. */
export interface UserPayload {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  studentId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUser = UserPayload;