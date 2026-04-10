const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["adoption", "lost", "found", "mating", "general"],
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    pet_type: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    location: {
      city: {
        type: String,
        trim: true,
        default: "",
      },
      country: {
        type: String,
        required: [true, "Country is required"],
        trim: true,
        index: true,
      },
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "archived"],
      default: "pending",
      index: true,
    },

    likes_count: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ "location.country": 1, "location.city": 1 });

module.exports = mongoose.model("Post", postSchema);