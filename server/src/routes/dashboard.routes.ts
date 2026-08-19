import { Router } from 'express';
import {
  getOverview,
  getAttentionStudentsList
} from '../controllers/dashboard.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = Router();

// Dashboard routes are private and visible to admin/faculty/counselor staff.
// They are structured for future role-based filtering without claiming RBAC
// beyond the existing protect + authorize middleware.
router.get(
  '/overview',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  getOverview
);

router.get(
  '/attention-students',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  getAttentionStudentsList
);

export default router;