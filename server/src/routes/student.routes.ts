import { Router } from 'express';
import {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentSummary
} from '../controllers/student.controller.js';
import {
  createRecord as createAttendanceRecord,
  getHistory as getAttendanceHistory
} from '../controllers/attendance.controller.js';
import {
  createRecord as createAcademicRecord,
  getHistory as getAcademicHistory
} from '../controllers/academic.controller.js';
import { getMLFeatures } from '../controllers/mlFeature.controller.js';
import {
  predictStudentRisk,
  getStudentPredictions,
  getStudentLatestPrediction
} from '../controllers/prediction.controller.js';
import { analyzeStudent } from '../controllers/riskAnalysis.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createStudentSchema, updateStudentSchema } from '../validators/student.validator.js';
import { createAttendanceSchema } from '../validators/attendance.validator.js';
import { createAcademicRecordSchema } from '../validators/academic.validator.js';

const router = Router();

// Student CRUD Routes
router.post(
  '/',
  protect,
  authorize('ADMIN'),
  validate(createStudentSchema),
  createStudent
);

router.get(
  '/',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  getAllStudents
);

router.get(
  '/:id',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  getStudentById
);

router.patch(
  '/:id',
  protect,
  authorize('ADMIN'),
  validate(updateStudentSchema),
  updateStudent
);

router.delete(
  '/:id',
  protect,
  authorize('ADMIN'),
  deleteStudent
);

// Student Attendance Routes
router.post(
  '/:id/attendance',
  protect,
  authorize('ADMIN', 'FACULTY'),
  validate(createAttendanceSchema),
  createAttendanceRecord
);

router.get(
  '/:id/attendance',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  getAttendanceHistory
);

// Student Academic Records Routes
router.post(
  '/:id/academic-records',
  protect,
  authorize('ADMIN', 'FACULTY'),
  validate(createAcademicRecordSchema),
  createAcademicRecord
);

router.get(
  '/:id/academic-records',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  getAcademicHistory
);

// Student Summary Route
router.get(
  '/:id/summary',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  getStudentSummary
);

// Phase 3: ML1 feature builder (input preparation only, no model execution)
router.get(
  '/:id/ml-features',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  getMLFeatures
);

// Phase 6/7: run ML1 prediction via the FastAPI ML1 service and persist result
router.post(
  '/:id/predict',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  predictStudentRisk
);

// Phase 7: prediction history retrieval
router.get(
  '/:id/predictions',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  getStudentPredictions
);

router.get(
  '/:id/predictions/latest',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  getStudentLatestPrediction
);

// Phase 8: ML2 risk-intelligence analysis via the FastAPI ML2 service
router.post(
  '/:id/risk-analysis',
  protect,
  authorize('ADMIN', 'FACULTY', 'COUNSELOR'),
  analyzeStudent
);

export default router;
