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
    date: {
      type: Date, // e.g. birth or adoption date
    },
    image: {
      type: String, // URL to pet photo
      default: null,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

petSchema.index({ owner: 1 }); // Fast lookup: all pets of a user

module.exports = mongoose.model('Pet', petSchema);