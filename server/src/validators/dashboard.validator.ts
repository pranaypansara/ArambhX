import { z } from 'zod';

/**
 * Optional pagination/filter schema for dashboard endpoints. Dashboards keep
 * query parameters minimal: only simple, useful limits are exposed. Invalid
 * values are rejected with a 400 via the global Zod error handler.
 */
export const dashboardQuerySchema = z.object({
  page: z.coerce.number().int().positive({ message: 'Page must be a positive integer' }).default(1),
  limit: z.coerce.number().int().positive({ message: 'Limit must be a positive integer' }).default(20)
});

/**
 * Cap the recent-activity lists returned by the overview. A smaller default
 * keeps the payload light; a hard max prevents pathological limit params.
 */
export const recentActivityLimitSchema = z.coerce
  .number()
  .int()
  .positive({ message: 'Recent activity limit must be a positive integer' })
  .max(50, { message: 'Recent activity limit cannot exceed 50' })
  .default(10);