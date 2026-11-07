const mongoose = require("mongoose");

const platformPolicySchema = new mongoose.Schema(
  {
    latestVersion: { type: String, default: "1.0.0", trim: true },
    minimumSupportedVersion: { type: String, default: "1.0.0", trim: true },
    updateMessage: {
      type: String,
      default: "A new version of Semsem is available.",
      trim: true,
    },
    storeUrl: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const appVersionPolicySchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    ios: { type: platformPolicySchema, default: () => ({}) },
    android: { type: platformPolicySchema, default: () => ({}) },
  },
  { timestamps: true, collection: "app_version_policies" }
);

module.exports = mongoose.model("AppVersionPolicy", appVersionPolicySchema);
