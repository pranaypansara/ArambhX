import { Request, Response, NextFunction } from 'express';
import {
  dashboardQuerySchema,
  recentActivityLimitSchema
} from '../validators/dashboard.validator.js';
import { studentIdParamSchema } from '../validators/student.validator.js';
import {
  getDashboardOverview,
  getAttentionStudents,
  getStudentDashboard,
  getStudentSafeDashboard
} from '../services/dashboard.service.js';
import { StudentNotFoundError } from '../services/prediction.service.js';

// @desc    Global / ADMIN dashboard overview (aggregated stored data)
// @route   GET /api/dashboard/overview
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const getOverview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const recentLimit = recentActivityLimitSchema.parse(req.query.limit);
    const data = await getDashboardOverview(recentLimit);

    res.status(200).json({
      success: true,
      message: 'Dashboard overview fetched successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Students currently requiring attention
// @route   GET /api/dashboard/attention-students
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const getAttentionStudentsList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const parsedQuery = dashboardQuerySchema.parse(req.query);
    const { limit } = parsedQuery;

    const data = await getAttentionStudents(limit);

    res.status(200).json({
      success: true,
      message: 'Attention students fetched successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Aggregated dashboard for a single student
// @route   GET /api/students/:id/dashboard
// @access  Private (ADMIN, FACULTY, COUNSELOR = internal view;
//                   STUDENT = safe, non-ML self view via ownership middleware)
export const getStudentDashboardData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id: studentId } = studentIdParamSchema.parse(req.params);

    // STUDENT callers get the sanitized self-view (no raw ML metrics/severity).
    const data =
      req.user?.role === 'STUDENT'
        ? await getStudentSafeDashboard(studentId)
        : await getStudentDashboard(studentId);

    res.status(200).json({
      success: true,
      message: 'Student dashboard fetched successfully',
      data
    });
  } catch (error) {
    if (error instanceof StudentNotFoundError) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    next(error);
  }
};