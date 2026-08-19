import { z } from 'zod';

export const createStudentSchema = z.object({
  enrollmentNumber: z.string({ required_error: 'Enrollment number is required' }).min(1, { message: 'Enrollment number cannot be empty' }).trim(),
  name: z.string({ required_error: 'Name is required' }).min(1, { message: 'Name cannot be empty' }).trim(),
  email: z.string().email({ message: 'Invalid email address' }).trim().toLowerCase().nullable().optional().or(z.literal('')),
  department: z.string({ required_error: 'Department is required' }).min(1, { message: 'Department cannot be empty' }).trim(),
  semester: z.number({ required_error: 'Semester is required' }).int().positive({ message: 'Semester must be a positive integer' })
});

export const updateStudentSchema = z.object({
  enrollmentNumber: z.string().min(1, { message: 'Enrollment number cannot be empty' }).trim().optional(),
  name: z.string().min(1, { message: 'Name cannot be empty' }).trim().optional(),
  email: z.string().email({ message: 'Invalid email address' }).trim().toLowerCase().nullable().optional().or(z.literal('')),
  department: z.string().min(1, { message: 'Department cannot be empty' }).trim().optional(),
  semester: z.number().int().positive({ message: 'Semester must be a positive integer' }).optional()
});

// Helper validation for pagination and UUID paths
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive({ message: 'Page must be a positive integer' }).default(1),
  limit: z.coerce.number().int().positive({ message: 'Limit must be a positive integer' }).default(10)
});

export const studentIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'Invalid student ID format (must be a positive integer)' })
});
