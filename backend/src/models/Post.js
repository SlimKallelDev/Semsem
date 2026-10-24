const mongoose = require("mongoose");
const { POST_TYPE_VALUES } = require("../constants/postTypes");
const {
  POST_STATUS,
  POST_STATUS_VALUES,
} = require("../constants/moderationStatuses");

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
      enum: POST_TYPE_VALUES,
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

    images: {
      type: [String],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length <= 5,
        message: "Post supports up to 5 images",
      },
    },

    petType: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
      default: null,
    },

    currency: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
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
        required: [true, "Country is required"],
        trim: true,
        index: true,
      },
    },

    status: {
      type: String,
      enum: POST_STATUS_VALUES,
      default: POST_STATUS.PUBLISHED,
      index: true,
    },

    likesCount: {
      type: Number,
      default: 0,
    },

    commentsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, collection: "posts" }
);

postSchema.pre("init", function normalizeLegacyPostFields(data) {
  if (data.petType === undefined && data.pet_type !== undefined) {
    data.petType = data.pet_type;
  }
  if (data.likesCount === undefined && data.likes_count !== undefined) {
    data.likesCount = data.likes_count;
  }
  if (data.commentsCount === undefined && data.comments_count !== undefined) {
    data.commentsCount = data.comments_count;
  }
  delete data.pet_type;
  delete data.likes_count;
  delete data.comments_count;
});

postSchema.index({ createdAt: -1 });
postSchema.index({ "location.country": 1, "location.governorate": 1 });

module.exports = mongoose.model("Post", postSchema);

