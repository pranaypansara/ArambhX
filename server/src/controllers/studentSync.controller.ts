import { Request, Response, NextFunction } from 'express';
import { buildPreview, commitSync } from '../services/studentSync.service.js';

export const previewSync = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Expected field: file' });
    }
    const allowed = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/csv', 'text/plain'];
    const ext = file.originalname.toLowerCase().split('.').pop() || '';
    if (!['csv', 'xls', 'xlsx'].includes(ext)) {
      return res.status(400).json({ success: false, message: 'Unsupported file type. Only CSV, XLS, XLSX are allowed.' });
    }
    const preview = await buildPreview(file.buffer, file.originalname);
    return res.status(200).json({ success: true, message: 'Preview generated', data: preview });
  } catch (error) {
    next(error);
  }
};

export const commitSyncHandler = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Expected field: file' });
    }
    const ext = file.originalname.toLowerCase().split('.').pop() || '';
    if (!['csv', 'xls', 'xlsx'].includes(ext)) {
      return res.status(400).json({ success: false, message: 'Unsupported file type. Only CSV, XLS, XLSX are allowed.' });
    }
    const result = await commitSync(file.buffer, file.originalname);
    if (!result.committed) {
      return res.status(400).json({ success: false, message: 'Import has validation errors and was not committed.', data: result });
    }
    return res.status(200).json({ success: true, message: 'Import committed successfully', data: result });
  } catch (error) {
    next(error);
  }
};
