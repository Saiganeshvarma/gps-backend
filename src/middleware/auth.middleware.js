'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Protects routes by verifying the JWT Bearer token.
 * Attaches the authenticated user to req.user.
 */
const protect = asyncHandler(async (req, _res, next) => {
  // 1. Extract token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AppError('Access denied. No token provided. Please log in.', 401, 'NO_TOKEN')
    );
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(
      new AppError('Access denied. Malformed token. Please log in.', 401, 'MALFORMED_TOKEN')
    );
  }

  // 2. Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(
        new AppError('Your session has expired. Please log in again.', 401, 'TOKEN_EXPIRED')
      );
    }
    return next(
      new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN')
    );
  }

  // 3. Check user still exists
  const user = await User.findById(decoded.id).select('-password');

  if (!user) {
    return next(
      new AppError('The user associated with this token no longer exists.', 401, 'USER_NOT_FOUND')
    );
  }

  // 4. Attach user to request
  req.user = user;
  next();
});

module.exports = { protect };
