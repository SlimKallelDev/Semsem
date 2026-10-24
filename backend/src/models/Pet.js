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
    country: {
      type: String,
      trim: true,
      required: [true, 'Country is required'],
    },
    governorate: {
      type: String,
      trim: true,
      required: [true, 'Governorate is required'],
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
    careRecord: {
      identityProfile: {
        petName: { type: String, trim: true, default: "" },
        photo: { type: String, trim: true, default: "" },
        species: { type: String, trim: true, default: "" },
        breed: { type: String, trim: true, default: "" },
        gender: { type: String, trim: true, default: "" },
        birthDateOrAge: { type: String, trim: true, default: "" },
        weight: { type: String, trim: true, default: "" },
        colorMarkings: { type: String, trim: true, default: "" },
        microchipId: { type: String, trim: true, default: "" },
        passportNumber: { type: String, trim: true, default: "" },
        sterilized: { type: Boolean, default: false },
        adoptionDate: { type: String, trim: true, default: "" },
        ownerInfo: {
          name: { type: String, trim: true, default: "" },
          phone: { type: String, trim: true, default: "" },
          email: { type: String, trim: true, default: "" },
          address: { type: String, trim: true, default: "" },
          emergencyContact: { type: String, trim: true, default: "" },
        },
      },
      medicalHistory: {
        veterinaryVisits: [
          {
            visitDate: { type: String, trim: true, default: "" },
            veterinarianName: { type: String, trim: true, default: "" },
            clinic: { type: String, trim: true, default: "" },
            interventionType: { type: String, trim: true, default: "" },
            reason: { type: String, trim: true, default: "" },
            diagnosis: { type: String, trim: true, default: "" },
            medicinesNeeded: { type: Boolean, default: false },
            medicinesNotes: { type: String, trim: true, default: "" },
            surgicalIntervention: { type: Boolean, default: false },
            notes: { type: String, trim: true, default: "" },
            recordedByRole: { type: String, trim: true, default: "" },
            recordedByName: { type: String, trim: true, default: "" },
            attachments: [{ type: String, trim: true }],
          },
        ],
        illnessesConditions: {
          chronicDiseases: [{ type: String, trim: true }],
          allergies: [{ type: String, trim: true }],
          previousSurgeries: [{ type: String, trim: true }],
          disabilities: [{ type: String, trim: true }],
          specialConditions: [{ type: String, trim: true }],
        },
        medications: [
          {
            name: { type: String, trim: true, default: "" },
            dosage: { type: String, trim: true, default: "" },
            frequency: { type: String, trim: true, default: "" },
            startDate: { type: String, trim: true, default: "" },
            endDate: { type: String, trim: true, default: "" },
            prescriptionUpload: { type: String, trim: true, default: "" },
          },
        ],
      },
      vaccinations: [
        {
          vaccineName: { type: String, trim: true, default: "" },
          dateAdministered: { type: String, trim: true, default: "" },
          nextDoseDate: { type: String, trim: true, default: "" },
          veterinarian: { type: String, trim: true, default: "" },
          batchNumber: { type: String, trim: true, default: "" },
          certificateUpload: { type: String, trim: true, default: "" },
        },
      ],
      updatedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true, collection: 'pets' }
);

petSchema.pre('init', function normalizeLegacyPetLocation(data) {
  const legacyLocation = data.location || {};

  if (!data.country && legacyLocation.country) {
    data.country = legacyLocation.country;
  }
  if (!data.governorate) {
    data.governorate =
      legacyLocation.governorate || legacyLocation.city || data.city || '';
  }
  delete data.location;
  delete data.city;
});

petSchema.index({ owner: 1 }); // Fast lookup: all pets of a user
petSchema.index({ country: 1, governorate: 1 });

module.exports = mongoose.model('Pet', petSchema);

