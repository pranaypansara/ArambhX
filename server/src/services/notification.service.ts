import NotificationRepository from '../repositories/notification.repository.js';
import AuditRepository from '../repositories/audit.repository.js';
import { AlertType, StoredAlert } from '../types/alert.types.js';
import { StoredIntervention } from '../types/intervention.types.js';
import {
  CreateNotificationInput,
  NotificationRelatedEntityType,
  NotificationType,
  StoredNotification
} from '../types/notification.types.js';
import { AuditAction } from '../types/audit.types.js';

/**
 * In-app notification service (Phase 12).
 *
 * Notifications are stored DB rows targeted at real authenticated users (the
 * recipient_user_id is the actor who triggered the event, e.g. the staff
 * member who ran a prediction or generated an intervention). No email/SMS/push
 * providers, queues, or WebSockets are used.
 *
 * Every notification-creation helper below is invoked AFTER the underlying
 * action succeeded — the helper only ever runs once the alert/intervention row
 * already exists — and callers wrap failures so a notification problem can
 * never fail the primary workflow.
 */

/** Map an alert type to the notification type that represents it. */
const notificationTypeForAlert = (alertType: AlertType): NotificationType => {
  switch (alertType) {
    case 'HIGH_RISK':
    case 'CRITICAL':
      return 'HIGH_RISK_DETECTED';
    case 'EARLY_WARNING':
      return 'RISK_WORSENED';
    case 'MULTI_FACTOR':
    default:
      return 'ALERT_CREATED';
  }
};

const notificationTitleForAlert = (alertType: AlertType): string => {
  switch (alertType) {
    case 'HIGH_RISK':
      return 'High dropout risk detected';
    case 'CRITICAL':
      return 'Critical risk alert';
    case 'EARLY_WARNING':
      return 'Risk worsened';
    case 'MULTI_FACTOR':
    default:
      return 'New alert created';
  }
};

/** Record an audit log safely with structured metadata (never breaks the caller). */
export const recordAuditSafely = async (
  userId: number | null,
  action: AuditAction,
  entityType: string,
  entityId: number | null,
  details?: Record<string, unknown> | null
): Promise<void> => {
  try {
    await AuditRepository.create({ userId, action, entityType, entityId, details });
  } catch (error) {
    console.error(`[Audit] Failed to record ${action}:`, error);
  }
};

/**
 * Create a notification. De-duplication: when relatedEntityType + relatedEntityId
 * are supplied, an existing UNREAD notification of the same type for the same
 * user/entity suppresses the insert (prevents stacking duplicate alerts).
 */
const createNotification = async (
  input: CreateNotificationInput
): Promise<StoredNotification | null> => {
  if (input.relatedEntityType && input.relatedEntityId != null) {
    const exists = await NotificationRepository.hasUnreadForEntity(
      input.userId,
      input.type,
      input.relatedEntityType,
      input.relatedEntityId
    );
    if (exists) return null;
  }

  const notification = await NotificationRepository.create(input);
  await recordAuditSafely(
    input.userId,
    'NOTIFICATION_CREATED',
    'NOTIFICATION',
    notification.id,
    {
      type: notification.type,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId
    }
  );
  return notification;
};

/** Create a notification representing a freshly created alert. */
export const notifyAlertCreated = async (
  userId: number,
  alert: StoredAlert
): Promise<StoredNotification | null> => {
  return createNotification({
    userId,
    type: notificationTypeForAlert(alert.alertType),
    title: notificationTitleForAlert(alert.alertType),
    message: alert.message,
    relatedEntityType: 'ALERT',
    relatedEntityId: alert.id
  });
};

/** Create a notification representing a freshly recommended intervention. */
export const notifyInterventionRecommended = async (
  userId: number,
  intervention: StoredIntervention
): Promise<StoredNotification | null> => {
  return createNotification({
    userId,
    type: 'INTERVENTION_RECOMMENDED',
    title: 'New intervention recommended',
    message: `A ${intervention.type} intervention was recommended for student ${intervention.studentName} (id ${intervention.studentId}).`,
    relatedEntityType: 'INTERVENTION',
    relatedEntityId: intervention.id
  });
};

/** Create a notification representing an intervention status change. */
export const notifyInterventionStatusUpdated = async (
  userId: number,
  intervention: StoredIntervention,
  previousStatus: string
): Promise<StoredNotification | null> => {
  return createNotification({
    userId,
    type: 'INTERVENTION_STATUS_UPDATED',
    title: 'Intervention status updated',
    message: `Intervention ${intervention.type} for student ${intervention.studentName} (id ${intervention.studentId}) changed from ${previousStatus} to ${intervention.status}.`,
    relatedEntityType: 'INTERVENTION',
    relatedEntityId: intervention.id
  });
};

/** List a user's notifications (newest first) with optional read filter + pagination. */
export const listNotifications = async ({
  userId,
  page,
  limit,
  read
}: {
  userId: number;
  page: number;
  limit: number;
  read?: boolean | null;
}): Promise<{ notifications: StoredNotification[]; total: number }> => {
  const offset = (page - 1) * limit;
  const notifications = await NotificationRepository.findByUserId({
    userId,
    limit,
    offset,
    read
  });
  const total = await NotificationRepository.countByUserId({ userId, read });
  return { notifications, total };
};

/** Fetch a single notification owned by the user. */
export const getNotificationById = async (
  id: number,
  userId: number
): Promise<StoredNotification | null> => NotificationRepository.findByIdForUser(id, userId);

/** Unread notification count for a user. */
export const getUnreadNotificationCount = async (userId: number): Promise<number> =>
  NotificationRepository.countUnreadByUserId(userId);

/** Mark a single notification as read (owned by the user). */
export const markNotificationRead = async (
  id: number,
  userId: number
): Promise<StoredNotification | null> => {
  const notification = await NotificationRepository.markRead(id, userId);
  if (notification) {
    await recordAuditSafely(userId, 'NOTIFICATION_READ', 'NOTIFICATION', notification.id);
  }
  return notification;
};

/** Mark all of the user's notifications as read. Returns the number updated. */
export const markAllNotificationsRead = async (userId: number): Promise<number> => {
  const updated = await NotificationRepository.markAllRead(userId);
  if (updated > 0) {
    await recordAuditSafely(userId, 'NOTIFICATION_READ', 'NOTIFICATION', null, {
      markedReadCount: updated
    });
  }
  return updated;
};

/** Convenience types for controllers. */
export type { NotificationType, NotificationRelatedEntityType, StoredNotification };
export { createNotification };