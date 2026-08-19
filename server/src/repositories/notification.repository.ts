import pool from '../config/db.js';
import {
  CreateNotificationInput,
  NotificationType,
  StoredNotification
} from '../types/notification.types.js';

/**
 * Repository for the existing `notifications` table in Neon PostgreSQL.
 *
 * The table already exists (created in earlier DB setup) with:
 *   - FK user_id -> users.id (NOT NULL): recipients are real authenticated users
 *   - index on (user_id, is_read) for per-user listing + unread counts
 *
 * No schema changes are made in this phase — the system reuses the table.
 */
class NotificationRepository {
  /** Insert a new notification, returning the stored row. */
  async create(input: CreateNotificationInput): Promise<StoredNotification> {
    const query = {
      text: `
        INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          user_id AS "userId",
          type,
          title,
          message,
          is_read AS "isRead",
          related_entity_type AS "relatedEntityType",
          related_entity_id AS "relatedEntityId",
          created_at AS "createdAt"
      `,
      values: [
        input.userId,
        input.type,
        input.title,
        input.message,
        input.relatedEntityType ?? null,
        input.relatedEntityId ?? null
      ]
    };
    const { rows } = await pool.query(query);
    return rows[0] as StoredNotification;
  }

  /** Find a notification by id for a specific recipient. Returns null if not found. */
  async findByIdForUser(id: number, userId: number): Promise<StoredNotification | null> {
    const query = {
      text: `
        SELECT
          id,
          user_id AS "userId",
          type,
          title,
          message,
          is_read AS "isRead",
          related_entity_type AS "relatedEntityType",
          related_entity_id AS "relatedEntityId",
          created_at AS "createdAt"
        FROM notifications
        WHERE id = $1 AND user_id = $2
      `,
      values: [id, userId]
    };
    const { rows } = await pool.query(query);
    return (rows[0] as StoredNotification) || null;
  }

  /** List notifications for a user (newest first) with optional read filter and pagination. */
  async findByUserId({
    userId,
    limit,
    offset,
    read
  }: {
    userId: number;
    limit: number;
    offset: number;
    read?: boolean | null;
  }): Promise<StoredNotification[]> {
    const readClause =
      read === null || read === undefined ? '' : read ? 'AND is_read = TRUE' : 'AND is_read = FALSE';

    const query = {
      text: `
        SELECT
          id,
          user_id AS "userId",
          type,
          title,
          message,
          is_read AS "isRead",
          related_entity_type AS "relatedEntityType",
          related_entity_id AS "relatedEntityId",
          created_at AS "createdAt"
        FROM notifications
        WHERE user_id = $1 ${readClause}
        ORDER BY created_at DESC, id DESC
        LIMIT $2 OFFSET $3
      `,
      values: [userId, limit, offset]
    };
    const { rows } = await pool.query(query);
    return rows as StoredNotification[];
  }

  /** Count notifications for the given user + read filter (pagination metadata). */
  async countByUserId({
    userId,
    read
  }: {
    userId: number;
    read?: boolean | null;
  }): Promise<number> {
    const readClause =
      read === null || read === undefined ? '' : read ? 'AND is_read = TRUE' : 'AND is_read = FALSE';

    const query = {
      text: `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 ${readClause}`,
      values: [userId]
    };
    const { rows } = await pool.query(query);
    return rows[0].count;
  }

  /** Count unread notifications for a user. */
  async countUnreadByUserId(userId: number): Promise<number> {
    const query = {
      text: `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      values: [userId]
    };
    const { rows } = await pool.query(query);
    return rows[0].count;
  }

  /**
   * De-duplication guard: returns true when an EXISTING UNREAD notification of
   * the same type already points at the same related entity for this user.
   * Read notifications are ignored so a genuinely new occurrence can re-create.
   */
  async hasUnreadForEntity(
    userId: number,
    type: NotificationType,
    relatedEntityType: string,
    relatedEntityId: number
  ): Promise<boolean> {
    const query = {
      text: `
        SELECT EXISTS (
          SELECT 1 FROM notifications
          WHERE user_id = $1
            AND type = $2
            AND related_entity_type = $3
            AND related_entity_id = $4
            AND is_read = FALSE
        ) AS "exists"
      `,
      values: [userId, type, relatedEntityType, relatedEntityId]
    };
    const { rows } = await pool.query(query);
    return rows[0].exists;
  }

  /** Mark a notification as read (only if owned by the user). Returns stored row or null. */
  async markRead(id: number, userId: number): Promise<StoredNotification | null> {
    const query = {
      text: `
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = $1 AND user_id = $2
        RETURNING
          id,
          user_id AS "userId",
          type,
          title,
          message,
          is_read AS "isRead",
          related_entity_type AS "relatedEntityType",
          related_entity_id AS "relatedEntityId",
          created_at AS "createdAt"
      `,
      values: [id, userId]
    };
    const { rows } = await pool.query(query);
    return (rows[0] as StoredNotification) || null;
  }

  /** Mark all of a user's notifications as read. Returns the number updated. */
  async markAllRead(userId: number): Promise<number> {
    const query = {
      text: `
        UPDATE notifications
        SET is_read = TRUE
        WHERE user_id = $1 AND is_read = FALSE
      `,
      values: [userId]
    };
    const result = await pool.query(query);
    return result.rowCount ?? 0;
  }
}

export default new NotificationRepository();