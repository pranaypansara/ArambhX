import { Request, Response, NextFunction } from 'express';

/**
 * Student self-service ownership guard (Phase 13).
 *
 * Applies to routes under `/api/students/:id/...` that STUDENT accounts are
 * allowed to reach. Non-STUDENT roles (ADMIN/FACULTY/COUNSELOR) pass through
 * unchanged; a STUDENT is allowed ONLY when `:id` equals their own linked
 * student_id — the URL parameter is never trusted as an ownership value.
 */
export const studentSelfOnly = (req: Request, res: Response, next: NextFunction): any => {
  if (!(req as any).user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, user authentication context missing'
    });
  }

  if ((req as any).user.role !== 'STUDENT') {
    return next();
  }

  const pathStudentId = Number(req.params.id);
  if (!Number.isInteger(pathStudentId) || pathStudentId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid student ID (must be a positive integer)'
    });
  }

  if ((req as any).user.studentId == null || (req as any).user.studentId !== pathStudentId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Students may only access their own records'
    });
  }

  return next();
};