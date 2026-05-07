// src/models/Pet.js
const mongoose = require('mongoose');

const petSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    name: {
      type: String,
      required: [true, 'Pet name is required'],
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    breed: {
      type: String,
      trim: true,
    },
    location: {
      governorate: {
        type: String,
        trim: true,
        default: "",
      },
      // Legacy field kept for backward compatibility with older records/clients.
      city: {
        type: String,
        trim: true,
        default: "",
      },
      country: {
        type: String,
        trim: true,
        default: "",
      },
    },
    date: {
      type: Date, // e.g. birth or adoption date
    },
    image: {
      type: String, // URL to pet photo
      default: null,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length <= 5,
        message: "Pet supports up to 5 images",
      },
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

petSchema.index({ owner: 1 }); // Fast lookup: all pets of a user
petSchema.index({ "location.country": 1, "location.governorate": 1 });

module.exports = mongoose.model('Pet', petSchema);

