import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = Router();

// Audit trails are ADMIN-only. The existing RBAC middleware is reused — no new
// role system is built in Phase 12.
router.get(
  '/',
  protect,
  authorize('ADMIN'),
  getAuditLogs
);

export default router;