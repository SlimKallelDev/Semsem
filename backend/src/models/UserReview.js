const mongoose = require("mongoose");

const userReviewSchema = new mongoose.Schema(
  {
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      required: [true, "Review text is required"],
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

userReviewSchema.index({ targetUser: 1, reviewer: 1 }, { unique: true });
userReviewSchema.index({ targetUser: 1, createdAt: -1 });

module.exports = mongoose.model("UserReview", userReviewSchema);
