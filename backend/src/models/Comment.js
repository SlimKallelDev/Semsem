const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
    },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: -1 }); // fast comments per post, newest first

module.exports = mongoose.model('Comment', commentSchema);