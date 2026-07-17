'use strict';

/**
 * Sends a standardised success JSON response.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {*} data
 * @param {object} [meta]  - Optional pagination / extra metadata
 */
const sendSuccess = (res, statusCode, message, data = null, meta = null) => {
  const response = { success: true, message };

  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;

  return res.status(statusCode).json(response);
};

/**
 * Sends a standardised error JSON response.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {*} [errors]
 */
const sendError = (res, statusCode, message, errors = null) => {
  const response = { success: false, message };

  if (errors !== null) response.errors = errors;

  return res.status(statusCode).json(response);
};

module.exports = { sendSuccess, sendError };
