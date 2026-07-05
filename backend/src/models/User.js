const mongoose = require("mongoose");
const {
  USER_PROFILE_TYPE_VALUES,
  DEFAULT_USER_PROFILE_TYPE,
} = require("../constants/profileTypes");
const {
  USER_STATUS,
  USER_STATUS_VALUES,
} = require("../constants/moderationStatuses");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "Name is required"],
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    profileType: {
      type: String,
      enum: USER_PROFILE_TYPE_VALUES,
      default: DEFAULT_USER_PROFILE_TYPE,
      required: [true, "Profile type is required"],
      index: true,
    },

    status: {
      type: String,
      enum: USER_STATUS_VALUES,
      default: USER_STATUS.ACTIVE,
      index: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },

    governorate: {
      type: String,
      trim: true,
    },
    // Legacy field kept for backward compatibility with older records/clients.
    city: {
      type: String,
      trim: true,
    },

    country: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      default: "",
      maxlength: 240,
    },

    avatar: {
      type: String,
      default: null,
    },

    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

