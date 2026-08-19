import { z } from 'zod';
import { ALERT_PRIORITIES, ALERT_STATUSES } from '../types/alert.types.js';

/** Positive integer alert ID path parameter. */
export const alertIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'Invalid alert ID format (must be a positive integer)' })
});

/**
 * Optional filters for alert listing. Query params keep server-side validation:
 * invalid status / priority values are rejected with a 400 via the global Zod
 * error handler instead of silent 500s.
 */
export const alertQuerySchema = z.object({
  page: z.coerce.number().int().positive({ message: 'Page must be a positive integer' }).default(1),
  limit: z.coerce.number().int().positive({ message: 'Limit must be a positive integer' }).default(10),
  status: z
    .enum(ALERT_STATUSES, { message: 'Invalid alert status filter' })
    .optional()
    .nullable(),
  priority: z
    .enum(ALERT_PRIORITIES, { message: 'Invalid alert priority filter' })
    .optional()
    .nullable(),
  studentId: z.coerce.number().int().positive({ message: 'Invalid student ID filter' }).optional().nullable()
});