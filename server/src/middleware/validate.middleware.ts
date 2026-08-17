import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedBody = await schema.parseAsync(req.body);
      req.body = parsedBody;
      next();
    } catch (error) {
      next(error);
    }
  };
};
