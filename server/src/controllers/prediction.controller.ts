import { Request, Response, NextFunction } from 'express';
import { studentIdParamSchema, paginationQuerySchema } from '../validators/student.validator.js';
import {
  predictStudent,
  StudentNotFoundError,
  getPredictionHistory,
  getLatestPrediction
} from '../services/prediction.service.js';
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

    const result = await predictStudent(id, (req as any).user?.id);

    res.status(200).json({
      success: true,
      message: 'Prediction completed and stored successfully',
      data: {
        predictionId: result.stored.id,
        studentId: result.studentId,
        prediction: result.prediction.prediction,
        prediction_label: result.prediction.prediction_label,
        risk_probability: result.prediction.risk_probability,
        threshold: result.prediction.threshold,
        risk_level: result.prediction.risk_level,
        model: result.prediction.model,
        createdAt: result.stored.predictedAt
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

// @desc    Get prediction history for a student
// @route   GET /api/students/:id/predictions
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const getStudentPredictions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = studentIdParamSchema.parse(req.params);
    const { limit } = paginationQuerySchema.parse(req.query);

    const history = await getPredictionHistory(id, limit);

    res.status(200).json({
      success: true,
      message: 'Prediction history retrieved successfully',
      data: {
        studentId: id,
        predictions: history
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

// @desc    Get the latest prediction for a student
// @route   GET /api/students/:id/predictions/latest
// @access  Private (ADMIN, FACULTY, COUNSELOR)
export const getStudentLatestPrediction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = studentIdParamSchema.parse(req.params);

    const latest = await getLatestPrediction(id);

    if (!latest) {
      return res.status(404).json({
        success: false,
        message: 'No prediction history found for this student'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Latest prediction retrieved successfully',
      data: latest
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