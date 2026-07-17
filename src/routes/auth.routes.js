'use strict';

const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { validateRegister, validateLogin } = require('../validations/auth.validation');
const { register, login, getMe } = require('../controllers/auth.controller');

// POST /api/auth/register
router.post('/register', validateRegister, validate, register);

// POST /api/auth/login
router.post('/login', validateLogin, validate, login);

// GET /api/auth/me  (protected)
router.get('/me', protect, getMe);

module.exports = router;
