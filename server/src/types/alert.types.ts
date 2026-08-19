/**
 * Alert types mirroring the actual `alerts` table in Neon PostgreSQL
 * (schema inspected directly from the live database).
 *
 * The table already enforces the vocabulary below via CHECK constraints:
 *   alert_type IN ('EARLY_WARNING','HIGH_RISK','CRITICAL','MULTI_FACTOR')
 *   priority   IN ('LOW','MEDIUM','HIGH','CRITICAL')
 *   status     IN ('ACTIVE','ACKNOWLEDGED','RESOLVED')
 */

export const ALERT_TYPES = ['EARLY_WARNING', 'HIGH_RISK', 'CRITICAL', 'MULTI_FACTOR'] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type AlertPriority = (typeof ALERT_PRIORITIES)[number];

export const ALERT_STATUSES = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

/** Input used when the alert service decides an alert should be created. */
export interface CreateAlertInput {
  studentId: number;
  predictionId?: number | null;
  alertType: AlertType;
  priority: AlertPriority;
  message: string;
}

/** A row from the `alerts` table surfaced by the alert repository. */
export interface StoredAlert {
  id: number;
  studentId: number;
  studentName: string;
  predictionId: number | null;
  alertType: AlertType;
  priority: AlertPriority;
  message: string;
  status: AlertStatus;
  createdAt: Date;
  resolvedAt: Date | null;
}