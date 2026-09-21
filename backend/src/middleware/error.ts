import { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

export const notFound: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation failed',
      errors: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
    return;
  }
  if (err instanceof ApiError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      message: 'Validation failed',
      errors: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    });
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: `Invalid value for ${err.path}` });
    return;
  }
  if ((err as { code?: number }).code === 11000) {
    res.status(409).json({ message: 'A record with the same unique value already exists' });
    return;
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
};
