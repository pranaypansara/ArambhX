import { z } from 'zod';
import { AUDIT_ACTIONS } from '../types/audit.types.js';

/**
 * Filters for the audit log listing API. action/entityType/entityId are
 * optional and kept simple; no complex search or full-text pagination.
 */
export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive({ message: 'Page must be a positive integer' }).default(1),
  limit: z.coerce.number().int().positive({ message: 'Limit must be a positive integer' }).max(100, { message: 'Limit cannot exceed 100' }).default(20),
  action: z
    .enum(AUDIT_ACTIONS, { message: 'Invalid audit action filter' })
    .optional()
    .nullable(),
  entityType: z.string().trim().min(1, { message: 'Entity type cannot be empty' }).optional().nullable(),
  entityId: z.coerce.number().int().positive({ message: 'Invalid entity ID filter' }).optional().nullable()
});