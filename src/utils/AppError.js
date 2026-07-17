'use strict';

/**
 * Custom operational error class.
 * Distinguishes between programmer errors (bugs) and operational errors
 * (expected runtime failures like validation errors, not found, etc.)
 */
class AppError extends Error {
  /**
   * @param {string} message  - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [code]   - Optional machine-readable error code
   */
  constructor(message, statusCode, code = null) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
