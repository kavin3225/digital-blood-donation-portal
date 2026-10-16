import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Zod schema validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Invalid input parameters',
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle known error status code or default to 500
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected server error occurred.';

  // Never leak stack traces to client in production
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.path} - ${statusCode}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    code: err.code || 'SERVER_ERROR',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
