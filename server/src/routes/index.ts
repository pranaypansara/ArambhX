import { Router } from 'express';
import authRouter from './auth.routes.js';
import studentRouter from './student.routes.js';
import mlRouter from './ml.routes.js';
import alertRouter from './alert.routes.js';
import interventionRouter from './intervention.routes.js';
import dashboardRouter from './dashboard.routes.js';
import notificationRouter from './notification.routes.js';
import auditRouter from './audit.routes.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = Router();

// Mount authentication sub-router under /auth
router.use('/auth', authRouter);

// Mount student sub-router under /students
router.use('/students', studentRouter);

// Mount ML service proxy routes under /ml
router.use('/ml', mlRouter);

// Mount alert routes under /alerts (Phase 9)
router.use('/alerts', alertRouter);

// Mount intervention routes under /interventions (Phase 10)
router.use('/interventions', interventionRouter);

// Mount dashboard aggregation routes under /dashboard (Phase 11)
router.use('/dashboard', dashboardRouter);

// Mount notification routes under /notifications (Phase 12)
router.use('/notifications', notificationRouter);

// Mount audit log routes under /audit-logs (Phase 12)
router.use('/audit-logs', auditRouter);

// Role-Based Access Control (RBAC) testing route
// Accessible only to authenticated ADMINs
router.get(
  '/admin-only',
  protect,
  authorize('ADMIN'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Access granted. Welcome to the ADMIN dashboard!',
      user: (req as any).user
    });
  }
);

// Another RBAC testing route for FACULTY & COUNSELOR
router.get(
  '/staff-only',
  protect,
  authorize('FACULTY', 'COUNSELOR'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Access granted. Welcome, staff member!',
      user: (req as any).user
    });
  }
);

export default router;
