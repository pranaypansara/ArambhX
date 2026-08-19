import { Request, Response, NextFunction } from 'express';
import { studentIdParamSchema } from '../validators/student.validator.js';
import { predictStudent, StudentNotFoundError } from '../services/prediction.service.js';
import {
  MLServiceUnavailableError,
  MLInvalidResponseError
} from '../services/mlPredictionClient.service.js';

// @desc    Run ML1 dropout prediction for a student via the FastAPI ML service
// @route   POST /api/students/:id/predict
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const predictStudentRisk = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = studentIdParamSchema.parse(req.params);

    const result = await predictStudent(id);

    res.status(200).json({
      success: true,
      message: 'Prediction completed successfully',
      data: {
        studentId: result.studentId,
        prediction: result.prediction.prediction,
        prediction_label: result.prediction.prediction_label,
        risk_probability: result.prediction.risk_probability,
        threshold: result.prediction.threshold,
        risk_level: result.prediction.risk_level,
        model: result.prediction.model
      }
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