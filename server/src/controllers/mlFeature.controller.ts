import { Request, Response, NextFunction } from 'express';
import { buildMLFeatures } from '../services/mlFeatureBuilder.service.js';
import { studentIdParamSchema } from '../validators/student.validator.js';

// @desc    Build ML1-compatible input features for a student
// @route   GET /api/students/:id/ml-features
// @access  Private (ADMIN, FACULTY, COUNSELOR)
// @note    Phase 3 only — prepares the exact ML1 feature payload.
//          Does NOT run the ML model / pipeline.
export const getMLFeatures = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = studentIdParamSchema.parse(req.params);

    const features = await buildMLFeatures(id);
    if (!features) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'ML1 features built successfully',
      data: {
        features
      }
    });
  } catch (error) {
    next(error);
  }
};