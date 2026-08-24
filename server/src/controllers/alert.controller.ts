import { Request, Response, NextFunction } from 'express';
import { alertIdParamSchema, alertQuerySchema } from '../validators/alert.validator.js';
import { studentIdParamSchema } from '../validators/student.validator.js';
import {
  listAlerts,
  getAlertById,
  resolveAlert
} from '../services/alert.service.js';
import StudentRepository from '../repositories/student.repository.js';

// @desc    List alerts (newest first) with optional filters and pagination
// @route   GET /api/alerts
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const getAllAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const parsedQuery = alertQuerySchema.parse(req.query);
    const { page, limit, status, priority, studentId } = parsedQuery;

    const { alerts, total } = await listAlerts({
      page,
      limit,
      status,
      priority,
      studentId
    });

    res.status(200).json({
      success: true,
      message: 'Alerts fetched successfully',
      data: { alerts },
      pagination: {
        page,
        limit,
        totalAlerts: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single alert by ID
// @route   GET /api/alerts/:id
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const getAlert = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = alertIdParamSchema.parse(req.params);

    const alert = await getAlertById(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Alert fetched successfully',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve (dismiss) an alert
// @route   PATCH /api/alerts/:id/resolve
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const resolveAlertById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = alertIdParamSchema.parse(req.params);

    const alert = await resolveAlert(id, (req as any).user?.id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Alert resolved successfully',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get alerts for a specific student (newest first)
// @route   GET /api/students/:id/alerts
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const getStudentAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id: studentId } = studentIdParamSchema.parse(req.params);
    const parsedQuery = alertQuerySchema.parse(req.query);
    const { page, limit, status, priority } = parsedQuery;

    const student = await StudentRepository.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const { alerts, total } = await listAlerts({
      page,
      limit,
      status,
      priority,
      studentId
    });

    res.status(200).json({
      success: true,
      message: 'Student alerts fetched successfully',
      data: { alerts },
      pagination: {
        page,
        limit,
        totalAlerts: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};