import { Request, Response, NextFunction } from 'express';
import {
  mlPredictionClient,
  MLServiceUnavailableError,
  MLInvalidResponseError
} from '../services/mlPredictionClient.service.js';

// @desc    Proxy the FastAPI ML service health check
// @route   GET /api/ml/health
// @access  Public (read-only, non-sensitive status only)
export const getMLHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const health = await mlPredictionClient.health();

    res.status(200).json({
      success: true,
      message: 'ML service health check completed',
      data: health
    });
  } catch (error) {
    if (error instanceof MLServiceUnavailableError) {
      return res.status(error.statusCode).json({
        success: false,
        message: 'ML service is unavailable or timed out.'
      });
    }
    if (error instanceof MLInvalidResponseError) {
      return res.status(error.statusCode).json({
        success: false,
        message: 'ML service responded with an unexpected shape.'
      });
    }
    next(error);
  }
};