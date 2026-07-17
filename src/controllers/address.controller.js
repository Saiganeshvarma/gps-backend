'use strict';

const Address = require('../models/Address.model');
const { reverseGeocode } = require('../services/googleMaps.service');
const { isWithinRadius } = require('../utils/geoUtils');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Build update payload from request body (only defined fields)
// ─────────────────────────────────────────────────────────────────────────────
const buildUpdatePayload = (body) => {
  const allowed = [
    'fullAddress',
    'houseNo',
    'landmark',
    'city',
    'state',
    'country',
    'pincode',
    'latitude',
    'longitude',
    'label',
    'isDefault',
  ];
  return allowed.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});
};

// ─────────────────────────────────────────────────────────────────────────────
// API 1: POST /api/address/current-location
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Reverse geocodes lat/lng via Google, then either:
 *  - Returns an existing address within 50m (duplicate prevention)
 *  - Updates the user's existing default address
 *  - Creates a new default address
 */
const saveCurrentLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  const userId = req.user.id;

  // Step 1: Bonus — check if a nearby address already exists (within 50m)
  const allUserAddresses = await Address.find({ user: userId });

  const nearby = allUserAddresses.find((addr) =>
    isWithinRadius(latitude, longitude, addr.latitude, addr.longitude, 50)
  );

  if (nearby) {
    // If the nearby one isn't already default, make it default
    if (!nearby.isDefault) {
      await Address.clearDefaultForUser(userId, nearby._id);
      nearby.isDefault = true;
      // Skip pre-save hook since we already cleared above
      await Address.findByIdAndUpdate(nearby._id, { isDefault: true });
    }

    return sendSuccess(res, 200, 'Address already exists nearby. Returning existing address.', {
      _id: nearby._id,
      fullAddress: nearby.fullAddress,
      city: nearby.city,
      state: nearby.state,
      country: nearby.country,
      pincode: nearby.pincode,
      latitude: nearby.latitude,
      longitude: nearby.longitude,
      isDefault: true,
    });
  }

  // Step 2: Call Google Reverse Geocoding API
  const geocoded = await reverseGeocode(latitude, longitude);

  // Step 3: Check if user already has a default address → update it
  const existingDefault = await Address.findOne({ user: userId, isDefault: true });

  if (existingDefault) {
    existingDefault.fullAddress = geocoded.formattedAddress;
    existingDefault.city = geocoded.city || existingDefault.city;
    existingDefault.state = geocoded.state || existingDefault.state;
    existingDefault.country = geocoded.country || existingDefault.country;
    existingDefault.pincode = geocoded.postalCode || existingDefault.pincode;
    existingDefault.latitude = latitude;
    existingDefault.longitude = longitude;
    existingDefault.isDefault = true;

    await existingDefault.save();

    return sendSuccess(res, 200, 'Current location updated successfully.', {
      _id: existingDefault._id,
      fullAddress: existingDefault.fullAddress,
      city: existingDefault.city,
      state: existingDefault.state,
      country: existingDefault.country,
      pincode: existingDefault.pincode,
      latitude: existingDefault.latitude,
      longitude: existingDefault.longitude,
      isDefault: existingDefault.isDefault,
    });
  }

  // Step 4: No default exists → create a new address
  // Clear any stale default flags (safety net)
  await Address.updateMany({ user: userId }, { $set: { isDefault: false } });

  const newAddress = await Address.create({
    user: userId,
    fullAddress: geocoded.formattedAddress,
    city: geocoded.city,
    state: geocoded.state,
    country: geocoded.country,
    pincode: geocoded.postalCode,
    latitude,
    longitude,
    label: 'Home',
    isDefault: true,
  });

  return sendSuccess(res, 201, 'Current location saved successfully.', {
    _id: newAddress._id,
    fullAddress: newAddress.fullAddress,
    city: newAddress.city,
    state: newAddress.state,
    country: newAddress.country,
    pincode: newAddress.pincode,
    latitude: newAddress.latitude,
    longitude: newAddress.longitude,
    isDefault: newAddress.isDefault,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// API 2: GET /api/address/default
// ─────────────────────────────────────────────────────────────────────────────
const getDefaultAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ user: req.user.id, isDefault: true });

  if (!address) {
    throw new AppError('No default address found.', 404, 'DEFAULT_ADDRESS_NOT_FOUND');
  }

  return sendSuccess(res, 200, 'Default address fetched successfully.', address);
});

