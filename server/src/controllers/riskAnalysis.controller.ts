import { Request, Response, NextFunction } from 'express';
import { studentIdParamSchema } from '../validators/student.validator.js';
import { analyzeStudentRisk } from '../services/riskAnalysis.service.js';
import { StudentNotFoundError } from '../services/prediction.service.js';
import {
  MLServiceUnavailableError,
  MLInvalidResponseError
} from '../services/mlPredictionClient.service.js';

// @desc    Run ML2 risk-intelligence analysis (trend, alert, interventions)
// @route   POST /api/students/:id/risk-analysis
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const analyzeStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = studentIdParamSchema.parse(req.params);

    const analysis = await analyzeStudentRisk(id, (req as any).user?.id);

    res.status(200).json({
      success: true,
      message: 'Risk analysis completed successfully',
      data: analysis
    });
  } catch (error) {
    if (error instanceof StudentNotFoundError) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    if (error instanceof MLServiceUnavailableError) {
      return res.status(error.statusCode).json({
        success: false,
        message: 'ML service is unavailable or timed out. Please try again later.'
      });
    }
    if (error instanceof MLInvalidResponseError) {
      return res.status(error.statusCode).json({
        success: false,
        message: 'ML service returned an invalid response.'
      });
    }
    next(error);
  }
};