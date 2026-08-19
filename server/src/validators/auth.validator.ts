import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).trim(),
  email: z.string().email({ message: 'Invalid email address' }).trim().toLowerCase(),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
  role: z.enum(['ADMIN', 'FACULTY', 'COUNSELOR'], {
    errorMap: () => ({ message: 'Role must be either ADMIN, FACULTY, or COUNSELOR' })
  }).optional()
});

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }).trim().toLowerCase(),
  password: z.string().min(1, { message: 'Password is required' })
});
