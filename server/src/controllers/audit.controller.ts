import { Request, Response, NextFunction } from 'express';
import { auditLogQuerySchema } from '../validators/audit.validator.js';
import { listAuditLogs } from '../services/audit.service.js';

// @desc    List audit logs (newest first) with optional filters and pagination
// @route   GET /api/audit-logs
// @access  Private (ADMIN only — audit trails are admin-scoped)
export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const parsedQuery = auditLogQuerySchema.parse(req.query);
    const { page, limit, action, entityType, entityId } = parsedQuery;

    const { auditLogs, total } = await listAuditLogs({
      page,
      limit,
      action,
      entityType,
      entityId
    });

    res.status(200).json({
      success: true,
      message: 'Audit logs fetched successfully',
      data: { auditLogs },
      pagination: {
        page,
        limit,
        totalAuditLogs: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};