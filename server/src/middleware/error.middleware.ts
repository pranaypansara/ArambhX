import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): any => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';
  let errors: any = null;

  // 1. Zod validation errors
  if (err instanceof ZodError || err.type === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.errors || err.message;
  }

  // 2. PostgreSQL unique constraint violation error (code 23505 in pg)
  if (err.code === '23505') {
    statusCode = 400;
    // Inspect constraint message or return standard duplicate error
    message = 'A record with this email already exists';
  }

  // 3. JWT validation errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please authenticate again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired. Please login again.';
  }

  // Log server errors internally (exclude validation and duplicate key user errors)
  if (statusCode === 500) {
    console.error('[Global Error Handler] Internal Server Error:', err);
    if (process.env.NODE_ENV === 'production') {
      message = 'An unexpected server error occurred. Please contact support.';
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
