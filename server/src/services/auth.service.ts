import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserRepository from '../repositories/user.repository.js';
import StudentRepository from '../repositories/student.repository.js';
import { getJwtExpiresIn, getJwtSecret } from '../config/auth.js';
import { User, UserPayload, UserRole } from '../types/auth.types.js';

/**
 * Authentication service (Phase 13).
 *
 * Thin controllers: all credential logic, hashing, token generation and
 * role-derivation lives here. Passwords are:
 *   - hashed with bcrypt before storage (never plain text, never returned),
 *   - never logged, never included in audit logs.
 *
 * Registration is deliberately role-safe:
 *   - The public endpoint NEVER accepts a client-provided role — it creates
 *     FACULTY (staff default) or a STUDENT account linked to a verified,
 *     existing `students.id`.
 *   - Privileged roles (ADMIN, COUNSELLOR, and arbitrary role assignment) are
 *     created only through the ADMIN-only `POST /api/auth/admin/create-user`.
 */

/** bcrypt cost factor — reused rather than re-invented. */
export const BCRYPT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (
  password: string,
  passwordHash: string
): Promise<boolean> => bcrypt.compare(password, passwordHash);

/** Minimal JWT payload: identity claims only, no secrets or hashes. */
export const generateToken = (user: Pick<UserPayload, 'id' | 'role' | 'studentId'>): string =>
  jwt.sign(
    { id: user.id, role: user.role, studentId: user.studentId },
    getJwtSecret(),
    { expiresIn: getJwtExpiresIn() } as jwt.SignOptions
  );

/** Strip any sensitive fields before returning a user to the client. */
export const toSafeUser = (user: User | UserPayload): UserPayload => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  studentId: user.studentId ?? null,
  createdAt: user.createdAt as Date,
  updatedAt: user.updatedAt as Date
});

export class EmailAlreadyRegisteredError extends Error {
  readonly statusCode = 400;
  constructor() {
    super('A user with this email already exists');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

export class InvalidCredentialsError extends Error {
  readonly statusCode = 401;
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class InvalidStudentLinkError extends Error {
  readonly statusCode = 400;
  constructor(studentId: number) {
    super(`Invalid student linkage: no student with id ${studentId} exists`);
    this.name = 'InvalidStudentLinkError';
  }
}

export class MissingStudentLinkError extends Error {
  readonly statusCode = 400;
  constructor() {
    super('A student_id is required when creating a STUDENT account');
    this.name = 'MissingStudentLinkError';
  }
}

/** Verify that a student_id references an existing student row. */
const requireExistingStudent = async (studentId: number): Promise<void> => {
  const student = await StudentRepository.findById(studentId);
  if (!student) {
    throw new InvalidStudentLinkError(studentId);
  }
};

/**
 * Public registration.
 *
 * No role is accepted from the client:
 *   - With a valid studentId  -> STUDENT account linked to that student.
 *   - Without a studentId     -> FACULTY (safe staff default).
 */
export const registerPublic = async ({
  name,
  email,
  password,
  studentId
}: {
  name: string;
  email: string;
  password: string;
  studentId?: number | null;
}): Promise<UserPayload> => {
  const existing = await UserRepository.findByEmail(email);
  if (existing) {
    throw new EmailAlreadyRegisteredError();
  }

  let role: UserRole = 'FACULTY';
  let linkedStudentId: number | null = null;

  if (studentId != null) {
    await requireExistingStudent(studentId);
    role = 'STUDENT';
    linkedStudentId = studentId;
  }

  const hashed = await hashPassword(password);
  return UserRepository.create({
    name,
    email,
    password: hashed,
    role,
    studentId: linkedStudentId
  });
};

/**
 * ADMIN-only account creation (bootstrap for privileged roles, COUNSELLOR,
 * additional ADMINs, or STUDENT accounts with an explicit link).
 * role is a validated, server-controlled value — never client-typed blindly.
 */
export const adminCreateUser = async ({
  name,
  email,
  password,
  role,
  studentId
}: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  studentId?: number | null;
}): Promise<UserPayload> => {
  const existing = await UserRepository.findByEmail(email);
  if (existing) {
    throw new EmailAlreadyRegisteredError();
  }

  let linkedStudentId: number | null = null;
  if (role === 'STUDENT') {
    if (studentId == null) {
      throw new MissingStudentLinkError();
    }
    await requireExistingStudent(studentId);
    linkedStudentId = studentId;
  }

  const hashed = await hashPassword(password);
  return UserRepository.create({
    name,
    email,
    password: hashed,
    role,
    studentId: linkedStudentId
  });
};

/**
 * Login.
 *
 * A single generic "Invalid email or password" response is used so the API
 * never reveals whether an email exists. On success returns the token plus a
 * safe user profile.
 */
export const login = async ({
  email,
  password
}: {
  email: string;
  password: string;
}): Promise<{ token: string; user: UserPayload }> => {
  const user = await UserRepository.findByEmail(email);
  if (!user) {
    throw new InvalidCredentialsError();
  }

  const isMatch = await verifyPassword(password, user.password || '');
  if (!isMatch) {
    throw new InvalidCredentialsError();
  }

  const token = generateToken({ id: user.id, role: user.role, studentId: user.studentId });
  return { token, user: toSafeUser(user) };
};