// ─────────────────────────────────────────────────────────────────────────────
// API 3: GET /api/address?page=1&limit=10&city=...&pincode=...
// ─────────────────────────────────────────────────────────────────────────────
const getAllAddresses = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Pagination
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
  const skip = (page - 1) * limit;

  // Build filter
  const filter = { user: userId };

  if (req.query.city) {
    filter.city = { $regex: req.query.city.trim(), $options: 'i' };
  }

  if (req.query.pincode) {
    filter.pincode = req.query.pincode.trim();
  }

  const [addresses, total] = await Promise.all([
    Address.find(filter)
      .sort({ isDefault: -1, createdAt: -1 }) // default first
      .skip(skip)
      .limit(limit)
      .lean(),
    Address.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, 'Addresses fetched successfully.', addresses, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// API 4: POST /api/address  (manual creation)
// ─────────────────────────────────────────────────────────────────────────────
const createAddress = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { houseNo, landmark, city, state, country, pincode, latitude, longitude, label, isDefault } =
    req.body;

  // Bonus: Prevent exact duplicate (same lat/lng within 50m with same label)
  const allAddresses = await Address.find({ user: userId });
  const duplicate = allAddresses.find((addr) =>
    isWithinRadius(latitude, longitude, addr.latitude, addr.longitude, 50)
  );

  if (duplicate) {
    throw new AppError(
      'An address already exists within 50 meters of this location.',
      409,
      'DUPLICATE_ADDRESS'
    );
  }

  // If this address will be default, clear others first
  const shouldBeDefault = isDefault === true || isDefault === 'true';

  if (shouldBeDefault) {
    await Address.updateMany({ user: userId }, { $set: { isDefault: false } });
  }

  const address = await Address.create({
    user: userId,
    houseNo: houseNo || '',
    landmark: landmark || '',
    city,
    state,
    country,
    pincode: pincode || '',
    latitude,
    longitude,
    label: label || 'Home',
    isDefault: shouldBeDefault,
  });

  return sendSuccess(res, 201, 'Address created successfully.', address);
});

// ─────────────────────────────────────────────────────────────────────────────
// API 5: PUT /api/address/:id
// ─────────────────────────────────────────────────────────────────────────────
const updateAddress = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const address = await Address.findOne({ _id: id, user: userId });

  if (!address) {
    throw new AppError('Address not found.', 404, 'ADDRESS_NOT_FOUND');
  }

  const payload = buildUpdatePayload(req.body);

  // If setting this address as default, clear others first
  if (payload.isDefault === true) {
    await Address.clearDefaultForUser(userId, id);
  }

  Object.assign(address, payload);
  await address.save();

  return sendSuccess(res, 200, 'Address updated successfully.', address);
});

// ─────────────────────────────────────────────────────────────────────────────
// API 6: DELETE /api/address/:id
// ─────────────────────────────────────────────────────────────────────────────
const deleteAddress = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const address = await Address.findOneAndDelete({ _id: id, user: userId });

  if (!address) {
    throw new AppError('Address not found.', 404, 'ADDRESS_NOT_FOUND');
  }

  // If the deleted address was default, promote the most recent one
  if (address.isDefault) {
    const next = await Address.findOne({ user: userId }).sort({ createdAt: -1 });
    if (next) {
      next.isDefault = true;
      await Address.findByIdAndUpdate(next._id, { isDefault: true });
    }
  }

  return sendSuccess(res, 200, 'Address deleted successfully.', null);
});

// ─────────────────────────────────────────────────────────────────────────────
// API 7: PATCH /api/address/default/:id
// ─────────────────────────────────────────────────────────────────────────────
const setDefaultAddress = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const address = await Address.findOne({ _id: id, user: userId });

  if (!address) {
    throw new AppError('Address not found.', 404, 'ADDRESS_NOT_FOUND');
  }

  if (address.isDefault) {
    return sendSuccess(res, 200, 'Address is already the default.', address);
  }

  // Clear default from all addresses, set this one
  await Address.clearDefaultForUser(userId, id);
  address.isDefault = true;
  // Use direct update to skip the pre-save hook (already cleared above)
  await Address.findByIdAndUpdate(id, { isDefault: true });
  address.isDefault = true; // reflect in response

  return sendSuccess(res, 200, 'Default address updated successfully.', address);
});

// ─────────────────────────────────────────────────────────────────────────────
// API 8: POST /api/address/reverse-geocode
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Accepts lat/lng and returns the human-readable address from Google Maps
 * WITHOUT saving anything to the database. Useful for showing a preview
 * before the user confirms and saves their location.
 */
const reverseGeocodeAddress = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;

  const geocoded = await reverseGeocode(latitude, longitude);

  return sendSuccess(res, 200, 'Address fetched successfully.', {
    fullAddress: geocoded.formattedAddress,
    city: geocoded.city,
    state: geocoded.state,
    country: geocoded.country,
    pincode: geocoded.postalCode,
    latitude,
    longitude,
  });
});

module.exports = {
  saveCurrentLocation,
  getDefaultAddress,
  getAllAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  reverseGeocodeAddress,
};
