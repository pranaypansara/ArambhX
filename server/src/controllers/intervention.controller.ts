import { Request, Response, NextFunction } from 'express';
import {
  interventionIdParamSchema,
  interventionQuerySchema,
  updateInterventionStatusSchema
} from '../validators/intervention.validator.js';
import { studentIdParamSchema } from '../validators/student.validator.js';
import {
  generateInterventions,
  listStudentInterventions,
  getInterventionById,
  updateInterventionStatus,
  StudentNotFoundError,
  InterventionNotFoundError,
  InterventionStatusTransitionError
} from '../services/intervention.service.js';

// @desc    Generate intervention recommendations for a student using stored data
// @route   POST /api/students/:id/interventions/generate
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const generateStudentInterventions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id: studentId } = studentIdParamSchema.parse(req.params);

    const { created, open } = await generateInterventions(studentId);

    res.status(200).json({
      success: true,
      message: 'Intervention recommendations generated successfully',
      data: {
        studentId,
        created,
        openInterventions: open
      }
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

// @desc    List intervention recommendations for a student
// @route   GET /api/students/:id/interventions
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const getStudentInterventions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id: studentId } = studentIdParamSchema.parse(req.params);
    const parsedQuery = interventionQuerySchema.parse(req.query);
    const { page, limit, status } = parsedQuery;

    const { interventions, total } = await listStudentInterventions(
      studentId,
      page,
      limit,
      status
    );

    res.status(200).json({
      success: true,
      message: 'Student interventions fetched successfully',
      data: { interventions },
      pagination: {
        page,
        limit,
        totalInterventions: total,
        totalPages: Math.ceil(total / limit)
      }
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

// @desc    Get a single intervention by ID
// @route   GET /api/interventions/:id
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const getIntervention = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = interventionIdParamSchema.parse(req.params);

    const intervention = await getInterventionById(id);
    if (!intervention) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Intervention fetched successfully',
      data: intervention
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an intervention's status (validated lifecycle transition)
// @route   PATCH /api/interventions/:id/status
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const updateInterventionStatusById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = interventionIdParamSchema.parse(req.params);
    const { status } = updateInterventionStatusSchema.parse(req.body);

    const intervention = await updateInterventionStatus(id, status);

    res.status(200).json({
      success: true,
      message: 'Intervention status updated successfully',
      data: intervention
    });
  } catch (error) {
    if (error instanceof InterventionNotFoundError) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found'
      });
    }
    if (error instanceof InterventionStatusTransitionError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};