'use strict';

const mongoose = require('mongoose');

const ADDRESS_LABELS = ['Home', 'Office', 'Other'];

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
      index: true,
    },

    fullAddress: {
      type: String,
      trim: true,
      default: '',
    },

    houseNo: {
      type: String,
      trim: true,
      maxlength: [100, 'House number must not exceed 100 characters.'],
      default: '',
    },

    landmark: {
      type: String,
      trim: true,
      maxlength: [200, 'Landmark must not exceed 200 characters.'],
      default: '',
    },

    city: {
      type: String,
      trim: true,
      required: [true, 'City is required.'],
      maxlength: [100, 'City name must not exceed 100 characters.'],
      index: true,
    },

    state: {
      type: String,
      trim: true,
      required: [true, 'State is required.'],
      maxlength: [100, 'State name must not exceed 100 characters.'],
    },

    country: {
      type: String,
      trim: true,
      required: [true, 'Country is required.'],
      maxlength: [100, 'Country name must not exceed 100 characters.'],
    },

    pincode: {
      type: String,
      trim: true,
      index: true,
      validate: {
        validator: (v) => !v || /^[0-9]{4,10}$/.test(v),
        message: 'Pincode must be 4–10 digits.',
      },
      default: '',
    },

    latitude: {
      type: Number,
      required: [true, 'Latitude is required.'],
      min: [-90, 'Latitude must be between -90 and 90.'],
      max: [90, 'Latitude must be between -90 and 90.'],
    },

    longitude: {
      type: Number,
      required: [true, 'Longitude is required.'],
      min: [-180, 'Longitude must be between -180 and 180.'],
      max: [180, 'Longitude must be between -180 and 180.'],
    },

    label: {
      type: String,
      enum: {
        values: ADDRESS_LABELS,
        message: `Label must be one of: ${ADDRESS_LABELS.join(', ')}.`,
      },
      default: 'Home',
    },

    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Compound Indexes ─────────────────────────────────────────────────────────
// Ensures only ONE default address per user at the DB level.
addressSchema.index({ user: 1, isDefault: 1 });
// Fast lookup for searching by city/pincode per user.
addressSchema.index({ user: 1, city: 1 });
addressSchema.index({ user: 1, pincode: 1 });

// ─── Static Methods ───────────────────────────────────────────────────────────

/**
 * Clears isDefault from ALL addresses of a given user except the provided addressId.
 *
 * @param {string} userId
 * @param {string} exceptAddressId
 */
addressSchema.statics.clearDefaultForUser = async function (userId, exceptAddressId) {
  await this.updateMany(
    { user: userId, _id: { $ne: exceptAddressId } },
    { $set: { isDefault: false } }
  );
};

// ─── Pre-save Hook ────────────────────────────────────────────────────────────
/**
 * Before saving, if this address is marked as default,
 * ensure all other addresses for this user are unset.
 */
addressSchema.pre('save', async function (next) {
  if (this.isModified('isDefault') && this.isDefault) {
    await this.constructor.clearDefaultForUser(this.user, this._id);
  }
  next();
});

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;
