import { z } from 'zod';

export const createAcademicRecordSchema = z.object({
  averageMarks: z.coerce.number()
    .min(0, { message: 'Average marks cannot be less than 0' })
    .max(100, { message: 'Average marks cannot exceed 100' })
    .optional(),
  backlogCount: z.coerce.number({ required_error: 'Backlog count is required' })
    .int()
    .min(0, { message: 'Backlog count cannot be negative' }),
  assignmentCompletion: z.coerce.number()
    .min(0, { message: 'Assignment completion cannot be less than 0' })
    .max(100, { message: 'Assignment completion cannot exceed 100' })
    .optional(),
  lmsActivity: z.coerce.number()
    .min(0, { message: 'LMS activity cannot be less than 0' })
    .max(100, { message: 'LMS activity cannot exceed 100' })
    .optional(),
  recordedAt: z.string()
    .trim()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'recordedAt must be a valid date or timestamp string' })
    .optional()
});
