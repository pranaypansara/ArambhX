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

export default router;
