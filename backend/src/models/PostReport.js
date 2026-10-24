const mongoose = require("mongoose");

const POST_REPORT_REASONS = [
  "spam",
  "misleading",
  "inappropriate",
  "harassment",
  "other",
];

const postReportSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: POST_REPORT_REASONS,
      required: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed", "actioned"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

postReportSchema.index({ post: 1, reporter: 1 }, { unique: true });
postReportSchema.index({ status: 1, createdAt: -1 });

module.exports = {
  POST_REPORT_REASONS,
  PostReport: mongoose.model("PostReport", postReportSchema),
};
