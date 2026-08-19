import { z } from 'zod';
import {
  INTERVENTION_STATUSES
} from '../types/intervention.types.js';

/** Positive integer intervention ID path parameter. */
export const interventionIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'Invalid intervention ID format (must be a positive integer)' })
});

/**
 * Optional filters for intervention listing. Query params keep server-side
 * validation: invalid status values are rejected with a 400 via the global Zod
 * error handler instead of silent 500s.
 */
export const interventionQuerySchema = z.object({
  page: z.coerce.number().int().positive({ message: 'Page must be a positive integer' }).default(1),
  limit: z.coerce.number().int().positive({ message: 'Limit must be a positive integer' }).default(10),
  status: z
    .enum(INTERVENTION_STATUSES, { message: 'Invalid intervention status filter' })
    .optional()
    .nullable()
});

/**
 * Body for updating an intervention status. The value must be one of the
 * statuses allowed by the `interventions` CHECK constraint; the full lifecycle
 * transition map is enforced in the service layer.
 */
export const updateInterventionStatusSchema = z.object({
  status: z.enum(INTERVENTION_STATUSES, {
    required_error: 'Status is required',
    message: 'Invalid intervention status'
  })
});