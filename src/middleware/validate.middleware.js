'use strict';

const { validationResult } = require('express-validator');

/**
 * Middleware that reads express-validator results and returns
 * a 400 response if any validation errors exist.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({
        field: e.path || e.param,
        message: e.msg,
      })),
    });
  }

  next();
};

module.exports = validate;
