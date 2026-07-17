'use strict';

const axios = require('axios');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const GEOCODE_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Extracts a specific address component type from Google's address_components array.
 *
 * @param {Array} components - address_components from Google Geocode API
 * @param {string} type      - Component type (e.g., 'locality', 'country')
 * @returns {string}
 */
const extractComponent = (components, type) => {
  const component = components.find((c) => c.types.includes(type));
  return component ? component.long_name : '';
};

/**
 * Extracts short name for a component (used for country code, state code, etc.)
 *
 * @param {Array} components
 * @param {string} type
 * @returns {string}
 */
const extractShortComponent = (components, type) => {
  const component = components.find((c) => c.types.includes(type));
  return component ? component.short_name : '';
};

/**
 * Calls the Google Reverse Geocoding API and returns structured address data.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{
 *   formattedAddress: string,
 *   city: string,
 *   state: string,
 *   country: string,
 *   postalCode: string
 * }>}
 * @throws {AppError} on API failure or no results
 */
const reverseGeocode = async (latitude, longitude) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    logger.error('GOOGLE_MAPS_API_KEY is not set in environment variables.');
    throw new AppError(
      'Google Maps service is not configured. Please contact support.',
      500,
      'GOOGLE_API_NOT_CONFIGURED'
    );
  }

  let response;

  try {
    response = await axios.get(GEOCODE_BASE_URL, {
      params: {
        latlng: `${latitude},${longitude}`,
        key: apiKey,
        result_type: 'street_address|sublocality|locality',
        language: 'en',
      },
      timeout: 8000, // 8 second timeout
    });
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      logger.error('Google Maps API request timed out.');
      throw new AppError(
        'Google Maps API request timed out. Please try again.',
        503,
        'GOOGLE_API_TIMEOUT'
      );
    }

    logger.error('Google Maps API network error:', err.message);
    throw new AppError(
      'Failed to connect to Google Maps service. Please try again.',
      503,
      'GOOGLE_API_NETWORK_ERROR'
    );
  }

  const { data } = response;

  // Handle Google API-level errors
  if (data.status === 'REQUEST_DENIED') {
    logger.error('Google Maps API request denied. Check your API key and billing.');
    throw new AppError(
      'Google Maps API access denied. Please contact support.',
      503,
      'GOOGLE_API_DENIED'
    );
  }

  if (data.status === 'OVER_DAILY_LIMIT' || data.status === 'OVER_QUERY_LIMIT') {
    logger.error(`Google Maps API quota exceeded: ${data.status}`);
    throw new AppError(
      'Location service is temporarily unavailable due to quota limits. Please try again later.',
      503,
      'GOOGLE_API_QUOTA_EXCEEDED'
    );
  }

  if (data.status === 'ZERO_RESULTS' || !data.results || data.results.length === 0) {
    throw new AppError(
      'No address found for the provided coordinates.',
      404,
      'GEOCODE_NO_RESULTS'
    );
  }

  if (data.status !== 'OK') {
    logger.error(`Unexpected Google Maps API status: ${data.status}`);
    throw new AppError(
      'Failed to retrieve address from Google Maps. Please try again.',
      502,
      'GOOGLE_API_UNEXPECTED_STATUS'
    );
  }

  // Use the most detailed result (first result)
  const result = data.results[0];
  const components = result.address_components;

  // City: try locality → sublocality_level_1 → administrative_area_level_2
  const city =
    extractComponent(components, 'locality') ||
    extractComponent(components, 'sublocality_level_1') ||
    extractComponent(components, 'administrative_area_level_2') ||
    '';

  const state = extractComponent(components, 'administrative_area_level_1');
  const country = extractComponent(components, 'country');
  const postalCode = extractComponent(components, 'postal_code');
  const formattedAddress = result.formatted_address || '';

  logger.debug(`Reverse geocode success for [${latitude}, ${longitude}]: ${formattedAddress}`);

  return {
    formattedAddress,
    city,
    state,
    country,
    postalCode,
  };
};

module.exports = { reverseGeocode };
