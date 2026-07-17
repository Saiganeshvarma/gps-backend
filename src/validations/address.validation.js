'use strict';

const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

// ─── Reusable coordinate rules ────────────────────────────────────────────────
const latitudeRule = body('latitude')
  .exists({ checkFalsy: false, checkNull: true })
  .withMessage('Latitude is required.')
  .isFloat({ min: -90, max: 90 })
  .withMessage('Latitude must be a number between -90 and 90.');

const longitudeRule = body('longitude')
  .exists({ checkFalsy: false, checkNull: true })
  .withMessage('Longitude is required.')
  .isFloat({ min: -180, max: 180 })
  .withMessage('Longitude must be a number between -180 and 180.');

// ─── Reusable MongoId param rule ──────────────────────────────────────────────
const mongoIdParam = (paramName = 'id') =>
  param(paramName)
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage(`Invalid ${paramName}. Must be a valid MongoDB ObjectId.`);

// ─── Validate current location / reverse geocode ─────────────────────────────
const validateCurrentLocation = [latitudeRule, longitudeRule];

// Same rules — reuse for the reverse-geocode endpoint
const validateReverseGeocode = [latitudeRule, longitudeRule];

// ─── Validate manual address creation ────────────────────────────────────────
const validateCreateAddress = [
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required.')
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters.'),

  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required.')
    .isLength({ max: 100 })
    .withMessage('State must not exceed 100 characters.'),

  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required.')
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters.'),

  body('pincode')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^[0-9]{4,10}$/)
    .withMessage('Pincode must be 4–10 digits.'),

  body('houseNo')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 })
    .withMessage('House number must not exceed 100 characters.'),

  body('landmark')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 200 })
    .withMessage('Landmark must not exceed 200 characters.'),

  body('label')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Home', 'Office', 'Other'])
    .withMessage('Label must be one of: Home, Office, Other.'),

  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean.'),

  latitudeRule,
  longitudeRule,
];

// ─── Validate address update (all fields optional) ────────────────────────────
const validateUpdateAddress = [
  mongoIdParam('id'),

  body('city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City cannot be empty.')
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters.'),

  body('state')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('State cannot be empty.')
    .isLength({ max: 100 })
    .withMessage('State must not exceed 100 characters.'),

  body('country')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Country cannot be empty.')
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters.'),

  body('pincode')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^[0-9]{4,10}$/)
    .withMessage('Pincode must be 4–10 digits.'),

  body('houseNo')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 })
    .withMessage('House number must not exceed 100 characters.'),

  body('landmark')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 200 })
    .withMessage('Landmark must not exceed 200 characters.'),

  body('label')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Home', 'Office', 'Other'])
    .withMessage('Label must be one of: Home, Office, Other.'),

  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean.'),

  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a number between -90 and 90.'),

  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a number between -180 and 180.'),
];

// ─── Validate addressId param ─────────────────────────────────────────────────
const validateAddressId = [mongoIdParam('id')];

// ─── Validate pagination + search query params ────────────────────────────────
const validateGetAllAddresses = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer.'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100.'),

  query('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City search term must not exceed 100 characters.'),

  query('pincode')
    .optional()
    .matches(/^[0-9]{4,10}$/)
    .withMessage('Pincode search term must be 4–10 digits.'),
];

module.exports = {
  validateCurrentLocation,
  validateReverseGeocode,
  validateCreateAddress,
  validateUpdateAddress,
  validateAddressId,
  validateGetAllAddresses,
};
