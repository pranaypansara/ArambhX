import { Request, Response, NextFunction } from 'express';
import {
  notificationIdParamSchema,
  notificationQuerySchema
} from '../validators/notification.validator.js';
import {
  listNotifications,
  getNotificationById,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead
} from '../services/notification.service.js';

const toBooleanFilter = (value: string | undefined): boolean | null => {
  if (value === undefined) return null;
  return value === 'true' || value === 'read' || value === '1';
};

// @desc    List notifications for the authenticated user (newest first)
// @route   GET /api/notifications
// @access  Private (authenticated user)
export const getAllNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const parsedQuery = notificationQuerySchema.parse(req.query);
    const { page, limit } = parsedQuery;
    const read = toBooleanFilter(parsedQuery.read);

    const { notifications, total } = await listNotifications({
      userId: req.user!.id,
      page,
      limit,
      read
    });

    res.status(200).json({
      success: true,
      message: 'Notifications fetched successfully',
      data: { notifications },
      pagination: {
        page,
        limit,
        totalNotifications: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unread notification count for the authenticated user
// @route   GET /api/notifications/unread-count
// @access  Private (authenticated user)
export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const count = await getUnreadNotificationCount(req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Unread notification count fetched successfully',
      data: { unreadCount: count }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private (authenticated user, own notifications only)
export const markOneRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = notificationIdParamSchema.parse(req.params);

    const notification = await markNotificationRead(id, req.user!.id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all of the authenticated user's notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private (authenticated user)
export const markAllRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const updated = await markAllNotificationsRead(req.user!.id);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: { markedAsRead: updated }
    });
  } catch (error) {
    next(error);
  }
};