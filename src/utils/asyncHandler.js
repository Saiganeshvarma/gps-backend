'use strict';

/**
 * Wraps an async route handler and forwards errors to Express's next().
 * Eliminates the need for try/catch in every controller.
 *
 * @param {Function} fn - Async express route handler
 * @returns {Function}  - Express middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
