import { Router } from 'express';
import {
  getAllAlerts,
  getAlert,
  resolveAlertById
} from '../controllers/alert.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = Router();

// All alert routes are private and visible to admin/faculty/counselor staff.
router.get(
  '/',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  getAllAlerts
);

router.get(
  '/:id',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  getAlert
);

router.patch(
  '/:id/resolve',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  resolveAlertById
);

export default router;