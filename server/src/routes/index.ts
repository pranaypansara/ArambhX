import { Router } from 'express';
import authRouter from './auth.routes.js';
import studentRouter from './student.routes.js';
import mlRouter from './ml.routes.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = Router();

// Mount authentication sub-router under /auth
router.use('/auth', authRouter);

// Mount student sub-router under /students
router.use('/students', studentRouter);

// Mount ML service proxy routes under /ml
router.use('/ml', mlRouter);

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
      user: req.user
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
      user: req.user
    });
  }
);

export default router;
