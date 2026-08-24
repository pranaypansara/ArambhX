import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/auth.types.js';

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    if (!(req as any).user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user authentication context missing'
      });
    }

    if (!roles.includes((req as any).user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${(req as any).user.role}' is not authorized to access this resource`
      });
    }

    next();
  };
};
