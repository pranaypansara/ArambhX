import { z } from 'zod';
import { USER_ROLES } from '../types/auth.types.js';

/**
 * Public registration schema.
 *
 * Deliberately does NOT accept a `role` field: the server derives the role
 * (STUDENT when a valid studentId is supplied, otherwise the FACULTY staff
 * default). A client-provided role is ignored/stripped, so public registration
 * can never mint an ADMIN/COUNSELLOR.
 */
export const registerSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).trim(),
  email: z.string().email({ message: 'Invalid email address' }).trim().toLowerCase(),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
  studentId: z.coerce
    .number()
    .int()
    .positive({ message: 'Invalid student ID (must be a positive integer)' })
    .optional()
    .nullable()
});

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }).trim().toLowerCase(),
  password: z.string().min(1, { message: 'Password is required' })
});

/**
 * ADMIN-only account creation schema. role is restricted to the controlled
 * vocabulary, and a STUDENT role requires a valid studentId link.
 */
export const createUserSchema = z
  .object({
    name: z.string().min(1, { message: 'Name is required' }).trim(),
    email: z.string().email({ message: 'Invalid email address' }).trim().toLowerCase(),
    password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
    role: z.enum(USER_ROLES, {
      errorMap: () => ({
        message: `Role must be one of: ${USER_ROLES.join(', ')}`
      })
    }),
    studentId: z.coerce
      .number()
      .int()
      .positive({ message: 'Invalid student ID (must be a positive integer)' })
      .optional()
      .nullable()
  })
  .superRefine((data, ctx) => {
    if (data.role === 'STUDENT' && data.studentId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['studentId'],
        message: 'A student_id is required when creating a STUDENT account'
      });
    }
  });