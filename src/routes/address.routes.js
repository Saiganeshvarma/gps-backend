'use strict';

const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  validateCurrentLocation,
  validateReverseGeocode,
  validateCreateAddress,
  validateUpdateAddress,
  validateAddressId,
  validateGetAllAddresses,
} = require('../validations/address.validation');
const {
  saveCurrentLocation,
  getDefaultAddress,
  getAllAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  reverseGeocodeAddress,
} = require('../controllers/address.controller');

// All address routes require authentication
router.use(protect);

// ─── Specific routes (must come before :id routes) ────────────────────────────

// API 1: Save current GPS location
router.post('/current-location', validateCurrentLocation, validate, saveCurrentLocation);

// API 8: Reverse geocode (preview only – does NOT save)
router.post('/reverse-geocode', validateReverseGeocode, validate, reverseGeocodeAddress);

// API 2: Get default address
router.get('/default', getDefaultAddress);

// API 7: Set an address as default
router.patch('/default/:id', validateAddressId, validate, setDefaultAddress);

// ─── CRUD routes ──────────────────────────────────────────────────────────────

// API 3: Get all addresses (with pagination + search)
// API 4: Create address manually
router
  .route('/')
  .get(validateGetAllAddresses, validate, getAllAddresses)
  .post(validateCreateAddress, validate, createAddress);

// API 5: Update address
// API 6: Delete address
router
  .route('/:id')
  .put(validateUpdateAddress, validate, updateAddress)
  .delete(validateAddressId, validate, deleteAddress);

module.exports = router;
