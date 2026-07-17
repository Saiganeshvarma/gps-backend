'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Generates a signed JWT for the given user id.
 * @param {string} id
 * @returns {string}
 */
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email is already registered.', 409, 'EMAIL_ALREADY_EXISTS');
  }

  const user = await User.create({ name, email, password, phone });

  const token = signToken(user._id);

  return sendSuccess(res, 201, 'Registration successful.', {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const token = signToken(user._id);

  return sendSuccess(res, 200, 'Login successful.', {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, 200, 'User profile fetched.', req.user);
});

module.exports = { register, login, getMe };
