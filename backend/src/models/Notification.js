const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      enum: ["like", "comment", "message", "system"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    resourceType: {
      type: String,
      enum: ["post", "conversation", "comment", "system"],
      default: "system",
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    data: {
      post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        default: null,
      },
      conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        default: null,
      },
      comment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: null,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
