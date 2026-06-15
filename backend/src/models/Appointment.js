const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    pets: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Pet",
        },
      ],
      default: [],
    },
    otherPet: {
      type: String,
      trim: true,
      default: "",
      maxlength: 160,
    },
    requestedFor: {
      type: Date,
      default: null,
      index: true,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
    history: {
      type: [
        {
          action: {
            type: String,
            enum: ["created", "date_updated", "status_updated"],
            required: true,
          },
          actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          fromStatus: {
            type: String,
            default: "",
          },
          toStatus: {
            type: String,
            default: "",
          },
          fromRequestedFor: {
            type: Date,
            default: null,
          },
          toRequestedFor: {
            type: Date,
            default: null,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ requester: 1, provider: 1, status: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
