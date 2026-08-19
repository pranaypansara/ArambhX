import { Router } from 'express';
import {
  getIntervention,
  updateInterventionStatusById
} from '../controllers/intervention.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = Router();

// All intervention routes are private and visible to admin/faculty/counselor staff.
router.get(
  '/:id',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  getIntervention
);

router.patch(
  '/:id/status',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  updateInterventionStatusById
);

export default router;