import { Router } from 'express';
import {
  getAllNotifications,
  getUnreadCount,
  markOneRead,
  markAllRead
} from '../controllers/notification.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Notifications are tied to the authenticated user (JWT protect). The same
// middleware that powers the rest of the API establishes the recipient, so the
// endpoints are genuinely user-scoped — not fake.
router.get(
  '/unread-count',
  protect,
  getUnreadCount
);

router.get(
  '/',
  protect,
  getAllNotifications
);

router.patch(
  '/read-all',
  protect,
  markAllRead
);

router.patch(
  '/:id/read',
  protect,
  markOneRead
);

export default router;