'use strict';

const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// ─── Handler: Mongoose CastError (invalid ObjectId) ──────────────────────────
const handleCastError = (err) =>
  new AppError(`Invalid ${err.path}: "${err.value}".`, 400, 'INVALID_ID');

// ─── Handler: Mongoose Duplicate Key ─────────────────────────────────────────
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue ? err.keyValue[field] : '';
  return new AppError(
    `Duplicate value for "${field}": "${value}". Please use another value.`,
    409,
    'DUPLICATE_KEY'
  );
};

// ─── Handler: Mongoose ValidationError ───────────────────────────────────────
const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(`Validation failed: ${messages.join('. ')}`, 400, 'VALIDATION_ERROR');
};

// ─── Handler: JWT errors ──────────────────────────────────────────────────────
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');

const handleJWTExpiredError = () =>
  new AppError('Your session has expired. Please log in again.', 401, 'TOKEN_EXPIRED');

// ─── Dev vs Prod response ─────────────────────────────────────────────────────
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    code: err.code,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational / trusted errors: send to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code || undefined,
    });
  }

  // Programming or unknown errors: hide details
  logger.error('UNEXPECTED ERROR:', err);

  return res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again later.',
  });
};

// ─── 404 Not Found ────────────────────────────────────────────────────────────
const notFound = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
};

// ─── Global Error Handler ─────────────────────────────────────────────────────
const globalErrorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    logger.error(`[${req.method}] ${req.originalUrl}`, err);
    return sendErrorDev(err, res);
  }

  // Production: map known Mongoose/JWT errors to AppErrors
  let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
  error.message = err.message;

  if (err instanceof mongoose.Error.CastError) error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateKeyError(err);
  if (err instanceof mongoose.Error.ValidationError) error = handleValidationError(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  return sendErrorProd(error, res);
};

module.exports = { notFound, globalErrorHandler };
