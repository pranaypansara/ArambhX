import { z } from 'zod';
import { NOTIFICATION_TYPES } from '../types/notification.types.js';

/** Positive integer notification ID path parameter. */
export const notificationIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'Invalid notification ID format (must be a positive integer)' })
});

/**
 * Query params for the notification list endpoint. Supports optional read/unread
 * filtering and a simple page/limit following existing conventions. Invalid
 * values are rejected with a 400 via the global Zod error handler.
 */
export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive({ message: 'Page must be a positive integer' }).default(1),
  limit: z.coerce.number().int().positive({ message: 'Limit must be a positive integer' }).max(100, { message: 'Limit cannot exceed 100' }).default(20),
  read: z
    .enum(['true', 'false', 'read', 'unread', '1', '0'], { message: 'Invalid read filter' })
    .optional()
});

/**
 * Optional filters for the internal notification-creation helper (not exposed
 * as a user-facing API schema). Guards against arbitrary notification types.
 */
export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES, {
  message: 'Invalid notification type'
});